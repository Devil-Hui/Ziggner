"""
新增管理员（超管开通管理员账号）端点测试。

覆盖主理人拍板的错误码映射与关键成功路径：
  - 邮箱缺失 / 格式非法        → 400 EMAIL_INVALID
  - 邮箱重复（大小写不敏感）    → 400 EMAIL_EXISTS
  - 密码过弱                    → 400 PASSWORD_WEAK
  - 姓名（first/last name）缺失 → 400 NAME_REQUIRED
  - 角色非法                    → 400 ROLE_INVALID
  - 正常创建                    → 201，邮箱归一化小写、email_verified=false、
                                且事务提交后异步派发欢迎邮件（on_commit 触发）

说明：welcome 邮件通过 transaction.on_commit 触发 Celery 任务
      send_admin_welcome_email.delay(user.id)。本测试用
      captureOnCommitCallbacks(execute=True) 让 on_commit 回调在请求结束后执行，
      并 mock 任务对象的 .delay 方法，断言「已派发」而不依赖真实 broker/SMTP。
"""
from __future__ import annotations

from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

import pytest

pytestmark = pytest.mark.integration

from apps.users.tasks import send_admin_welcome_email

User = get_user_model()

# /api/admin/users/create/ 由 apps.users.admin_urls 挂载
CREATE_URL = '/api/v1/admin/users/create/'


class AdminCreateTests(TestCase):
    """POST /api/admin/users/create/ 行为测试。"""

    def setUp(self) -> None:
        self.client = APIClient()
        # IsSuperAdmin 仅校验 user.is_superuser，故建一个超管即可通过鉴权
        self.admin = User.objects.create_superuser(
            username='root_admin',
            email='root_admin@example.com',
            password='RootAdmin123!',
        )
        self.client.force_authenticate(self.admin)

    # ── helpers ──

    def _payload(self, **overrides) -> dict:
        data = {
            'username': 'new_admin',
            'password': 'Str0ng!Pass',
            'email': 'New.Admin@Example.com',
            'first_name': 'Zhang',
            'last_name': 'San',
            'role': 'ops',
        }
        data.update(overrides)
        return data

    def _code(self, response) -> str | None:
        # 错误信封：{code: <语义码>, status: 'error', message, ...}
        return response.json().get('code')

    def _data(self, response) -> dict:
        # 成功信封：{code: <http status>, data: <业务体>, status: 'success', ...}
        return response.json().get('data')

    # ── 失败路径：错误码映射 ──

    def test_email_missing_returns_email_invalid(self):
        payload = self._payload()
        del payload['email']
        resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'EMAIL_INVALID')

    def test_email_invalid_format_returns_email_invalid(self):
        payload = self._payload(email='not-an-email')
        resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'EMAIL_INVALID')

    def test_email_duplicate_returns_email_exists(self):
        # 第一次创建（成功；不捕获 on_commit，避免触发真实 broker）
        first = self.client.post(CREATE_URL, self._payload(), format='json')
        self.assertEqual(first.status_code, 201, first.content)
        # 第二次使用相同邮箱（大小写不同，应被 iexact 唯一性拦下）；
        # 用户名必须不同，否则先命中 USERNAME_EXISTS
        resp = self.client.post(
            CREATE_URL, self._payload(username='new_admin2', email='NEW.ADMIN@example.com'), format='json'
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'EMAIL_EXISTS')

    def test_weak_password_returns_password_weak(self):
        payload = self._payload(password='short')
        resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'PASSWORD_WEAK')

    def test_first_name_missing_returns_name_required(self):
        payload = self._payload()
        del payload['first_name']
        resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'NAME_REQUIRED')

    def test_last_name_missing_returns_name_required(self):
        payload = self._payload()
        del payload['last_name']
        resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'NAME_REQUIRED')

    def test_role_invalid_returns_role_invalid(self):
        payload = self._payload(role='hacker')
        resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self._code(resp), 'ROLE_INVALID')

    # ── 成功路径 ──

    def test_normal_create_201_lowercased_email_unverified_false_welcome_dispatched(self):
        payload = self._payload(email='MixedCase@Example.com', role='superadmin')

        # mock 在外层：保证 on_commit 回调执行时 .delay 仍被替换
        with mock.patch.object(send_admin_welcome_email, 'delay') as mock_delay:
            with self.captureOnCommitCallbacks(execute=True):
                resp = self.client.post(CREATE_URL, payload, format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        body = self._data(resp)

        # 1) 邮箱归一化为小写存储并返回
        self.assertEqual(body['email'], 'mixedcase@example.com')

        # 2) email_verified 创建时强制 false（仅验证链接可置 true）
        created = User.objects.get(username='new_admin')
        self.assertFalse(created.profile.email_verified)

        # 3) 返回字段齐备
        self.assertEqual(body['username'], 'new_admin')
        self.assertEqual(body['first_name'], 'Zhang')
        self.assertEqual(body['last_name'], 'San')
        self.assertTrue(body['is_active'])
        self.assertIn('account_no', body)
        self.assertIsInstance(body['roles'], list)

        # 4) 事务提交后异步派发欢迎邮件
        mock_delay.assert_called_once_with(created.id)

    def test_inactive_flag_propagates_to_user(self):
        payload = self._payload(is_active=False)
        with mock.patch.object(send_admin_welcome_email, 'delay'):
            with self.captureOnCommitCallbacks(execute=True):
                resp = self.client.post(CREATE_URL, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        created = User.objects.get(username='new_admin')
        self.assertFalse(created.is_active)
        self.assertFalse(self._data(resp)['is_active'])
