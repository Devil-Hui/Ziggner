"""Deterministic payment simulator for development and staging."""

import hashlib
import hmac
import json
import threading
from decimal import Decimal

from django.conf import settings

from payment.gateways.base import BasePaymentGateway, PaymentGatewayFactory


@PaymentGatewayFactory.register('mock')
class MockPaymentGateway(BasePaymentGateway):
    _refunds = {}
    _refund_lock = threading.Lock()

    def create_payment(self, payment_no, currency, amount, product_name, success_url, cancel_url):
        return {
            'gateway_id': f'mock-{payment_no}',
            'pay_url': f'/mock-payment/{payment_no}?scenario=success',
            'scenario_options': ['success', 'failure', 'cancel', 'timeout'],
        }

    def retrieve_payment(self, gateway_payment_id):
        return {'status': 'pending'}

    def verify_webhook(self, raw_body, signature, headers=None):
        expected = hmac.new(
            settings.MOCK_PAYMENT_SECRET.encode(),
            raw_body.encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def create_refund(
        self,
        gateway_payment_id,
        amount: Decimal,
        currency,
        reason='',
        idempotency_key='',
    ):
        request_id = idempotency_key or f'legacy-{gateway_payment_id}-{amount}'
        with self._refund_lock:
            existing = self._refunds.get(request_id)
            if existing is not None:
                if existing.get('status') == 'unknown' and existing.get('_timeout'):
                    raise TimeoutError('MOCK_REFUND_TIMEOUT')
                return {key: value for key, value in existing.items() if not key.startswith('_')}

            scenario = 'success'
            if 'scenario=' in reason:
                scenario = reason.rsplit('scenario=', 1)[-1].split()[0].strip().lower()
            digest = hashlib.sha256(request_id.encode()).hexdigest()[:20]
            result = {
                'gateway_refund_id': f'mock-refund-{digest}',
                'status': 'succeeded',
                'amount': f'{amount:.2f}',
                'currency': currency.upper(),
            }
            if scenario in ('failure', 'failed', 'cancel', 'cancelled'):
                result['status'] = 'failed'
            elif scenario == 'timeout':
                result = {'status': 'unknown', '_timeout': True}
            elif scenario == 'timeout_then_success':
                self._refunds[request_id] = result
                raise TimeoutError('MOCK_REFUND_TIMEOUT')
            self._refunds[request_id] = result
            if result.get('_timeout'):
                raise TimeoutError('MOCK_REFUND_TIMEOUT')
            return result.copy()

    def query_refund(self, gateway_request_id, gateway_refund_id=''):
        with self._refund_lock:
            result = self._refunds.get(gateway_request_id)
            if result is None:
                return {'status': 'unavailable'}
            return {key: value for key, value in result.items() if not key.startswith('_')}
