"""
通用工具测试：安全整数解析 + 日志脱敏（接口健壮性/敏感信息红线）。
"""
from __future__ import annotations

from django.test import SimpleTestCase

from utils.api_base_pagination import safe_int
from utils.json_logging import mask_sensitive

import pytest

pytestmark = pytest.mark.unit


class SafeIntTest(SimpleTestCase):
    def test_valid_int(self):
        self.assertEqual(safe_int('42', 0), 42)

    def test_invalid_falls_back(self):
        """非法/空输入回退默认值 —— 杜绝 ?page=abc → ValueError → 500。"""
        self.assertEqual(safe_int('abc', 1), 1)
        self.assertEqual(safe_int('', 1), 1)
        self.assertEqual(safe_int(None, 1), 1)
        self.assertEqual(safe_int('12.5', 3), 3)

    def test_negative_passthrough(self):
        self.assertEqual(safe_int('-3', 1), -3)


class MaskSensitiveTest(SimpleTestCase):
    def test_password_key_value_masked(self):
        self.assertNotIn('secret123', mask_sensitive('login failed password=secret123 ip=1.2.3.4'))

    def test_json_password_masked(self):
        masked = mask_sensitive('{"password": "hunter2"}')
        self.assertNotIn('hunter2', masked)

    def test_bearer_token_masked(self):
        masked = mask_sensitive('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.xyz')
        self.assertNotIn('eyJhbGciOiJIUzI1NiJ9', masked)

    def test_phone_masked(self):
        masked = mask_sensitive('联系 13812345678 下单')
        self.assertIn('138****5678', masked)
        self.assertNotIn('13812345678', masked)

    def test_plain_log_unchanged(self):
        self.assertEqual(mask_sensitive('商品创建成功 #12'), '商品创建成功 #12')
