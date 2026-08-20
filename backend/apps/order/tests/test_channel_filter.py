"""
交易履约/运营辅助 —— 订单渠道来源筛选与统计测试（代言人推广码 / 商城）。

对应需求：订单可按渠道来源筛选（下拉框：全部 / 商城 / 代言人A / 代言人B …），
并给出各渠道订单数与 GMV 统计。

覆盖：
  - channel=all（默认）：不过滤
  - channel=mall：仅无代言人归因的订单（自然流量 / 普通券 / 无券）
  - channel=<promo_code>：仅该代言人推广码归因的订单
  - 列表每行附带 channel_code / channel_name
  - 渠道统计端点：按渠道聚合 order_count / gmv + 总计（行级隔离后）
"""
from __future__ import annotations

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.order.tests.factories import OrderFactory
from apps.promotion.models import UserCoupon
from apps.promotion.services import PromotionService
from apps.promotion.tests.factories import CouponFactory, PromoCodeFactory
from apps.users.tests.factories import UserFactory

pytestmark = [pytest.mark.integration]

tx = pytest.mark.django_db(transaction=True)

LIST_URL = "/api/v1/order/admin/list/"
STATS_URL = "/api/v1/order/admin/channel-stats/"


@pytest.fixture
def channel_env(db):
    """代言人A/B 各有一单归因订单；普通券单 + 无券单归「商城」。"""
    superadmin = UserFactory(is_superuser=True)
    pc_a = PromoCodeFactory(name="代言人A")
    pc_b = PromoCodeFactory(name="代言人B")

    def _promo_order(pc, amount):
        user = UserFactory()
        PromotionService.claim_via_promo_code(user, pc.code)
        uc = UserCoupon.objects.get(user=user, coupon=pc.coupon)
        order = OrderFactory(user=user, actual_amount=Decimal(amount))
        PromotionService.lock(user, uc.id, order.order_no)
        PromotionService.consume_for_order(order.order_no)
        return order

    order_a = _promo_order(pc_a, "66.00")
    order_b = _promo_order(pc_b, "88.00")

    # 商城：普通券订单 + 无券订单
    mall_user1 = UserFactory()
    coupon = CouponFactory(total_count=100)
    PromotionService.claim(mall_user1, coupon.code)
    uc_mall = UserCoupon.objects.get(user=mall_user1, coupon=coupon)
    order_mall1 = OrderFactory(user=mall_user1, actual_amount=Decimal("30.00"))
    PromotionService.lock(mall_user1, uc_mall.id, order_mall1.order_no)
    PromotionService.consume_for_order(order_mall1.order_no)

    mall_user2 = UserFactory()
    order_mall2 = OrderFactory(user=mall_user2, actual_amount=Decimal("10.00"))

    return {
        "superadmin": superadmin,
        "pc_a": pc_a, "pc_b": pc_b,
        "order_a": order_a, "order_b": order_b,
        "order_mall1": order_mall1, "order_mall2": order_mall2,
    }


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _ids(resp):
    return {row["order_no"] for row in resp.json()["results"]}


class TestChannelFilter:
    @tx
    def test_all_returns_everything(self, channel_env):
        resp = _client(channel_env["superadmin"]).get(LIST_URL, {"channel": "all"})
        assert resp.status_code == 200
        rows = resp.json()["results"]
        assert len(rows) == 4
        # 每行带渠道字段
        assert all("channel_code" in r and "channel_name" in r for r in rows)

    @tx
    def test_mall_only_no_attribution(self, channel_env):
        resp = _client(channel_env["superadmin"]).get(LIST_URL, {"channel": "mall"})
        ids = _ids(resp)
        assert channel_env["order_mall1"].order_no in ids
        assert channel_env["order_mall2"].order_no in ids
        assert channel_env["order_a"].order_no not in ids
        assert channel_env["order_b"].order_no not in ids
        for row in resp.json()["results"]:
            assert row["channel_code"] == "mall"
            assert row["channel_name"] == "商城"

    @tx
    def test_promo_code_only_that_ambassador(self, channel_env):
        resp = _client(channel_env["superadmin"]).get(
            LIST_URL, {"channel": channel_env["pc_a"].code}
        )
        ids = _ids(resp)
        assert ids == {channel_env["order_a"].order_no}
        row = resp.json()["results"][0]
        assert row["channel_code"] == channel_env["pc_a"].code
        assert row["channel_name"] == "代言人A"

    @tx
    def test_channel_combined_with_status(self, channel_env):
        """渠道筛选与既有状态筛选可叠加。"""
        resp = _client(channel_env["superadmin"]).get(
            LIST_URL, {"channel": "mall", "status": channel_env["order_mall1"].status}
        )
        ids = _ids(resp)
        assert channel_env["order_mall1"].order_no in ids


class TestChannelStats:
    @tx
    def test_stats_aggregate_by_channel(self, channel_env):
        resp = _client(channel_env["superadmin"]).get(STATS_URL)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_orders"] == 4
        assert Decimal(body["total_gmv"]) == Decimal("194.00")  # 66+88+30+10

        by_channel = {item["channel"]: item for item in body["items"]}
        a = by_channel[channel_env["pc_a"].code]
        assert a["name"] == "代言人A"
        assert a["order_count"] == 1
        assert Decimal(a["gmv"]) == Decimal("66.00")
        b = by_channel[channel_env["pc_b"].code]
        assert b["order_count"] == 1
        assert Decimal(b["gmv"]) == Decimal("88.00")
        mall = by_channel["mall"]
        assert mall["name"] == "商城"
        assert mall["order_count"] == 2
        assert Decimal(mall["gmv"]) == Decimal("40.00")

    @tx
    def test_stats_respect_row_level_scope(self, channel_env):
        """非超管（组长）仅统计本组可见订单 —— 跨组订单不计入渠道统计。"""
        # 组长归属组 A：构造一条组 A 管辖类目的订单 + 一条其他类目订单
        from apps.goods.models import AdminGroupMember
        from apps.goods.tests.factories import (
            AdminGroupFactory, AdminGroupMemberFactory, CategoryFactory, SKUFactory, SPUFactory,
        )
        from apps.order.models import OrderItem

        g_a = AdminGroupFactory()
        cat_a = CategoryFactory(level=1, admin_group=g_a)
        cat_b = CategoryFactory(level=1, admin_group=None)

        leader = UserFactory()
        AdminGroupMemberFactory(
            user=leader, group=g_a,
            role=AdminGroupMember.Role.LEADER,
            status=AdminGroupMember.Status.ACTIVE,
        )
        # 组 A 内订单（有代言人归因）
        in_user = UserFactory()
        pc_x = PromoCodeFactory(name="组内代言人")
        PromotionService.claim_via_promo_code(in_user, pc_x.code)
        uc = UserCoupon.objects.get(user=in_user, coupon=pc_x.coupon)
        order_in = OrderFactory(user=in_user, actual_amount=Decimal("20.00"))
        PromotionService.lock(in_user, uc.id, order_in.order_no)
        PromotionService.consume_for_order(order_in.order_no)
        OrderItem.objects.create(
            order=order_in, spu_name="in", sku_code="IN-1",
            price=Decimal("20.00"), quantity=1, subtotal=Decimal("20.00"),
            sku=SKUFactory(spu=SPUFactory(category=cat_a)),
        )
        # 跨组订单（无归因，归商城）
        out_user = UserFactory()
        order_out = OrderFactory(user=out_user, actual_amount=Decimal("50.00"))
        OrderItem.objects.create(
            order=order_out, spu_name="out", sku_code="OUT-1",
            price=Decimal("50.00"), quantity=1, subtotal=Decimal("50.00"),
            sku=SKUFactory(spu=SPUFactory(category=cat_b)),
        )

        resp = _client(leader).get(STATS_URL)
        body = resp.json()
        # 组长仅可见组 A 订单（既有环境里的 4 单均不可见）
        assert body["total_orders"] == 1
        assert Decimal(body["total_gmv"]) == Decimal("20.00")
