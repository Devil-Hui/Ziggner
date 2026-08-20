"""
促销营销子系统 —— 代言人/渠道优惠券（专属推广码 PromoCode）测试。

对应需求：全局券 / 类别专属券（CouponScope 限定适用商品）之外的第三类——
**代言人券**：一张基础券挂多个推广码（PromoCode），代言人各持一码，
用户凭码领券，UserCoupon.promo_code 记录渠道归属，核销后按码对账
（claim_count / paid_order_count / gmv）。

覆盖链路：
  - 凭码领券：归属正确、claim_count 递增、每期限领限制
  - 异常：无效码 / 停用码 / 券不可用 / 重复领取
  - 核销对账：consume_for_order 按码累计 paid_order_count 与 GMV（F 表达式原子）
  - 批量创建推广码：去重 / 冲突校验 / 自动生成
  - 引流看板聚合：unique_users / claim_count / gmv 排序
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from apps.order.tests.factories import OrderFactory
from apps.promotion.models import Coupon, PromoCode, UserCoupon
from apps.promotion.services import PromotionService, PromoCodeService
from apps.promotion.tests.factories import CouponFactory, PromoCodeFactory
from apps.users.tests.factories import UserFactory

pytestmark = [pytest.mark.integration]

# claim / consume 使用 select_for_update，必须真实事务
tx = pytest.mark.django_db(transaction=True)


class TestClaimViaPromoCode:
    """凭代言人推广码领券。"""

    @tx
    def test_claim_records_attribution(self):
        user = UserFactory()
        pc = PromoCodeFactory(name="代言人A")
        PromotionService.claim_via_promo_code(user, pc.code)

        uc = UserCoupon.objects.get(user=user, coupon=pc.coupon)
        assert uc.promo_code_id == pc.pk  # 渠道归属已记录
        assert uc.status == UserCoupon.Status.AVAILABLE
        pc.refresh_from_db()
        assert pc.claim_count == 1  # 领取数递增

    @tx
    def test_invalid_code_rejected(self):
        with pytest.raises(ValueError, match="PROMO_CODE_NOT_FOUND"):
            PromotionService.claim_via_promo_code(UserFactory(), "NO-SUCH-CODE")

    @tx
    def test_disabled_code_rejected(self):
        pc = PromoCodeFactory(is_active=False)
        with pytest.raises(ValueError, match="PROMO_CODE_NOT_FOUND"):
            PromotionService.claim_via_promo_code(UserFactory(), pc.code)

    @tx
    def test_unavailable_coupon_rejected(self):
        # 已领完（claimed_count == total_count）→ 不可用
        coupon = CouponFactory(total_count=10, claimed_count=10)
        pc = PromoCodeFactory(coupon=coupon)
        with pytest.raises(ValueError, match="COUPON_UNAVAILABLE"):
            PromotionService.claim_via_promo_code(UserFactory(), pc.code)

    @tx
    def test_per_user_limit_blocks_second_claim(self):
        user = UserFactory()
        coupon = CouponFactory(total_count=100, per_user_limit=1)
        pc = PromoCodeFactory(coupon=coupon)
        PromotionService.claim_via_promo_code(user, pc.code)
        with pytest.raises(ValueError, match="COUPON_LIMIT_REACHED"):
            PromotionService.claim_via_promo_code(user, pc.code)


class TestReconciliation:
    """核销后按推广码对账（paid_order_count / GMV）。"""

    @tx
    def test_consume_for_order_updates_promo_reconciliation(self):
        user = UserFactory()
        pc = PromoCodeFactory(name="代言人B")
        PromotionService.claim_via_promo_code(user, pc.code)
        uc = UserCoupon.objects.get(user=user, coupon=pc.coupon)

        order = OrderFactory(user=user, status="pending_payment", actual_amount=Decimal("88.00"))

        PromotionService.lock(user, uc.id, order.order_no)
        PromotionService.consume_for_order(order.order_no)

        pc.refresh_from_db()
        assert pc.paid_order_count == 1
        assert pc.gmv == Decimal("88.00")  # 按订单实付累计
        uc.refresh_from_db()
        assert uc.status == UserCoupon.Status.USED
        assert uc.used_order_no == order.order_no

    @tx
    def test_consume_without_promo_has_no_attribution(self):
        """普通领券（无推广码）核销 → 不影响任何 PromoCode 统计。"""
        user = UserFactory()
        coupon = CouponFactory(total_count=100)
        PromotionService.claim(user, coupon.code)
        uc = UserCoupon.objects.get(user=user, coupon=coupon)

        order = OrderFactory(user=user, status="pending_payment", actual_amount=Decimal("50.00"))
        PromotionService.lock(user, uc.id, order.order_no)
        PromotionService.consume_for_order(order.order_no)

        assert PromoCode.objects.filter(gmv__gt=0).count() == 0
        assert PromoCode.objects.filter(paid_order_count__gt=0).count() == 0


class TestPromoCodeService:
    """推广码批量创建与看板聚合。"""

    @tx
    def test_create_codes_batch(self):
        coupon = CouponFactory()
        creator = UserFactory()
        codes = PromoCodeService.create_codes(
            coupon.id, creator, codes=["AMB-01", "amb-02"], name="代言人C"
        )
        assert len(codes) == 2
        # 输入自动转大写、去空白
        saved = set(PromoCode.objects.filter(coupon=coupon).values_list("code", flat=True))
        assert saved == {"AMB-01", "AMB-02"}

    @tx
    def test_create_codes_rejects_duplicates(self):
        coupon = CouponFactory()
        creator = UserFactory()
        with pytest.raises(ValueError, match="DUPLICATE_PROMO_CODE_IN_REQUEST"):
            PromoCodeService.create_codes(coupon.id, creator, codes=["X1", "x1"])

    @tx
    def test_create_codes_rejects_global_clash(self):
        existing = PromoCodeFactory(code="AMB-FIXED")
        with pytest.raises(ValueError, match="PROMO_CODE_EXISTS"):
            PromoCodeService.create_codes(
                existing.coupon_id, UserFactory(), codes=["AMB-FIXED"]
            )

    @tx
    def test_dashboard_aggregation(self):
        coupon = CouponFactory(total_count=100)
        pc_a = PromoCodeFactory(coupon=coupon, name="代言人A")
        PromoCodeFactory(coupon=coupon, name="代言人B")

        # A 码有 2 个用户各领一次；B 码无人领
        for _ in range(2):
            PromotionService.claim_via_promo_code(UserFactory(), pc_a.code)

        rows = list(PromoCodeService.dashboard(coupon_id=coupon.id))
        assert len(rows) == 2
        by_code = {r.code: r for r in rows}
        assert by_code[pc_a.code].claim_count == 2
        assert by_code[pc_a.code].unique_users == 2
        assert by_code[pc_a.code].paid_order_count == 0
        # 未领用的 B 码也出现在看板（0 数据）
        assert by_code[pc_a.code].gmv == Decimal("0.00")
