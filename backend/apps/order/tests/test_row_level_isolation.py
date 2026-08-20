"""
用户与权限子系统 —— 订单数据行级隔离测试（大厂规范重点）。

对应需求：
  - 「测试数据行级隔离（如组长无法查看跨组订单）」
  - 超管/运维可视全量；组长仅本组管辖类目的订单；组员/无组 → none()

覆盖 OrderAdminAccessPolicy.scope_orders 的查询语义（数据库级隔离，非仅 UI 隐藏）。
"""
from __future__ import annotations

import pytest

from apps.rbac.constants import Role
from apps.users.tests.factories import UserFactory
from apps.goods.tests.factories import (
    AdminGroupFactory, AdminGroupMemberFactory, CategoryFactory, SKUFactory, SPUFactory,
)
from apps.order.models import OrderItem, OrderStatus
from apps.order.policies import OrderAdminAccessPolicy
from apps.order.tests.factories import OrderFactory, CartFactory, CartItemFactory

pytestmark = [pytest.mark.integration]


@pytest.fixture
def managed_tree(db):
    """构造：组 A 管辖 catA，组 B 管辖 catB；SKU 各归属一类目。"""
    from apps.goods.models import AdminGroup, AdminGroupMember, Category
    g_a = AdminGroupFactory()
    g_b = AdminGroupFactory()

    cat_a = CategoryFactory(level=1, admin_group=g_a)
    cat_b = CategoryFactory(level=1, admin_group=g_b)

    spu_a = SPUFactory(category=cat_a)
    spu_b = SPUFactory(category=cat_b)
    sku_a = SKUFactory(spu=spu_a, stock=10)
    sku_b = SKUFactory(spu=spu_b, stock=10)

    leader_a = UserFactory()
    leader_b = UserFactory()
    AdminGroupMemberFactory(user=leader_a, group=g_a, role=AdminGroupMember.Role.LEADER, status=AdminGroupMember.Status.ACTIVE)
    AdminGroupMemberFactory(user=leader_b, group=g_b, role=AdminGroupMember.Role.LEADER, status=AdminGroupMember.Status.ACTIVE)
    return {
        "g_a": g_a, "g_b": g_b, "cat_a": cat_a, "cat_b": cat_b,
        "spu_a": spu_a, "spu_b": spu_b, "sku_a": sku_a, "sku_b": sku_b,
        "leader_a": leader_a, "leader_b": leader_b,
    }


def _order_with_items(user, sku, qty=1):
    order = OrderFactory(user=user, status=OrderStatus.PAID)
    OrderItem.objects.create(
        order=order, sku=sku, spu_name="x", sku_code=sku.sku_code,
        price=sku.price, quantity=qty, subtotal=sku.price * qty,
    )
    return order


@pytest.mark.django_db(transaction=True)
def test_leader_a_only_sees_own_group_orders(managed_tree):
    buyer = UserFactory()
    order_a = _order_with_items(buyer, managed_tree["sku_a"])  # catA
    order_b = _order_with_items(buyer, managed_tree["sku_b"])  # catB

    visible = list(OrderAdminAccessPolicy.scope_orders(
        __import__("apps.order.models", fromlist=["Order"]).Order.objects.all(),
        managed_tree["leader_a"],
    ).values_list("id", flat=True))
    assert order_a.pk in visible
    assert order_b.pk not in visible  # 跨组订单不可见


@pytest.mark.django_db(transaction=True)
def test_superadmin_sees_all(managed_tree):
    buyer = UserFactory()
    order_a = _order_with_items(buyer, managed_tree["sku_a"])
    order_b = _order_with_items(buyer, managed_tree["sku_b"])
    superadmin = UserFactory(is_superuser=True)
    visible = list(OrderAdminAccessPolicy.scope_orders(
        __import__("apps.order.models", fromlist=["Order"]).Order.objects.all(),
        superadmin,
    ).values_list("id", flat=True))
    assert order_a.pk in visible
    assert order_b.pk in visible


@pytest.mark.django_db(transaction=True)
def test_ops_sees_all(managed_tree):
    buyer = UserFactory()
    order_b = _order_with_items(buyer, managed_tree["sku_b"])
    ops = UserFactory()
    from apps.rbac.models import UserRole
    UserRole.objects.create(user=ops, role=Role.OPS.value)
    visible = list(OrderAdminAccessPolicy.scope_orders(
        __import__("apps.order.models", fromlist=["Order"]).Order.objects.all(),
        ops,
    ).values_list("id", flat=True))
    assert order_b.pk in visible


@pytest.mark.django_db(transaction=True)
def test_member_with_no_group_sees_none(managed_tree):
    buyer = UserFactory()
    _order_with_items(buyer, managed_tree["sku_a"])
    plain_member = UserFactory()
    from apps.rbac.models import UserRole
    UserRole.objects.create(user=plain_member, role=Role.ADMIN_MEMBER.value)
    qs = __import__("apps.order.models", fromlist=["Order"]).Order.objects.all()
    assert list(OrderAdminAccessPolicy.scope_orders(qs, plain_member).values_list("id", flat=True)) == []