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
)
# DERIVED_ROLES / ASSIGNABLE_ROLES / MAX_PAGE_SIZE 定义在 rbac.views（单一出处），
# 不放在 constants，避免与「常量即真源」的约定冲突；此处从 views 引入。
from apps.rbac.views import ASSIGNABLE_ROLES, DERIVED_ROLES, MAX_PAGE_SIZE
from apps.rbac.models import UserRole
from apps.rbac.permissions import HasPerm, IsSuperAdmin
from apps.rbac.services import invalidate_user
from apps.users.services import UserService
from apps.users.account import ensure_account_no, resolve_user_by_account_no
from apps.users.tokens import rotate_user_stamp
from apps.users.serializers import AdminCreateSerializer
from apps.users.tasks import send_admin_welcome_email


def _bad_request(message: str, **extra):
    payload = {'detail': message}
    if extra:
        payload.update(extra)
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)


# 字段 → 错误码映射（AdminCreateSerializer 校验失败时统一映射）
_FIELD_CODE_MAP = {
    'username': 'USERNAME_INVALID',
    'password': 'PASSWORD_WEAK',
    'email': 'EMAIL_INVALID',
    'first_name': 'NAME_REQUIRED',
    'last_name': 'NAME_REQUIRED',
    'role': 'ROLE_INVALID',
    'country_code': 'PHONE_INVALID',
    'phone': 'PHONE_INVALID',
}


class AdminUserCreateView(BaseApiView):
    """超管创建/开通管理员候选账号。

    与 /api/users/register/（普通用户自助注册）彻底分离：
    这里由超管主动开通账号并立即拿到 account_no，可直接「发给对方」再拉入管理组。

    邮箱为必填且全局唯一（大小写不敏感）；创建时 email_verified 强制 false，
    仅欢迎邮件验证链接端点可置 true。
    """

    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = AdminCreateSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            for field, code in _FIELD_CODE_MAP.items():
                if field in errors:
                    msg = errors[field]
                    if isinstance(msg, list):
                        msg = msg[0]
                    return _bad_request(msg, code=code)
            # 兜底：首个错误字段
            first_key = next(iter(errors), None)
            fallback = errors.get(first_key) if first_key else '请求参数不合法'
            if isinstance(fallback, list):
                fallback = fallback[0]
            return _bad_request(fallback, code='INVALID')

        data = serializer.validated_data

        try:
            user = UserService.create_user(
                username=data['username'],
                password=data['password'],
                email=data.get('email') or '',
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                department=data.get('department', ''),
                is_active=data.get('is_active', True),
                country_code=data.get('country_code') or None,
                phone=(data.get('phone') or '').strip() or None,
                note=data.get('note', ''),
                locale=data.get('locale') or 'zh-CN',
                must_reset_password=data.get('must_reset_password', True),
                # email_verified 不在 data 中（创建时强制 false），不传入
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

        # 可选初始角色（superadmin / ops / admin_leader / admin_member）。
        # admin_leader / admin_member 仍可由管理组成员身份自动派生（见 goods/signals），
        # 此处也允许超管直接指派，便于一次性开通「商品管理员组长 / 管理员」账号。
        roles: list = []
        raw_role = data.get('role') or ''
        if raw_role:
            if raw_role in DERIVED_ROLES:
                return _bad_request('派生角色由管理组身份自动派生，创建时不可指派')
            if raw_role not in ASSIGNABLE_ROLES:
                return _bad_request('不可指派的角色', code='ROLE_INVALID')
            UserRole.objects.get_or_create(
                user_id=user.id,
                role=raw_role,
                defaults={'granted_by': request.user},
            )
            invalidate_user(user.id)
            roles = sorted(r.role for r in UserRole.objects.filter(user_id=user.id))

            # 管理角色须可进后台（is_staff=True）；superadmin 同时授予 Django 超管位。
            # 此前 create_user 不设 is_staff/is_superuser → 新开管理员（含超管）全部被
            # Admin SPA 路由守卫挡在 /admin/login（实测 tc_ops is_staff=false）。
            update_fields = []
            if not user.is_staff:
                user.is_staff = True
                update_fields.append('is_staff')
            if raw_role == Role.SUPERADMIN.value and not user.is_superuser:
                user.is_superuser = True
                update_fields.append('is_superuser')
            if update_fields:
                user.save(update_fields=update_fields)

        # 可选：初始管理组绑定（建号+授权一步到位）。
        # 仅超管可执行本端点；组绑定走与 Add Member 相同的 AdminGroupMember 模型，
        # 由 goods 信号自动派生 admin_leader / admin_member 角色并旋转安全戳。
        group_slug = (data.get('group_slug') or '').strip()
        group_role = (data.get('group_role') or '').strip()
        if group_slug:
            from apps.goods.models import AdminGroup, AdminGroupMember
            group = AdminGroup.objects.filter(slug=group_slug, is_active=True).first()
            if group is None:
                return _bad_request('指定的管理组不存在', code='GROUP_NOT_FOUND')
            if group_role not in (AdminGroupMember.Role.LEADER, AdminGroupMember.Role.MEMBER):
                return _bad_request('组内角色不合法（leader / member）', code='GROUP_ROLE_INVALID')
            _member, created = AdminGroupMember.objects.get_or_create(
                group=group,
                user=user,
                defaults={'role': group_role},
            )
            if not created and _member.status != AdminGroupMember.Status.ACTIVE:
                _member.status = AdminGroupMember.Status.ACTIVE
                _member.role = group_role
                _member.save(update_fields=['status', 'role'])
            # 同步派生角色到返回（信号为 post_save 异步重算，这里读库确认）
            roles = sorted(r.role for r in UserRole.objects.filter(user_id=user.id))

        # 仅当事务成功提交后，异步派发欢迎邮件（失败不影响建号）。
        # 邮件任务内部 try/except 仅记日志。
        transaction.on_commit(
            lambda: send_admin_welcome_email.delay(user.id)
        )

        return Response(
            {
                'account_no': account_no,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'roles': roles or [DEFAULT_ROLE.value],
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
