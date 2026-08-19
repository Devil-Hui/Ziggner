"""
RBAC 权限判定核心逻辑测试 —— 领域层最小权限原则。

覆盖：superadmin 全权限、默认角色回退、多角色并集、has_perm/has_role、
未认证用户拒绝、权限缓存走 Redis 版本化（不在此重复验证，聚焦判定语义）。
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.rbac.constants import ALL_PERM_CODES, DEFAULT_ROLE, Role
from apps.rbac.models import UserRole
from apps.rbac.services import get_user_perms, get_user_roles, has_perm, has_role


class PermissionJudgmentTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.superadmin = User.objects.create_user(username='t_super', password='x12345678')
        self.superadmin.is_superuser = True
        self.superadmin.save()

        self.leader = User.objects.create_user(username='t_leader', password='x12345678')
        UserRole.objects.create(user=self.leader, role=Role.ADMIN_LEADER.value)

        self.ops = User.objects.create_user(username='t_ops', password='x12345678')
        UserRole.objects.create(user=self.ops, role=Role.OPS.value)

        self.customer = User.objects.create_user(username='t_customer', password='x12345678')

    def test_superadmin_has_all_perms(self):
        """最小权限的例外：superadmin 拥有全部权限点，且 has_perm 恒真。"""
        perms = get_user_perms(self.superadmin)
        self.assertEqual(perms, ALL_PERM_CODES)
        self.assertTrue(has_perm(self.superadmin, 'goods.spu.write'))
        self.assertTrue(has_role(self.superadmin, Role.SUPERADMIN.value))

    def test_customer_falls_back_to_default_role(self):
        """无显式角色的用户回退到 customer 默认角色，无管理权限。"""
        self.assertIn(DEFAULT_ROLE.value, get_user_roles(self.customer))
        self.assertFalse(has_perm(self.customer, 'goods.spu.read'))
        self.assertFalse(has_role(self.customer, Role.ADMIN_LEADER.value))

    def test_multi_role_union(self):
        """多角色权限取并集：leader + ops 拥有两角色权限的并集。"""
        UserRole.objects.create(user=self.ops, role=Role.ADMIN_MEMBER.value)
        perms = get_user_perms(self.ops)
        self.assertIn('rbac.user.read', perms)  # ops 审计权限
        self.assertTrue(has_role(self.ops, Role.OPS.value))
        self.assertTrue(has_role(self.ops, Role.ADMIN_MEMBER.value))

    def test_anonymous_rejected(self):
        """匿名用户一律拒绝（默认拒绝原则）。"""
        from django.contrib.auth.models import AnonymousUser
        anon = AnonymousUser()
        self.assertFalse(has_perm(anon, 'goods.spu.read'))
        self.assertFalse(has_role(anon, Role.SUPERADMIN.value))
        self.assertEqual(get_user_perms(anon), frozenset())

    def test_group_role_not_global(self):
        """管理组身份（leader）≠ 全局超管；矩阵写等超管专属权限不越级。"""
        self.assertFalse(has_role(self.leader, Role.SUPERADMIN.value))
        self.assertFalse(has_perm(self.leader, 'rbac.matrix.write'))
