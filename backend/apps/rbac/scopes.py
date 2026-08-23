"""
RBAC 第四维 —— 资源范围（Scope）统一抽象。

User → Role → Permission → Resource → Scope。
Scope 决定"有权限，但只对哪些数据生效"，对应前端
web/react/src/permissions/scope.ts 的 ResourceScope（all/group/category/brand）。

角色角色范围规则：
  - superadmin / ops（运维只读核查）→ scope='all'，对全部数据生效。
  - admin_leader / admin_member（全局组角色）→ scope='group'，
    通过 AdminGroup → Category 派生"可管理分类集合"，只对本组管辖类目生效。

本层只负责**解析并判定范围**，不负责具体 queryset 的形状。
各业务域（order/goods/customer_service…）的复杂查询在此基础上做行级过滤，
避免各自再判断角色归属，收敛为单一来源。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal

from apps.rbac.constants import Role
from apps.rbac.services import has_role

ScopeKind = Literal['all', 'group', 'category', 'brand']


@dataclass(frozen=True)
class UserScope:
    """某用户对某类资源的数据范围。"""

    scope: ScopeKind
    managed_category_ids: frozenset[int] = field(default_factory=frozenset)
    managed_brand_ids: frozenset[int] = field(default_factory=frozenset)

    @property
    def is_all(self) -> bool:
        return self.scope == 'all'

    def covers_category(self, category_id) -> bool:
        """某条数据（按分类归属）是否落在本用户范围内。"""
        if self.is_all:
            return True
        if self.scope in ('group', 'category'):
            # 空集合 = 未显式限定，保守起见视为不覆盖（最小权限）
            return self.managed_category_ids and category_id in self.managed_category_ids
        return False

    def covers_brand(self, brand_id) -> bool:
        if self.is_all:
            return True
        if self.scope in ('group', 'brand'):
            return self.managed_brand_ids and brand_id in self.managed_brand_ids
        return False


def is_global_scope(user) -> bool:
    """是否拥有全局数据范围（superadmin / ops）。"""
    return has_role(user, Role.SUPERADMIN.value) or has_role(user, Role.OPS.value)


def get_user_scope(user, *, category_field: str | None = None) -> UserScope:
    """解析用户对资源的范围。

    category_field 仅为向前兼容（resource 键），当前解析只依赖用户角色与管辖分类。
    """
    if not getattr(user, 'is_authenticated', False):
        return UserScope(scope='all')

    if is_global_scope(user):
        return UserScope(scope='all')

    from apps.goods.admin_permissions import get_group_managed_category_ids

    return UserScope(
        scope='group',
        managed_category_ids=frozenset(get_group_managed_category_ids(user)),
    )


def filter_by_managed_categories(queryset, user, *, lookup: str = 'category_id'):
    """按用户范围对 queryset 做行级过滤（all → 原样；group → category in 管辖集合）。

    lookup 为分类字段的关系查找（如 'category_id' 或 'sku__spu__category_id'，
    但跨表请优先在业务域内用子查询保证 NOT EXISTS 语义，见 order/policies.py）。
    """
    scope = get_user_scope(user)
    if scope.is_all:
        return queryset
    if not scope.managed_category_ids:
        return queryset.none()
    return queryset.filter(**{f'{lookup}__in': scope.managed_category_ids})