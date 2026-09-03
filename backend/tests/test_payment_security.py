"""支付安全回归测试 —— 假支付 / 金额篡改 / 伪造回调 / 无审批退款 必须被拒绝。

覆盖的安全设计（2026-09 安全加固）：
1. Webhook 必须通过 HMAC 验签（Mock 通道与真实网关共用 handle_webhook 全量校验链路）
2. Webhook 金额篡改（即使攻击者重签）被 Decimal 金额复核拒绝
3. 事件严格白名单：PAYMENT.CAPTURE.DENIED / REFUNDED 不再被误判为支付成功
4. 用户自助退款必须先有已批准/已完成的售后单；管理员豁免

运行：pytest backend/tests/test_payment_security.py -v
"""
import hashlib
import hmac
import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from apps.order.models import AfterSale, AfterSaleStatus, Order
from apps.payment.models import PaymentLog, PaymentStatus
from apps.payment.services import PaymentService

User = get_user_model()

MOCK_SECRET = 'unit-test-mock-secret'
WEBHOOK_URL = '/api/v1/payment/webhook/mock/'
REFUND_URL = '/api/v1/payment/refund/'


def _make_order_payment(user, amount='10.00', method='mock',
                        status=PaymentStatus.SUCCESS, gateway_id='pay_mock_1'):
    """构造一笔订单 + 支付记录（默认已支付成功，模拟真实收款后的状态）。"""
    order = Order.objects.create(
        user=user,
        total_amount=Decimal(amount),
        actual_amount=Decimal(amount),
        shipping_name='Test Buyer',
        shipping_phone='13800000000',
    )
    return PaymentLog.objects.create(
        user=user, order=order, amount=Decimal(amount),
        currency='USD', method=method, status=status,
        gateway_payment_id=gateway_id,
    )


def _mock_signed_body(payment, scenario='success', amount='10.00', event_id='evt-test-1'):
    """按 mock 网关验签规范（HMAC-SHA256 over raw body）构造签名请求体。"""
    payload = {
        'gateway_payment_id': payment.gateway_payment_id,
        'event_id': event_id,
        'scenario': scenario,
        'amount': amount,
        'currency': 'USD',
    }
    raw = json.dumps(payload, separators=(',', ':'))
    sig = hmac.new(MOCK_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return raw, sig


@override_settings(ENABLE_MOCK_PAYMENT=True, MOCK_PAYMENT_SECRET=MOCK_SECRET)
class MockWebhookSecurityTests(TestCase):
    """Mock 通道走的是与真实网关一致的 handle_webhook 校验链路（验签→金额→状态）。"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='buyer', password='Passw0rd!123')
        self.payment = _make_order_payment(
            self.user, status=PaymentStatus.PENDING, gateway_id='pay_mock_1',
        )

    def _post_webhook(self, raw, sig=None):
        kwargs = {'data': raw, 'content_type': 'application/json'}
        if sig is not None:
            kwargs['HTTP_X_SIGNATURE'] = sig
        return self.client.post(WEBHOOK_URL, **kwargs)

    def test_valid_webhook_marks_paid(self):
        """正确签名 + 金额一致 → 才允许标记支付成功。"""
        raw, sig = _mock_signed_body(self.payment)
        res = self._post_webhook(raw, sig)
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.SUCCESS)

    def test_missing_signature_rejected(self):
        raw, _sig = _mock_signed_body(self.payment)
        res = self._post_webhook(raw)
        self.assertEqual(res.status_code, 400)
        self.payment.refresh_from_db()
        self.assertNotEqual(self.payment.status, PaymentStatus.SUCCESS)

    def test_wrong_signature_rejected(self):
        raw, _sig = _mock_signed_body(self.payment)
        res = self._post_webhook(raw, 'deadbeef')
        self.assertEqual(res.status_code, 400)
        self.payment.refresh_from_db()
        self.assertNotEqual(self.payment.status, PaymentStatus.SUCCESS)

    def test_tampered_amount_rejected(self):
        """篡改金额后即使重新签名，Decimal 复核仍会拒绝（防改金额零元购）。"""
        raw, sig = _mock_signed_body(self.payment, amount='0.01')
        res = self._post_webhook(raw, sig)
        self.assertEqual(res.status_code, 400)
        self.payment.refresh_from_db()
        self.assertNotEqual(self.payment.status, PaymentStatus.SUCCESS)

    def test_failure_scenario_does_not_mark_paid(self):
        raw, sig = _mock_signed_body(self.payment, scenario='failure')
        res = self._post_webhook(raw, sig)
        self.assertEqual(res.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.FAILED)


class WebhookEventWhitelistTests(SimpleTestCase):
    """事件严格白名单回归：杜绝子串模糊匹配的历史误判（无需 DB）。"""

    def test_paypal_denied_is_not_completed(self):
        self.assertEqual(
            PaymentService._extract_event('paypal', {'event_type': 'PAYMENT.CAPTURE.DENIED'}),
            'payment_failed',
        )

    def test_paypal_refunded_is_refund_not_paid(self):
        self.assertEqual(
            PaymentService._extract_event('paypal', {'event_type': 'PAYMENT.CAPTURE.REFUNDED'}),
            'refund_completed',
        )

    def test_paypal_completed_is_completed(self):
        self.assertEqual(
            PaymentService._extract_event('paypal', {'event_type': 'PAYMENT.CAPTURE.COMPLETED'}),
            'payment_completed',
        )

    def test_stripe_refund_failed_is_not_refund_completed(self):
        # 白名单外事件原样返回 → handle_webhook 走「仅存档」分支，不推进状态
        self.assertEqual(
            PaymentService._extract_event('stripe', {'type': 'refund.failed'}),
            'refund.failed',
        )

    def test_unmapped_events_are_never_completed(self):
        for gateway, payload in (
            ('stripe', {'type': 'checkout.session.expired'}),
            ('paypal', {'event_type': 'CHECKOUT.ORDER.APPROVED'}),  # approval ≠ 收款
        ):
            self.assertNotEqual(
                PaymentService._extract_event(gateway, payload),
                'payment_completed',
            )


@override_settings(ENABLE_MOCK_PAYMENT=True, MOCK_PAYMENT_SECRET=MOCK_SECRET)
class RefundAfterSaleGateTests(TestCase):
    """退款安全门控：无已批准售后单 → 拒绝退款（管理员豁免）。"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='buyer2', password='Passw0rd!123')
        self.payment = _make_order_payment(self.user, status=PaymentStatus.SUCCESS)

    def _refund(self):
        self.client.force_authenticate(self.user)
        return self.client.post(
            REFUND_URL, {'order_no': self.payment.order.order_no}, format='json',
        )

    def test_refund_blocked_without_after_sale(self):
        """收货后想绕过售后审核直接自退全款 → 403。"""
        res = self._refund()
        self.assertEqual(res.status_code, 403)
        self.assertIn('approved after-sale', str(res.data.get('detail', '')))

    def test_refund_rejected_after_sale_still_pending(self):
        """售后单还在待审核 → 同样不允许退款。"""
        AfterSale.objects.create(
            order=self.payment.order, type='return',
            reason='not received', amount=Decimal('10.00'),
            status=AfterSaleStatus.PENDING_REVIEW,
        )
        res = self._refund()
        self.assertEqual(res.status_code, 403)

    def test_refund_allowed_after_approved_after_sale(self):
        """管理员批准售后后 → 允许退款并走完网关退款链路。"""
        AfterSale.objects.create(
            order=self.payment.order, type='return',
            reason='return refund', amount=Decimal('10.00'),
            status=AfterSaleStatus.APPROVED,
        )
        res = self._refund()
        self.assertEqual(res.status_code, 200)
        self.payment.order.refresh_from_db()
        self.assertEqual(self.payment.order.payment_status, 'refunded')

    def test_admin_exempt_from_after_sale_gate(self):
        """管理员（超管）豁免：线下协商退款不要求售后单。"""
        admin = User.objects.create_superuser(username='boss', password='Passw0rd!123',
                                              email='boss@example.com')
        self.client.force_authenticate(admin)
        res = self.client.post(
            REFUND_URL, {'order_no': self.payment.order.order_no}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.payment.order.refresh_from_db()
        self.assertEqual(self.payment.order.payment_status, 'refunded')

    def test_refund_of_other_users_order_not_found(self):
        """IDOR：不能退别人的订单（payment 按 user 归属过滤）。"""
        other = User.objects.create_user(username='other', password='Passw0rd!123')
        self.client.force_authenticate(other)
        res = self.client.post(
            REFUND_URL, {'order_no': self.payment.order.order_no}, format='json',
        )
        self.assertEqual(res.status_code, 404)
