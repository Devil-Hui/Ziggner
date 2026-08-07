"""
DRF 权限类 —— 业务视图只应从这里取权限，不要再写裸 is_superuser 判断。

用法：
    from apps.rbac.permissions import HasPerm

    class SPUAuditView(BaseApiView):
        permission_classes = [HasPerm('goods.spu.audit')]
"""
from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.rbac.constants import Role, is_valid_perm
from apps.rbac.services import has_perm, has_role


def HasPerm(code: str):  # noqa: N802 —— 工厂函数，用法上等价于权限类
    """
    返回一个校验指定权限点的 DRF 权限类。

    DRF 会以无参方式实例化 permission_classes 中的每一项，
    所以参数化权限必须用工厂生成类，而不是带 __init__ 参数的类。

    code 非法时**在导入期**就抛错，把拼写错误挡在启动阶段而不是运行期。
    """
    if not is_valid_perm(code):
        raise ValueError(f'未注册的权限点: {code}；请先在 apps/rbac/constants.py 注册')

    class _HasPerm(BasePermission):
        perm_code = code
        message = '没有操作权限'

        def has_permission(self, request, view) -> bool:
            return has_perm(request.user, code)

        def has_object_permission(self, request, view, obj) -> bool:
            return has_perm(request.user, code)

    _HasPerm.__name__ = f'HasPerm_{code.replace(".", "_")}'
    _HasPerm.__qualname__ = _HasPerm.__name__
    return _HasPerm


class IsSuperAdmin(BasePermission):
    """仅超级管理员。用于角色分配、权限矩阵写入等最高危操作。"""

    message = '仅超级管理员可操作'

    def has_permission(self, request, view) -> bool:
        return has_role(request.user, Role.SUPERADMIN.value)


class IsOpsAuditor(BasePermission):
    """运维（只读核查）或超级管理员。"""

    message = '仅运维或超级管理员可查看'

    def has_permission(self, request, view) -> bool:
        user = request.user
        return has_role(user, Role.SUPERADMIN.value) or has_role(user, Role.OPS.value)
