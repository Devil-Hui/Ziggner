"""
Alipay payment gateway — RSA-SHA256 signature verification.
Implements BasePaymentGateway interface.
"""
import base64
import json
import logging
from decimal import Decimal
from urllib.parse import parse_qs

import requests
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from django.conf import settings

from payment.gateways.base import BasePaymentGateway, PaymentGatewayFactory

logger = logging.getLogger('biz')


def _alipay_public_key() -> str:
    key = getattr(settings, 'ALIPAY_PUBLIC_KEY', '')
    if not key:
        logger.error('ALIPAY_PUBLIC_KEY not configured')
        raise ValueError('ALIPAY_PUBLIC_KEY_MISSING')
    if '-----BEGIN' not in key:
        key = '-----BEGIN PUBLIC KEY-----\n' + key + '\n-----END PUBLIC KEY-----'
    return key


@PaymentGatewayFactory.register('alipay')
class AlipayGateway(BasePaymentGateway):
    """支付宝支付网关"""

    def create_payment(self, payment_no: str, currency: str, amount: float,
                       product_name: str, success_url: str, cancel_url: str) -> dict:
        raise ValueError('GATEWAY_NOT_IMPLEMENTED: alipay')

    def retrieve_payment(self, gateway_payment_id: str) -> dict:
        return {'status': 'unknown'}

    def verify_webhook(self, raw_body: str, signature: str, headers: dict = None) -> bool:
        try:
            params = self._extract_params(raw_body)
        except Exception:
            return False
        sign = params.get('sign', '') or signature
        notify_id = params.get('notify_id', '')
        if not self._verify_signature(params, sign):
            return False
        if notify_id and not self._verify_notify_id(notify_id):
            return False
        return True

    def create_refund(
        self,
        gateway_payment_id: str,
        amount: Decimal,
        currency: str,
        reason: str = '',
        idempotency_key: str = '',
    ) -> dict:
        raise ValueError('ALIPAY_REFUND_NOT_SUPPORTED')

    def query_refund(self, gateway_request_id: str, gateway_refund_id: str = '') -> dict:
        return {'status': 'unavailable'}

    def _verify_signature(self, params: dict, sign: str, sign_type: str = 'RSA2') -> bool:
        if not sign or not params:
            return False
        try:
            verify_params = {k: v for k, v in params.items() if k not in ('sign', 'sign_type') and v != ''}
            sorted_keys = sorted(verify_params.keys())
            sign_strings = []
            for k in sorted_keys:
                v = verify_params[k]
                if isinstance(v, (dict, list)):
                    v = json.dumps(v, separators=(',', ':'))
                sign_strings.append(f'{k}={v}')
            sign_str = '&'.join(sign_strings)
            public_key = serialization.load_pem_public_key(_alipay_public_key().encode())
            public_key.verify(
                base64.b64decode(sign),
                sign_str.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            return True
        except InvalidSignature:
            logger.warning('Alipay signature verification FAILED')
            return False
        except Exception as e:
            logger.error(f'Alipay signature verification error: {e}')
            return False

    @staticmethod
    def _verify_notify_id(notify_id: str) -> bool:
        if not notify_id:
            return False
        pid = getattr(settings, 'ALIPAY_PARTNER_ID', '')
        if not pid:
            logger.warning('Alipay notify_id check skipped: ALIPAY_PARTNER_ID not set')
            return True
        try:
            resp = requests.get(
                'https://mapi.alipay.com/gateway.do',
                params={'service': 'notify_verify', 'partner': pid, 'notify_id': notify_id},
                timeout=10,
            )
            result = resp.text.strip()
            if result == 'true':
                return True
            logger.warning(f'Alipay notify_id verification failed: notify_id={notify_id}, result={result}')
            return False
        except Exception as e:
            logger.error(f'Alipay notify_id check error: {e}')
            return False

    @staticmethod
    def _extract_params(body: str) -> dict:
        try:
            return json.loads(body)
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            return {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in parse_qs(body).items()}
        except Exception:
            logger.error('Failed to parse Alipay callback body')
            return {}
