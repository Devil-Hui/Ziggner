"""
交易履约子系统测试数据工厂：cart / order / payment。
"""
from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from apps.cart.models import Cart, CartItem
from apps.goods.tests.factories import SKUFactory
from apps.order.models import Order, OrderItem
from apps.users.tests.factories import UserFactory


class CartFactory(DjangoModelFactory):
    class Meta:
        model = Cart

    user = factory.SubFactory(UserFactory)


class CartItemFactory(DjangoModelFactory):
    class Meta:
        model = CartItem

    cart = factory.SubFactory(CartFactory)
    sku = factory.SubFactory(SKUFactory)
    quantity = 1
    selected = True


class OrderFactory(DjangoModelFactory):
    class Meta:
        model = Order

    user = factory.SubFactory(UserFactory)
    total_amount = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
    actual_amount = factory.SelfAttribute("total_amount")
    status = "pending_payment"
    payment_status = "unpaid"
    payment_method = "mock"
    shipping_name = factory.Faker("name")
    shipping_phone = "13800138000"
    shipping_address = factory.LazyFunction(lambda: {"region": "CN", "line": "addr"})
    currency = "USD"


class OrderItemFactory(DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory)
    sku = factory.SubFactory(SKUFactory)
    spu_name = factory.Sequence(lambda n: "OrderItem_SPU_%03d" % n)
    sku_code = factory.Sequence(lambda n: "OI_SKU_%06d" % n)
    price = factory.Faker("pydecimal", left_digits=3, right_digits=2, positive=True)
    quantity = 1
    subtotal = factory.SelfAttribute("price")
