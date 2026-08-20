"""
商品管理组权限门禁测试：can_operate_spu / can_audit_spu。

覆盖：
  - 超管可操作任意类目商品
  - 组长仅能操作本组管辖类目商品（类目门禁）
  - 组员仅能操作本组类目，但不能审核
  - 跨组拒绝
"""
from __future__ import annotations

from django.test import TestCase

from apps.goods.admin_permissions import can_audit_spu, can_operate_spu
from apps.goods.models import AdminGroupMember
from apps.goods.tests.factories import (
    AdminGroupFactory, AdminGroupMemberFactory, CategoryFactory, SPUFactory,
)
from apps.rbac.constants import Role
from apps.rbac.models import UserRole
from apps.users.tests.factories import UserFactory

import pytest

pytestmark = pytest.mark.integration


class AdminPermissionsTest(TestCase):
    def setUp(self):
        # 两组：group_a 管 cat_a（含子 cat_a1），group_b 管 cat_b
        self.group_a = AdminGroupFactory()
        self.cat_a = CategoryFactory(admin_group=self.group_a)
        self.cat_a1 = CategoryFactory(parent=self.cat_a)  # 子类目继承管辖
        self.group_b = AdminGroupFactory()
        self.cat_b = CategoryFactory(admin_group=self.group_b)

        self.spu_a = SPUFactory(category=self.cat_a)
        self.spu_a1 = SPUFactory(category=self.cat_a1)
        self.spu_b = SPUFactory(category=self.cat_b)

        # 角色用户
        self.superadmin = UserFactory(is_superuser=True)
        self.leader_a = UserFactory()
        UserRole.objects.create(user=self.leader_a, role=Role.ADMIN_LEADER.value)
        AdminGroupMemberFactory(user=self.leader_a, group=self.group_a, role="leader")

        self.member_a = UserFactory()
        UserRole.objects.create(user=self.member_a, role=Role.ADMIN_MEMBER.value)
        AdminGroupMemberFactory(user=self.member_a, group=self.group_a, role="member")

        self.leader_b = UserFactory()
        UserRole.objects.create(user=self.leader_b, role=Role.ADMIN_LEADER.value)
        AdminGroupMemberFactory(user=self.leader_b, group=self.group_b, role="leader")

    # ── 超管 ──

    def test_superadmin_can_operate_any_spu(self):
        self.assertTrue(can_operate_spu(self.superadmin, self.spu_a))
        self.assertTrue(can_operate_spu(self.superadmin, self.spu_b))

    def test_superadmin_can_audit_any_spu(self):
        self.assertTrue(can_audit_spu(self.superadmin, self.spu_a))

    # ── 组长：本组可审，跨组不可 ──

    def test_leader_can_operate_own_group_spu(self):
        self.assertTrue(can_operate_spu(self.leader_a, self.spu_a))
        self.assertTrue(can_operate_spu(self.leader_a, self.spu_a1))  # 子类目继承

    def test_leader_cannot_operate_cross_group_spu(self):
        self.assertFalse(can_operate_spu(self.leader_a, self.spu_b))

    def test_leader_can_audit_own_group(self):
        self.assertTrue(can_audit_spu(self.leader_a, self.spu_a))

    def test_leader_cannot_audit_cross_group(self):
        self.assertFalse(can_audit_spu(self.leader_a, self.spu_b))

    # ── 组员：本组可操作，但不可审核 ──

    def test_member_can_operate_own_group_spu(self):
        self.assertTrue(can_operate_spu(self.member_a, self.spu_a))

    def test_member_cannot_audit(self):
        self.assertFalse(can_audit_spu(self.member_a, self.spu_a))

    def test_member_cannot_operate_cross_group(self):
        self.assertFalse(can_operate_spu(self.member_a, self.spu_b))

    # ── 非 active 组成员不生效 ──

    def test_inactive_membership_denied(self):
        ghost = UserFactory()
        UserRole.objects.create(user=ghost, role=Role.ADMIN_LEADER.value)
        AdminGroupMemberFactory(
            user=ghost, group=self.group_a, role="leader",
            status=AdminGroupMember.Status.LEAVE,  # 非 ACTIVE(1) 不纳入活跃组
        )
        # 非活跃组不纳入 get_user_admin_groups
        from apps.goods.admin_permissions import get_user_admin_groups
        self.assertEqual(get_user_admin_groups(ghost), [])
