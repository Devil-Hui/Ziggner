"""
订单状态机流转测试（交易履约子系统核心）。

覆盖 Order 全跃迁：pay → ship → deliver → complete；cancel；AfterSale approve/reject；
以及非法跃迁抛 ValueError。
"""
from __future__ import annotations

from django.test import TestCase

from apps.order.models import Order, OrderItem, OrderStatus
from apps.order.tests.factories import OrderFactory

import pytest

pytestmark = pytest.mark.unit


class OrderStateMachineTest(TestCase):
    """Order 状态机全跃迁 + 非法跃迁拦截。"""

    def setUp(self):
        self.order = OrderFactory(status=OrderStatus.PENDING_PAYMENT)

    # ── 正向跃迁 ──

    def test_pay_pending_to_paid(self):
        self.order.pay("mock", "PAY-123")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PAID)
        self.assertIsNotNone(self.order.paid_at)

    def test_ship_paid_to_shipped(self):
        self.order.pay("mock")
        self.order.ship("SF1234567890")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.SHIPPED)
        self.assertEqual(self.order.tracking_no, "SF1234567890")

    def test_deliver_to_completed(self):
        self.order.pay("mock")
        self.order.ship("SF1234567890")
        self.order.deliver()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.DELIVERED)
        self.order.complete()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.COMPLETED)

    def test_cancel_pending_restores_stock(self):
        from apps.goods.tests.factories import SKUFactory
        sku = SKUFactory(stock=10)
        item = OrderItem.objects.create(
            order=self.order, sku=sku, spu_name="x", sku_code=sku.sku_code,
            price=sku.price, quantity=2, subtotal=sku.price * 2,
        )
        # 模拟下单时已扣 2 件（真实下单走 checkout 服务扣库，此处直接构造已扣态）
        sku.stock = 8
        sku.save(update_fields=["stock"])
        self.order.cancel("no reason")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.CANCELLED)
        # 库存回滚：8 + 2 = 10
        sku.refresh_from_db()
        self.assertEqual(sku.stock, 10)

    # ── 非法跃迁 ──

    def test_ship_without_pay_raises(self):
        with self.assertRaises(ValueError):
            self.order.ship("SF")

    def test_pay_twice_raises(self):
        self.order.pay("mock")
        with self.assertRaises(ValueError):
            self.order.pay("mock")

    def test_cancel_paid_order_raises(self):
        self.order.pay("mock")
        with self.assertRaises(ValueError):
            self.order.cancel()

    def test_complete_without_deliver_raises(self):
        self.order.pay("mock")
        self.order.ship("SF")
        # deliver 未调 → complete 失败
        with self.assertRaises(ValueError):
            self.order.complete()


class AfterSaleStateMachineTest(TestCase):
    def setUp(self):
        self.order = OrderFactory(status=OrderStatus.PAID)
        self.order.ship("SF")
        self.order.deliver()

    def test_after_sale_approve_reject(self):
        from apps.order.models import AfterSale
        sale = AfterSale.objects.create(
            order=self.order, type="refund", reason="bad", amount=10,
        )
        sale.approve()
        sale.refresh_from_db()
        self.assertEqual(sale.status, "approved")
        sale2 = AfterSale.objects.create(
            order=self.order, type="refund", reason="x", amount=5,
        )
        sale2.reject()
        sale2.refresh_from_db()
        self.assertEqual(sale2.status, "rejected")
