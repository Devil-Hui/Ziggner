"""
Admin 权限系统 — 工具函数 + DRF 权限类。

权限层级：
  is_superuser (超管) → 所有权限
  is_group_leader (组长) → 管理本组 SPU 审核 + 本组数据
  is_group_member (组员) → 管理本组 SPU CRUD
  is_staff_or_above → 以上任一
"""

from rest_framework.permissions import BasePermission


# ==================== 工具函数 ====================

def is_superuser(user) -> bool:
    return user.is_authenticated and user.is_superuser


def is_group_leader(user) -> bool:
    if not user.is_authenticated:
        return False
    return user.admin_group_memberships.filter(
        role='leader', status=1
    ).exists()


def is_group_member(user) -> bool:
    if not user.is_authenticated:
        return False
    return user.admin_group_memberships.filter(status=1).exists()


def is_staff_or_above(user) -> bool:
    return is_superuser(user) or is_group_leader(user) or is_group_member(user)


def get_user_admin_group(user):
    """返回用户所属 AdminGroup，如果不在任何组返回 None"""
    if not user.is_authenticated:
        return None
    from apps.goods.models import AdminGroupMember
    membership = AdminGroupMember.objects.filter(
        user=user, status=1
    ).select_related('group').first()
    return membership.group if membership else None


def get_user_admin_groups(user) -> list:
    """返回用户活跃的所有管理组列表。

    支持未来多组场景。超管返回空列表（超管不受组隔离限制）。
    """
    if not user or not user.is_authenticated:
        return []
    from apps.goods.models import AdminGroupMember
    member_rels = AdminGroupMember.objects.filter(
        user=user, status=AdminGroupMember.Status.ACTIVE,
        group__is_active=True
    ).select_related('group')
    return [m.group for m in member_rels]


def get_group_managed_category_ids(user):
    """
    通过 AdminGroup(s) → Category(level=1 或 level=2) → 递归获取所有子分类 ID。
    支持多组：遍历用户所在的所有活跃管理组。
    返回 set of category IDs。
    """
    groups = get_user_admin_groups(user)
    if not groups:
        return set()
    from apps.goods.models import Category
    category_ids = set()
    for group in groups:
        # 支持 level=1 和 level=2 分类关联 admin_group
        managed_categories = Category.objects.filter(
            admin_group=group, level__in=[1, 2], is_active=True
        )
        for cat in managed_categories:
            category_ids.add(cat.id)
            # 递归获取所有子分类
            descendants = _get_descendant_ids(cat)
            category_ids.update(descendants)
    return category_ids


def _get_descendant_ids(category) -> set:
    from apps.goods.models import Category
    ids = set()
    children = Category.objects.filter(parent=category, is_active=True)
    for child in children:
        ids.add(child.id)
        ids.update(_get_descendant_ids(child))
    return ids


def can_operate_spu(user, spu) -> bool:
    """检查用户是否可以操作指定 SPU"""
    if is_superuser(user):
        return True
    managed_ids = get_group_managed_category_ids(user)
    return spu.category_id in managed_ids


def can_audit_spu(user, spu) -> bool:
    """检查用户是否可以审核指定 SPU（组长 + 在管理范围内）"""
    if is_superuser(user):
        return True
    if not is_group_leader(user):
        return False
    return can_operate_spu(user, spu)


# ==================== DRF 权限类 ====================

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return is_superuser(request.user)


class IsGroupLeader(BasePermission):
    def has_permission(self, request, view):
        return is_superuser(request.user) or is_group_leader(request.user)


class IsStaffOrAbove(BasePermission):
    def has_permission(self, request, view):
        return is_staff_or_above(request.user)


class CanOperateSPU(BasePermission):
    """对象级权限：检查用户是否可操作目标 SPU"""
    def has_object_permission(self, request, view, obj):
        return can_operate_spu(request.user, obj)


class CanAuditSPU(BasePermission):
    """对象级权限：检查用户是否可审核目标 SPU"""
    def has_object_permission(self, request, view, obj):
        return can_audit_spu(request.user, obj)