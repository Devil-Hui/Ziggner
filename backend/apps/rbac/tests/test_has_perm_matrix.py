"""
RBAC 权限判定 5 角色 × 关键权限点矩阵测试（单元级，聚焦判定语义）。

覆盖 ziggner_system_full_map.md 第三章角色-权限矩阵的核心子集：
  - superadmin 全权限（短路）
  - ops 仅 9 项 read，无 write
  - leader 组长 17 项管理/审核权（含 audit/ship/cancel/category/brand/tag/group/recycle/import/application.review）
  - member 组员 9 项写权限（spu.write/sku.write/media.write 等），无 audit/ship/category 管理
  - customer 无任何管理权限
  - 多角色权限取并集
  - 匿名用户拒绝
  - _bump_version Redis 版本化（incr 前 set 防 ValueError，回归 §7 问题 11）
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase

from apps.rbac.constants import Role, DEFAULT_ROLE
from apps.rbac.models import UserRole
from apps.rbac.services import get_user_perms, get_user_roles, has_perm, has_role

import pytest

pytestmark = pytest.mark.integration

User = get_user_model()


class PermissionMatrixTest(TestCase):
    """5 角色 × 关键权限点矩阵。"""

    def setUp(self):
        self.superadmin = User.objects.create_user(username="m_super", password="x12345678")
        self.superadmin.is_superuser = True
        self.superadmin.save()

        self.leader = User.objects.create_user(username="m_leader", password="x12345678")
        UserRole.objects.create(user=self.leader, role=Role.ADMIN_LEADER.value)

        self.member = User.objects.create_user(username="m_member", password="x12345678")
        UserRole.objects.create(user=self.member, role=Role.ADMIN_MEMBER.value)

        self.ops = User.objects.create_user(username="m_ops", password="x12345678")
        UserRole.objects.create(user=self.ops, role=Role.OPS.value)

        self.customer = User.objects.create_user(username="m_customer", password="x12345678")

    # ── superadmin ──

    def test_superadmin_has_all_perms(self):
        from apps.rbac.constants import ALL_PERM_CODES
        self.assertEqual(get_user_perms(self.superadmin), ALL_PERM_CODES)
        # 任意权限点均真
        for code in ("goods.spu.write", "rbac.matrix.write", "rbac.user.assign", "order.ship"):
            self.assertTrue(has_perm(self.superadmin, code))

    # ── ops：仅 read ──

    def test_ops_read_only(self):
        ops_reads = ("goods.spu.read", "goods.stats.read", "order.read", "cs.conversation.read",
                     "support.ticket.read", "rbac.matrix.read", "rbac.user.read", "rbac.audit.read")
        for code in ops_reads:
            self.assertTrue(has_perm(self.ops, code), f"ops 应拥有 {code}")
        ops_writes = ("goods.spu.write", "goods.spu.audit", "order.ship", "order.cancel",
                      "rbac.matrix.write", "rbac.user.assign")
        for code in ops_writes:
            self.assertFalse(has_perm(self.ops, code), f"ops 不应拥有 {code}")

    # ── leader：17 项管理权 ──

    def test_leader_management_perms(self):
        leader_has = ("goods.spu.write", "goods.spu.audit", "goods.sku.write",
                      "goods.category.write", "goods.brand.write", "goods.tag.write",
                      "goods.media.write", "goods.import.execute", "goods.recycle.restore",
                      "goods.group.write", "goods.application.review",
                      "order.ship", "order.cancel", "order.aftersale.review",
                      "promotion.coupon.write", "promotion.activity.write",
                      "cs.conversation.takeover", "cs.conversation.close",
                      "support.ticket.write", "notification.broadcast")
        for code in leader_has:
            self.assertTrue(has_perm(self.leader, code), f"leader 应拥有 {code}")
        # leader 无矩阵写 / 角色分配（超管专属）
        for code in ("rbac.matrix.write", "rbac.user.assign"):
            self.assertFalse(has_perm(self.leader, code), f"leader 不应拥有 {code}")

    # ── member：9 项写，无 audit/管理 ──

    def test_member_limited_write(self):
        member_has = ("goods.spu.write", "goods.sku.write", "goods.media.write")
        for code in member_has:
            self.assertTrue(has_perm(self.member, code), f"member 应拥有 {code}")
        member_not = ("goods.spu.audit", "goods.category.write", "goods.brand.write",
                      "goods.tag.write", "order.ship", "order.cancel",
                      "promotion.coupon.write", "promotion.activity.write",
                      "cs.conversation.takeover")
        for code in member_not:
            self.assertFalse(has_perm(self.member, code), f"member 不应拥有 {code}")

    # ── customer ──

    def test_customer_no_management_perms(self):
        for code in ("goods.spu.read", "goods.spu.write", "rbac.matrix.read"):
            self.assertFalse(has_perm(self.customer, code))
        self.assertIn(DEFAULT_ROLE.value, get_user_roles(self.customer))

    # ── 多角色并集 ──

    def test_multi_role_union(self):
        UserRole.objects.create(user=self.ops, role=Role.ADMIN_MEMBER.value)
        self.assertTrue(has_perm(self.ops, "rbac.user.read"))  # ops 审计
        self.assertTrue(has_perm(self.ops, "goods.spu.write"))  # member 写
        self.assertTrue(has_role(self.ops, Role.OPS.value))
        self.assertTrue(has_role(self.ops, Role.ADMIN_MEMBER.value))

    # ── 匿名拒绝 ──

    def test_anonymous_rejected(self):
        from django.contrib.auth.models import AnonymousUser
        anon = AnonymousUser()
        self.assertFalse(has_perm(anon, "goods.spu.read"))
        self.assertFalse(has_role(anon, Role.SUPERADMIN.value))
        self.assertEqual(get_user_perms(anon), frozenset())


class BumpVersionTest(SimpleTestCase):
    """_bump_version 必须先 set 再 incr，防 django_redis ValueError（回归 §7 问题 11）。"""

    def test_bump_from_missing_key(self):
        from apps.rbac.services import _bump_version
        from utils.cache import Cache

        # 与应用同构的 Cache('rbac') 包装器（真实 Redis key 带 KEY_PREFIX+version，
        # 不可直接读裸 "rbac:version"）
        c = Cache('rbac')
        c.delete('version')
        # 不存在 key 时不应抛 ValueError；_bump_version 语义为 set(1)+incr → 首提为 2
        _bump_version()
        self.assertEqual(c.get('version'), 2)
        _bump_version()
        self.assertEqual(c.get('version'), 3)
        c.delete('version')
