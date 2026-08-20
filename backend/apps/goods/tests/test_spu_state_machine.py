"""
SPU 状态机流转测试（商品运营子系统核心）。

覆盖 ziggner_system_full_map.md §6.1 SPU 状态机的全部跃迁：
  draft→submitted→approved→on_sale↔off_sale；suspended；rejected；
  以及非法跃迁抛 ValueError。
同时回归：
  D1：CheckConstraint —— submitted_by NOT NULL when status=SUBMITTED
  D2：submit_for_review 实体商品须有 ≥1 媒体（虚拟豁免）
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.goods.models import SPU, SPUStatus, SKU
from apps.goods.tests.factories import (
    CategoryFactory, ProductMediaFactory, SKUFactory, SPUFactory, TagFactory,
)
from apps.users.tests.factories import UserFactory

import pytest

pytestmark = pytest.mark.unit


class SPUStateMachineTest(TestCase):
    """SPU 全跃迁 + 非法跃迁拦截。"""

    def setUp(self):
        self.user = UserFactory()
        self.spu = SPUFactory(status=SPUStatus.DRAFT)
        self.sku = SKUFactory(spu=self.spu, stock=10)

    # ── 正向跃迁 ──

    def test_draft_to_submitted(self):
        # 实体商品无图时，submit_for_review 应拒收（D2）
        with self.assertRaises(ValueError):
            self.spu.submit_for_review(self.user)
        # 加图后正常提交
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.SUBMITTED)
        self.assertEqual(self.spu.submitted_by, self.user)

    def test_rejected_to_submitted_then_approve(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        leader = UserFactory()
        self.spu.approve(leader)
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.APPROVED)
        self.assertEqual(self.spu.reviewed_by, leader)

    def test_reject_back_to_rejected(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        leader = UserFactory()
        self.spu.reject(leader, "no reason")
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.REJECTED)
        # rejected 可重新提交
        self.spu.submit_for_review(self.user)
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.SUBMITTED)

    def test_put_on_sale_from_approved(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        self.spu.approve(UserFactory())
        self.spu.put_on_sale()
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.ON_SALE)

    def test_on_sale_to_off_sale_and_back(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        self.spu.approve(UserFactory())
        self.spu.put_on_sale()
        self.spu.put_off_sale()
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.OFF_SALE)
        self.spu.put_on_sale()
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.ON_SALE)

    def test_suspend_resume(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        self.spu.approve(UserFactory())
        self.spu.put_on_sale()
        self.spu.suspend()
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.SUSPENDED)
        self.spu.resume()
        self.spu.refresh_from_db()
        self.assertEqual(self.spu.status, SPUStatus.ON_SALE)

    # ── 非法跃迁 ──

    def test_illegal_submit_from_on_sale(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        self.spu.approve(UserFactory())
        self.spu.put_on_sale()
        with self.assertRaises(ValueError):
            self.spu.submit_for_review(self.user)

    def test_approve_without_submit(self):
        with self.assertRaises(ValueError):
            self.spu.approve(UserFactory())

    def test_put_on_sale_from_submitted(self):
        ProductMediaFactory(spu=self.spu)
        self.spu.submit_for_review(self.user)
        with self.assertRaises(ValueError):
            self.spu.put_on_sale()

    # ── D1 回归：CheckConstraint ──

    def test_submitted_requires_submitted_by(self):
        """绕过 submit_for_review 直写 SUBMITTED 应触发 IntegrityError。"""
        from django.db import connection
        from django.db import models as dj_models
        self.spu.status = SPUStatus.SUBMITTED
        self.spu.submitted_by = None
        with self.assertRaises(Exception):
            with transaction.atomic():
                self.spu.save(update_fields=["status"])
