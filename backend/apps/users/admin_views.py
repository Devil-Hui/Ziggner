"""
管理员用户管理端点（独立命名空间 /api/admin/users/）。

职责边界（大厂规范）：
- 普通用户自助面 /api/users/ 只操作「自己」（注册、me、profile、改密）。
- 本模块是「操作他人」的管理面，仅超管/运维可达，且**只用 account_no 指认目标用户**，
  绝不收发内部自增 id，也不以 email/username 等敏感 PII 作为查询键。

端点：
- POST   /api/admin/users/                  超管创建/开通管理员候选账号（返回 account_no）
- GET    /api/admin/users/?account_no=&role=&page=&size=   按 account_no/role 检索（不暴露内部 id）
- PUT    /api/admin/users/<account_no>/roles 指派可指派角色（superadmin/ops），旋转安全戳
"""
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from utils.api_base_view import BaseApiView
from apps.rbac.constants import (
    Role,
    DEFAULT_ROLE,
    DERIVED_ROLES,
    ASSIGNABLE_ROLES,
    MAX_PAGE_SIZE,
)
from apps.rbac.models import UserRole
from apps.rbac.permissions import HasPerm, IsSuperAdmin
from apps.rbac.services import invalidate_user
from apps.users.services import UserService
from apps.users.account import ensure_account_no, resolve_user_by_account_no
from apps.users.tokens import rotate_user_stamp


def _bad_request(message: str, **extra):
    payload = {'detail': message}
    if extra:
        payload.update(extra)
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


class AdminUserCreateView(BaseApiView):
    """超管创建/开通管理员候选账号。

    与 /api/users/register/（普通用户自助注册）彻底分离：
    这里由超管主动开通账号并立即拿到 account_no，可直接「发给对方」再拉入管理组。
    """

    permission_classes = [IsSuperAdmin]

    def post(self, request):
        data = request.data
        username = (data.get('username') or '').strip()
        password = data.get('password') or ''
        email = (data.get('email') or '').strip()
        country_code = data.get('country_code') or None
        phone = (data.get('phone') or '').strip() or None

        if not username or not password:
            return _bad_request('username 与 password 必填')

        try:
            user = UserService.create_user(
                username=username,
                password=password,
                email=email,
                country_code=country_code,
                phone=phone,
            )
        except ValueError as e:
            key = str(e)
            if key == 'USERNAME_EXISTS':
                return _bad_request('用户名已存在', code='USERNAME_EXISTS')
            if key == 'EMAIL_EXISTS':
                return _bad_request('邮箱已存在', code='EMAIL_EXISTS')
            if key == 'PHONE_EXISTS':
                return _bad_request('手机号已存在', code='PHONE_EXISTS')
            raise

        account_no = ensure_account_no(user)
        return Response(
            {
                'account_no': account_no,
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserListView(BaseApiView):
    """按 account_no / role 检索用户。仅超管/运维可见，返回 account_no 不返回内部 id。"""

    permission_classes = [HasPerm('rbac.user.read')]

    def get(self, request):
        from django.contrib.auth.models import User

        qs = User.objects.all().order_by('id')

        account_no = request.query_params.get('account_no')
        if account_no:
            qs = qs.filter(profile__account_no=account_no)

        role = request.query_params.get('role')
        if role:
            if role == DEFAULT_ROLE.value:
                qs = qs.filter(rbac_roles__isnull=True)
            else:
                qs = qs.filter(rbac_roles__role=role)
            qs = qs.distinct()

        total = qs.count()
        page = max(1, int(request.query_params.get('page') or 1))
        size = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('size') or 20)))
        rows = qs.prefetch_related('rbac_roles', 'profile')[
            (page - 1) * size: page * size
        ]

        return Response({
            'count': total,
            'page': page,
            'size': size,
            'results': [
                {
                    'account_no': getattr(u.profile, 'account_no', '') or ensure_account_no(u),
                    'username': u.username,
                    'email': u.email,
                    'is_active': u.is_active,
                    'roles': sorted(r.role for r in u.rbac_roles.all())
                             or [DEFAULT_ROLE.value],
                }
                for u in rows
            ],
        })


class AdminUserRoleView(BaseApiView):
    """按 account_no 指派可指派角色（superadmin/ops）。派生角色不可在此维护。"""

    permission_classes = [HasPerm('rbac.user.assign')]

    def put(self, request, account_no: str):
        roles = request.data.get('roles')
        if not isinstance(roles, list):
            return _bad_request('roles 必须是数组')

        wanted = set(roles)
        derived = sorted(wanted & DERIVED_ROLES)
        if derived:
            return _bad_request(
                '组长/组员角色由审核组成员身份自动派生，请在管理组页面调整',
                derived=derived,
            )
        unknown = sorted(wanted - ASSIGNABLE_ROLES - {DEFAULT_ROLE.value})
        if unknown:
            return _bad_request('存在不可指派的角色', unknown=unknown)

        user = resolve_user_by_account_no(account_no)
        user_id = user.pk

        wanted.discard(DEFAULT_ROLE.value)

        with transaction.atomic():
            current = set(
                UserRole.objects.filter(
                    user_id=user_id, role__in=list(ASSIGNABLE_ROLES)
                ).values_list('role', flat=True)
            )
            UserRole.objects.filter(
                user_id=user_id, role__in=list(current - wanted)
            ).delete()
            for role in sorted(wanted - current):
                UserRole.objects.get_or_create(
                    user_id=user_id,
                    role=role,
                    defaults={'granted_by': request.user},
                )

        invalidate_user(user_id)
        # 旋转安全戳：角色变更使该用户所有旧会话立即失效，必须重新登录以获取新角色
        rotate_user_stamp(user_id)
        roles_now = sorted(
            UserRole.objects.filter(user_id=user_id).values_list('role', flat=True)
        )
        return Response({
            'account_no': ensure_account_no(user),
            'roles': roles_now or [DEFAULT_ROLE.value],
        })
