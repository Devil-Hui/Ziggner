"""
回归测试：UserService.create_user 必须为新用户生成 account_no。

历史缺陷：create_user 创建 UserProfile 时未设置 account_no（唯一约束字段），
默认空串会与已有空值冲突 → 注册 500（IntegrityError 1062），
导致「第一个用户之后所有注册失败」。测试工厂因后处理兜底未暴露该问题。
"""
from __future__ import annotations

from django.test import TestCase

from apps.users.models import UserProfile
from apps.users.services import UserService


class CreateUserAccountNoTest(TestCase):
    def test_create_user_assigns_unique_account_no(self):
        u1 = UserService.create_user(username="reg_a", password="Str0ng!Pass123", email="reg_a@example.com")
        u2 = UserService.create_user(username="reg_b", password="Str0ng!Pass123", email="reg_b@example.com")

        p1 = UserProfile.objects.get(user=u1)
        p2 = UserProfile.objects.get(user=u2)

        # 两个用户都必须有真实 account_no（非空、符合 ZG- 前缀格式）
        self.assertTrue(p1.account_no.startswith("ZG-"), p1.account_no)
        self.assertTrue(p2.account_no.startswith("ZG-"), p2.account_no)
        self.assertNotEqual(p1.account_no, p2.account_no, "account_no 必须唯一")

    def test_create_user_no_empty_account_no(self):
        u = UserService.create_user(username="reg_c", password="Str0ng!Pass123", email="reg_c@example.com")
        p = UserProfile.objects.get(user=u)
        self.assertNotEqual(p.account_no, "", "account_no 不得为空串（否则唯一约束冲突）")

    def test_create_user_then_get_or_create_profile_keeps_account_no(self):
        u = UserService.create_user(username="reg_d", password="Str0ng!Pass123", email="reg_d@example.com")
        p = UserService.get_or_create_profile(u)
        self.assertTrue(p.account_no.startswith("ZG-"))

    def test_profile_save_auto_generates_account_no_when_empty(self):
        """UserProfile.save() 兜底：account_no 为空时自动生成唯一值（杜绝未来再次出现空值）"""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        u = User.objects.create_user(username="reg_e", password="Str0ng!Pass123", email="reg_e@example.com")
        p = UserProfile(user=u, account_no="")
        p.save()

        self.assertTrue(p.account_no.startswith("ZG-"), p.account_no)
        # 幂等：再次保存不应改变已生成的 account_no
        saved = p.account_no
        p.phone = "13800000000"
        p.save()
        self.assertEqual(p.account_no, saved)
