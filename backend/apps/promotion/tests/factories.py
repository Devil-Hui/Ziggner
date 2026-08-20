"""
促销营销子系统测试数据工厂：Coupon / UserCoupon / 适用范围等。
"""
from __future__ import annotations

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.promotion.models import Coupon, CouponScope, DiscountType, UserCoupon
from apps.users.tests.factories import UserFactory


def _future_dates():
    now = timezone.now()
    return now - timezone.timedelta(days=1), now + timezone.timedelta(days=30)


class CouponFactory(DjangoModelFactory):
    class Meta:
        model = Coupon
        django_get_or_create = ("code",)

    code = factory.Sequence(lambda n: "CP%08d" % n)
    name = factory.Sequence(lambda n: "Coupon_%03d" % n)
    discount_type = DiscountType.FIXED
    amount = factory.LazyFunction(lambda: __import__("decimal").Decimal("10.00"))
    min_amount = factory.LazyFunction(lambda: __import__("decimal").Decimal("0.00"))
    max_discount = None
    stackable = False
    target_audience = "all"
    per_user_limit = 1
    total_count = 100
    claimed_count = 0
    used_count = 0

    @factory.lazy_attribute
    def start_time(self):
        now = timezone.now()
        return now - timezone.timedelta(days=1)

    @factory.lazy_attribute
    def end_time(self):
        now = timezone.now()
        return now + timezone.timedelta(days=30)

    is_active = True


class UserCouponFactory(DjangoModelFactory):
    class Meta:
        model = UserCoupon

    user = factory.SubFactory(UserFactory)
    coupon = factory.SubFactory(CouponFactory)
    status = UserCoupon.Status.AVAILABLE
    used_at = None
    # used_order_no 为 NOT NULL + default='' 字段，用空串而非 None
    used_order_no = ''

    @factory.lazy_attribute
    def claimed_at(self):
        return timezone.now()


class CouponScopeFactory(DjangoModelFactory):
    class Meta:
        model = CouponScope

    coupon = factory.SubFactory(CouponFactory)
    scope_type = CouponScope.ScopeType.SPU
    target_id = factory.Sequence(lambda n: n + 1)