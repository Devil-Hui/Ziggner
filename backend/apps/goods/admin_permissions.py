"""
商品域的业务权限工具 —— 角色判断已迁移至 apps.rbac。

本模块只保留"哪批商品归哪个组审"的业务规则：
  get_user_admin_group(s) / get_group_managed_category_ids /
  can_operate_spu / can_audit_spu。

角色/权限判断请直接使用 apps.rbac.services.has_role / has_perm，
视图级权限请用 apps.rbac.permissions.HasPerm('<权限点>')。

角色数据由 apps.goods.signals.sync_admin_group_role 从 AdminGroupMember 单向派生，
两处不会漂移。

性能优化（2C4G）：
- _get_descendant_ids 改为全量预加载 + 内存遍历，消除递归 N+1 查询
- get_group_managed_category_ids 支持 request 级缓存，同一请求内复用
"""

import threading

from apps.rbac.constants import Role
from apps.rbac.services import has_role

# 请求级缓存：同一请求内多次调用 get_group_managed_category_ids 只查一次 DB
_tls = threading.local()


def _clear_request_cache():
    """清理当前线程/请求的缓存（请求结束时调用）"""
    _tls.__dict__.pop('_managed_ids_cache', None)


def _get_cached_managed_ids(user_id: int) -> set | None:
    cache = getattr(_tls, '_managed_ids_cache', None)
    if cache is None:
        return None
    return cache.get(user_id)


def _set_cached_managed_ids(user_id: int, ids: set):
    if not hasattr(_tls, '_managed_ids_cache'):
        _tls._managed_ids_cache = {}
    _tls._managed_ids_cache[user_id] = ids


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

    性能优化：请求级缓存 + 全量预加载分类树（消除递归 N+1 查询）。
    """
    if not user or not user.is_authenticated:
        return set()

    # 请求级缓存：同一请求内多次调用只查一次 DB
    cached = _get_cached_managed_ids(user.id)
    if cached is not None:
        return cached

    groups = get_user_admin_groups(user)
    if not groups:
        _set_cached_managed_ids(user.id, set())
        return set()

    from apps.goods.models import Category

    # 获取用户直接管理的分类
    managed_categories = Category.objects.filter(
        admin_group__in=groups, level__in=[1, 2], is_active=True
    )
    category_ids = set(managed_categories.values_list('id', flat=True))

    if not category_ids:
        _set_cached_managed_ids(user.id, set())
        return set()

    # 全量预加载分类树，构建 parent→children 映射
    all_cats = Category.objects.filter(is_active=True).values_list('id', 'parent_id')
    children_map: dict[int, list[int]] = {}
    for cat_id, parent_id in all_cats:
        children_map.setdefault(parent_id, []).append(cat_id)

    # 从每个直接管理的分类出发，BFS 收集所有后代
    result = set(category_ids)
    queue = list(category_ids)
    while queue:
        parent_id = queue.pop()
        for child_id in children_map.get(parent_id, []):
            if child_id not in result:
                result.add(child_id)
                queue.append(child_id)

    _set_cached_managed_ids(user.id, result)
    return result


def can_operate_spu(user, spu) -> bool:
    """检查用户是否可以操作指定 SPU"""
    if has_role(user, Role.SUPERADMIN.value):
        return True
    managed_ids = get_group_managed_category_ids(user)
    return spu.category_id in managed_ids


def can_audit_spu(user, spu) -> bool:
    """检查用户是否可以审核指定 SPU（组长 + 在管理范围内）"""
    if has_role(user, Role.SUPERADMIN.value):
        return True
    if not has_role(user, Role.ADMIN_LEADER.value):
        return False
    return can_operate_spu(user, spu)
