"""
修改密码端点测试。

覆盖：
  - 正确旧密码 + 合法新密码 → 200，密码实际变更
  - 旧密码错误 → 400
  - 新密码强度不足 → 400
  - 新密码与旧密码相同 → 400
  - 未认证 → 401

安全意义：密码变更接口是账户安全核心路径，必须严格校验旧密码 + 强度 + 会话戳旋转。
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.tests.factories import UserFactory

import pytest

pytestmark = pytest.mark.integration

User = get_user_model()
CHANGE_PW_URL = "/api/v1/users/password/"


class ChangePasswordTest(TestCase):
    """POST /api/v1/users/password/ 行为测试。"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="pw_user", password="OldStr0ng!123"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _payload(self, old="OldStr0ng!123", new="NewStr0ng!456"):
        return {"old_password": old, "new_password": new, "confirm_password": new}

    def test_correct_old_password_returns_200_and_password_changed(self):
        resp = self.client.post(CHANGE_PW_URL, self._payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # 验证 DB 中密码已变更
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStr0ng!456"))

    def test_wrong_old_password_returns_400(self):
        resp = self.client.post(
            CHANGE_PW_URL,
            self._payload(old="WrongOldPass!"),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # 密码未变
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldStr0ng!123"))

    def test_weak_new_password_returns_400(self):
        resp = self.client.post(
            CHANGE_PW_URL,
            self._payload(new="short", old="OldStr0ng!123"),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        # 密码未变
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldStr0ng!123"))

    def test_new_same_as_old_returns_400(self):
        resp = self.client.post(
            CHANGE_PW_URL,
            self._payload(new="OldStr0ng!123", old="OldStr0ng!123"),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(None)
        resp = self.client.post(
            CHANGE_PW_URL,
            self._payload(),
            format="json",
        )
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
