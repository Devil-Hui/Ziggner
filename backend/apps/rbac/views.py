"""
权限核查 API —— 服务于运维角色"检查所有用户不同权限"的诉求。

  GET  /api/rbac/matrix             角色 × 权限点矩阵（ops 只读）
  PUT  /api/rbac/matrix             调整某角色的权限（仅 superadmin）
  GET  /api/rbac/users              用户及其角色（ops 只读）
  PUT  /api/rbac/users/<id>/roles   调整某用户角色（仅 superadmin）

本模块用 rbac 自己的 HasPerm 守卫，不写裸 is_superuser 判断。
"""
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from rest_framework.response import Response

from apps.rbac.constants import (
    ALL_PERM_CODES,
    DEFAULT_ROLE,
    PERMISSIONS,
    Role,
)
from apps.rbac.models import RolePermission, UserRole
from apps.rbac.permissions import HasPerm
from apps.rbac.services import get_role_perms, invalidate_all, invalidate_user
from utils.api_base_view import BaseApiView

#: 由 AdminGroupMember 派生，不可手工指派 —— 否则两处数据会打架
DERIVED_ROLES = frozenset({Role.ADMIN_LEADER.value, Role.ADMIN_MEMBER.value})

#: 可手工指派的角色。customer 是兜底默认值，不需要落行。
ASSIGNABLE_ROLES = frozenset({Role.SUPERADMIN.value, Role.OPS.value})

MAX_PAGE_SIZE = 100


def _bad_request(message: str, **extra):
    return Response({'detail': message, **extra}, status=400)


def _role_catalog() -> list[dict]:
    return [{'value': r.value, 'label': r.label} for r in Role]


def _permission_catalog() -> list[dict]:
    """按域分组的权限点清单，供前端渲染勾选矩阵。"""
    grouped: dict[str, list[dict]] = {}
    for perm in PERMISSIONS:
        grouped.setdefault(perm.domain, []).append(
            {'code': perm.code, 'label': perm.label}
        )
    return [
        {'domain': domain, 'permissions': perms}
        for domain, perms in grouped.items()
    ]


class RoleMatrixView(BaseApiView):
    """角色 × 权限点矩阵。运维只读，超管可改。"""

    permission_classes = [HasPerm('rbac.matrix.read')]

    def get_permissions(self):
        if self.request.method == 'PUT':
            return [HasPerm('rbac.matrix.write')()]
        return super().get_permissions()

    def get(self, request):
        grants = get_role_perms()
        stored = {
            code
            for codes in grants.values()
            for code in codes
        }
        return Response({
            'roles': _role_catalog(),
            'domains': _permission_catalog(),
            # superadmin 不在 grants 里：它在判定时短路放行，拥有全部权限
            'grants': {
                role: sorted(grants.get(role, ()))
                for role in (r.value for r in Role)
                if role != Role.SUPERADMIN.value
            },
            'superadmin_implicit': True,
            # 库里有、代码里已删除的权限点，判定时被忽略，此处显式暴露给运维
            'orphaned': sorted(stored - ALL_PERM_CODES),
        })

    def put(self, request):
        role = request.data.get('role')
        codes = request.data.get('perm_codes')

        if role not in {r.value for r in Role}:
            return _bad_request(f'未知角色: {role}')
        if role == Role.SUPERADMIN.value:
            return _bad_request('超级管理员拥有全部权限，无需也不可授权')
        if not isinstance(codes, list):
            return _bad_request('perm_codes 必须是数组')

        unknown = sorted(set(codes) - ALL_PERM_CODES)
        if unknown:
            return _bad_request('存在未注册的权限点', unknown=unknown)

        wanted = set(codes)
        with transaction.atomic():
            current = set(
                RolePermission.objects.filter(role=role).values_list(
                    'perm_code', flat=True
                )
            )
            RolePermission.objects.filter(
                role=role, perm_code__in=list(current - wanted)
            ).delete()
            RolePermission.objects.bulk_create([
                RolePermission(role=role, perm_code=code, granted_by=request.user)
                for code in sorted(wanted - current)
            ])

        invalidate_all()
        return Response({'role': role, 'perm_codes': sorted(wanted)})


class UserRoleListView(BaseApiView):
    """用户及其角色。运维核查入口。"""

    permission_classes = [HasPerm('rbac.user.read')]

    def get(self, request):
        qs = User.objects.all().order_by('id')

        role = request.query_params.get('role')
        if role:
            if role == DEFAULT_ROLE.value:
                # 默认角色不落行，用"没有任何角色记录"来表达
                qs = qs.filter(rbac_roles__isnull=True)
            else:
                qs = qs.filter(rbac_roles__role=role)
            qs = qs.distinct()

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )

        total = qs.count()
        page = max(1, int(request.query_params.get('page') or 1))
        size = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('size') or 20)))
        rows = qs.prefetch_related('rbac_roles')[(page - 1) * size: page * size]

        return Response({
            'count': total,
            'page': page,
            'size': size,
            'results': [
                {
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'is_active': u.is_active,
                    'is_superuser': u.is_superuser,
                    'roles': sorted(r.role for r in u.rbac_roles.all())
                             or [DEFAULT_ROLE.value],
                }
                for u in rows
            ],
        })


class UserRoleDetailView(BaseApiView):
    """调整某用户的可指派角色。派生角色不在此处维护。"""

    permission_classes = [HasPerm('rbac.user.assign')]

    def put(self, request, user_id: int):
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

        user = User.objects.filter(pk=user_id).first()
        if user is None:
            return Response({'detail': '用户不存在'}, status=404)

        # customer 是兜底默认值，不落行
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
        roles_now = sorted(
            UserRole.objects.filter(user_id=user_id).values_list('role', flat=True)
        )
        return Response({
            'id': user_id,
            'roles': roles_now or [DEFAULT_ROLE.value],
        })
