"""RBAC 第四维 —— 资源范围（Scope）判定测试。

覆盖 apps.rbac.scopes 的解析规则：
  - 未认证 / 普通用户（customer）→ 空管辖，不覆盖任何分类。
  - 超管 / 运维（全局角色）→ scope='all'，覆盖所有分类。
  - 管理组组长/组员 → scope='group'，仅覆盖其管辖分类（含子树分类）。
"""
import pytest

from apps.rbac.constants import Role
from apps.rbac.scopes import (
    get_user_scope,
    is_global_scope,
)

pytestmark = pytest.mark.django_db


def _mk_user(username, password='Passw0rd!', is_superuser=False):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        username=username, email=f'{username}@test.local', password=password,
    )
    user.is_superuser = is_superuser
    user.save(update_fields=['is_superuser'])
    return user


def _assign_role(user, role):
    from apps.rbac.models import UserRole

    UserRole.objects.create(user=user, role=role)


def _make_category_tree():
    """构造 L2 分类 A（业务上绑定管理组）与其父级 A1（同属 A 树），以及无关分类 B。"""
    from apps.goods.models import Category

    a = Category.objects.create(name='A', level=1)
    a1 = Category.objects.create(name='A1', parent=a, level=2)
    b = Category.objects.create(name='B', level=1)
    return a, a1, b


def _join_group(user, managed_category):
    """
    将 user 加入管理组 G，并把 managed_category 归入该组管辖。
    组归属通过 Category.admin_group FK 落地，与生产数据模型一致。
    """
    from apps.goods.models import AdminGroup, AdminGroupMember

    group = AdminGroup.objects.create(name='G', slug='g-unique-1')
    managed_category.admin_group = group
    managed_category.save(update_fields=['admin_group'])
    AdminGroupMember.objects.create(
        user=user, group=group, role=AdminGroupMember.Role.LEADER,
    )
    return group


# ── 全局角色判定 ──

def test_global_scope_roles():
    sa = _mk_user('sa', is_superuser=True)
    ops = _mk_user('ops')
    _assign_role(ops, Role.OPS.value)

    assert is_global_scope(sa) is True
    assert is_global_scope(ops) is True
    assert get_user_scope(sa).scope == 'all'
    assert get_user_scope(ops).scope == 'all'


def test_customer_is_narrow_not_global():
    user = _mk_user('c')  # 无角色记录 → 回退 DEFAULT_ROLE=customer
    assert is_global_scope(user) is False
    scope = get_user_scope(user)
    assert scope.scope == 'group'
    assert scope.managed_category_ids == frozenset()
    assert scope.covers_category(1) is False


# ── 管理组/管辖分类解析 ──

def test_group_leader_scope_covers_only_its_categories():
    user = _mk_user('leader')
    _assign_role(user, Role.ADMIN_LEADER.value)

    a, a1, b = _make_category_tree()
    _join_group(user, a)

    scope = get_user_scope(user)
    assert scope.scope == 'group'
    assert scope.covers_category(a.id) is True
    assert scope.covers_category(a1.id) is True  # 子树继承
    assert scope.covers_category(b.id) is False  # 非管辖分类
    assert scope.covers_category(999999) is False


def test_unassigned_group_leader_has_empty_scope():
    user = _mk_user('leader2')
    _assign_role(user, Role.ADMIN_LEADER.value)
    scope = get_user_scope(user)
    assert scope.managed_category_ids == frozenset()
    assert scope.covers_category(1) is False


# ── 前端 scope 约定一致性（守护第四维命名不漂移）──

def test_scope_names_align_with_frontend():
    from apps.rbac.scopes import ScopeKind

    assert set(ScopeKind.__args__) == {'all', 'group', 'category', 'brand'}