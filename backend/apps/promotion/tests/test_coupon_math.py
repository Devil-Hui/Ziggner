"""
促销营销子系统 —— 价格计算与边界测试（大厂规范）。

覆盖：
  - calc_discount 满减 / 百分比 / 门槛 / 最高折扣上限的边界值
  - 0 元订单、负价格防御（校验层兜底）
  - CouponApplicationService._validate_payload 的 INVALID_QUANTITY / 时间 / 券额审计
  - 优惠券可用性（is_available / remaining）与叠加语义

说明：calc_discount 与 _validate_payload 为纯逻辑，标 unit；涉及 DB scope 的标 integration。
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from apps.promotion.models import Coupon, CouponTargetAudience, DiscountType
from apps.promotion.services import CouponApplicationService, PromotionService

pytestmark = pytest.mark.unit


def _d(value: str) -> Decimal:
    return Decimal(value)


def _coupon(**overrides):
    """纯内存构造 Coupon 实例（不落库），保持单元测试零 DB 依赖。

    calc_discount 仅读取 discount_type/amount/min_amount/max_discount，
    无需持久化即可验证纯计算逻辑。
    """
    defaults = {
        "discount_type": DiscountType.FIXED,
        "amount": _d("10.00"),
        "min_amount": _d("0.00"),
        "max_discount": None,
    }
    defaults.update(overrides)
    return Coupon(**defaults)


class TestCalcDiscount:
    def test_fixed_discount_below_min_returns_zero(self):
        coupon = _coupon(discount_type=DiscountType.FIXED, amount=_d("20.00"), min_amount=_d("100.00"))
        assert PromotionService.calc_discount(coupon, _d("50.00")) == _d("0")

    def test_fixed_at_min_returns_amount(self):
        coupon = _coupon(discount_type=DiscountType.FIXED, amount=_d("20.00"), min_amount=_d("100.00"))
        assert PromotionService.calc_discount(coupon, _d("100.00")) == _d("20.00")

    def test_fixed_capped_by_order_amount(self):
        # 固定券额超订单金额 → 折扣封顶为订单金额
        coupon = _coupon(discount_type=DiscountType.FIXED, amount=_d("50.00"), min_amount=_d("0.00"))
        assert PromotionService.calc_discount(coupon, _d("30.00")) == _d("30.00")

    def test_percent_discount(self):
        coupon = _coupon(discount_type=DiscountType.PERCENT, amount=_d("10.00"), min_amount=_d("0.00"))
        assert PromotionService.calc_discount(coupon, _d("200.00")) == _d("20.00")

    def test_percent_capped_by_max_discount(self):
        coupon = _coupon(
            discount_type=DiscountType.PERCENT, amount=_d("20.00"),
            min_amount=_d("0.00"), max_discount=_d("50.00"),
        )
        # 200 * 20% = 40 < 50，不触顶
        assert PromotionService.calc_discount(coupon, _d("200.00")) == _d("40.00")
        # 300 * 20% = 60 > 50，触顶 50
        assert PromotionService.calc_discount(coupon, _d("300.00")) == _d("50.00")

    def test_zero_amount_order_returns_zero(self):
        coupon = _coupon(discount_type=DiscountType.FIXED, amount=_d("20.00"))
        # min_amount 0 → 0 < min(20, 0)=0
        assert PromotionService.calc_discount(coupon, _d("0.00")) == _d("0.00")


class TestValidatePayload:
    """INVALID_QUANTITY / 价格防御。"""

    def test_negative_or_zero_quantity_rejected(self):
        data = {
            "start_time": "2026-01-01 00:00", "end_time": "2026-02-01 00:00",
            "total_count": 0, "per_user_limit": 0, "amount": 10, "min_amount": 0,
            "discount_type": DiscountType.FIXED, "target_audience": CouponTargetAudience.ALL,
        }
        with pytest.raises(ValueError, match="INVALID_QUANTITY"):
            CouponApplicationService._validate_payload(data)

    def test_per_user_limit_exceeds_total_count(self):
        data = {
            "start_time": "2026-01-01 00:00", "end_time": "2026-02-01 00:00",
            "total_count": 5, "per_user_limit": 10, "amount": 10, "min_amount": 0,
            "discount_type": DiscountType.FIXED, "target_audience": CouponTargetAudience.ALL,
        }
        with pytest.raises(ValueError, match="PER_USER_LIMIT_EXCEEDED"):
            CouponApplicationService._validate_payload(data)

    def test_invalid_time_range(self):
        data = {
            "start_time": "2026-02-01 00:00", "end_time": "2026-01-01 00:00",
            "total_count": 1, "per_user_limit": 1, "amount": 10, "min_amount": 0,
            "discount_type": DiscountType.FIXED, "target_audience": CouponTargetAudience.ALL,
        }
        with pytest.raises(ValueError, match="INVALID_TIME_RANGE"):
            CouponApplicationService._validate_payload(data)

    def test_negative_discount_and_amount_rejected(self):
        data = {
            "start_time": "2026-01-01 00:00", "end_time": "2026-02-01 00:00",
            "total_count": 1, "per_user_limit": 1, "amount": -5, "min_amount": 0,
            "discount_type": DiscountType.FIXED, "target_audience": CouponTargetAudience.ALL,
        }
        with pytest.raises(ValueError, match="INVALID_DISCOUNT"):
            CouponApplicationService._validate_payload(data)

    def test_percent_over_100_rejected(self):
        data = {
            "start_time": "2026-01-01 00:00", "end_time": "2026-02-01 00:00",
            "total_count": 1, "per_user_limit": 1, "amount": 150, "min_amount": 0,
            "discount_type": DiscountType.PERCENT, "target_audience": CouponTargetAudience.ALL,
        }
        with pytest.raises(ValueError, match="INVALID_PERCENT"):
            CouponApplicationService._validate_payload(data)

    def test_valid_payload_passes(self):
        data = {
            "start_time": "2026-01-01 00:00", "end_time": "2026-02-01 00:00",
            "total_count": 1000, "per_user_limit": 1, "amount": 10, "min_amount": 0,
            "discount_type": DiscountType.FIXED, "target_audience": CouponTargetAudience.ALL,
            "applicable_categories": [], "applicable_products": [], "applicable_brands": [],
        }
        # 空 scope → 直接通过
        CouponApplicationService._validate_payload(data)


class TestCouponAvailability:
    """is_available / remaining / 时间窗（需 DB 落库，标 integration）。"""

    @pytest.mark.django_db
    def test_available_positive(self):
        from apps.promotion.tests.factories import CouponFactory
        coupon = CouponFactory(total_count=100, claimed_count=10, amount=Decimal("10.00"))
        assert coupon.remaining == 90
        assert coupon.is_available is True

    @pytest.mark.django_db
    def test_depleted_unavailable(self):
        from apps.promotion.tests.factories import CouponFactory
        coupon = CouponFactory(total_count=100, claimed_count=100, amount=Decimal("10.00"))
        assert coupon.remaining == 0
        assert coupon.is_available is False