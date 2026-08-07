"""
PayPal Orders v2 API gateway.
Implements BasePaymentGateway interface.
"""
import json
import logging
from decimal import Decimal

import requests
from django.conf import settings

from payment.gateways.base import (
    BasePaymentGateway,
    GatewayRefundRejectedError,
    GatewayRefundUnknownError,
    PaymentGatewayFactory,
)

logger = logging.getLogger('biz')

PAYPAL_BASE = getattr(settings, 'PAYPAL_BASE_URL', 'https://api-m.paypal.com')


def _get_access_token() -> str:
    client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
    secret = getattr(settings, 'PAYPAL_CLIENT_SECRET', '')
    resp = requests.post(
        f'{PAYPAL_BASE}/v1/oauth2/token',
        data={'grant_type': 'client_credentials'},
        auth=(client_id, secret),
        headers={'Accept': 'application/json'},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()['access_token']


@PaymentGatewayFactory.register('paypal')
class PayPalGateway(BasePaymentGateway):
    """PayPal 支付网关"""

    def create_payment(self, payment_no: str, currency: str, amount: float,
                       product_name: str, success_url: str, cancel_url: str) -> dict:
        client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
        secret = getattr(settings, 'PAYPAL_CLIENT_SECRET', '')
        if not client_id or not secret:
            raise ValueError('GATEWAY_NOT_CONFIGURED: paypal')

        try:
            token = _get_access_token()
        except requests.exceptions.RequestException as e:
            logger.error(f'PayPal token fetch failed for {payment_no}: {e}')
            raise ValueError(f'PAYPAL_GATEWAY_ERROR: {e}')

        payload = {
            'intent': 'CAPTURE',
            'purchase_units': [{
                'reference_id': payment_no,
                'description': product_name,
                'amount': {'currency_code': currency.upper(), 'value': f'{float(amount):.2f}'},
            }],
            'application_context': {
                'return_url': success_url, 'cancel_url': cancel_url, 'user_action': 'PAY_NOW',
            },
        }
        try:
            resp = requests.post(
                f'{PAYPAL_BASE}/v2/checkout/orders',
                json=payload,
                headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                timeout=15,
            )
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f'PayPal order creation failed for {payment_no}: {e}')
            raise ValueError(f'PAYPAL_GATEWAY_ERROR: {e}')

        data = resp.json()
        pay_url = next(
            (link['href'] for link in data.get('links', []) if link.get('rel') == 'approve'), '',
        )
        logger.info(f'PayPal order created: {data["id"]} for {payment_no}')
        return {'gateway_id': data['id'], 'pay_url': pay_url}

    def retrieve_payment(self, gateway_payment_id: str) -> dict:
        token = _get_access_token()
        resp = requests.get(
            f'{PAYPAL_BASE}/v2/checkout/orders/{gateway_payment_id}',
            headers={'Authorization': f'Bearer {token}'},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        status = data.get('status', 'UNKNOWN')
        if status == 'APPROVED':
            capture_resp = requests.post(
                f'{PAYPAL_BASE}/v2/checkout/orders/{gateway_payment_id}/capture',
                headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                timeout=15,
            )
            capture_resp.raise_for_status()
            capture_data = capture_resp.json()
            status = capture_data.get('status', 'COMPLETED')
        mapped = {'COMPLETED': 'succeeded', 'APPROVED': 'succeeded', 'SAVED': 'pending', 'VOIDED': 'cancelled'}
        return {
            'status': mapped.get(status, status.lower()),
            'amount': float(data.get('purchase_units', [{}])[0].get('amount', {}).get('value', 0)),
            'currency': data.get('purchase_units', [{}])[0].get('amount', {}).get('currency_code', ''),
        }

    def verify_webhook(self, raw_body: str, signature: str, headers: dict = None) -> bool:
        headers = headers or {}
        transmission_id = headers.get('HTTP_PAYPAL_TRANSMISSION_ID', '')
        transmission_time = headers.get('HTTP_PAYPAL_TRANSMISSION_TIME', '')
        transmission_sig = headers.get('HTTP_PAYPAL_TRANSMISSION_SIG', '')
        cert_url = headers.get('HTTP_PAYPAL_CERT_URL', '')
        auth_algo = headers.get('HTTP_PAYPAL_AUTH_ALGO', '')

        if not all([raw_body, transmission_id, transmission_sig, cert_url]):
            logger.warning('PayPal webhook: missing required verification headers')
            return False

        webhook_id = getattr(settings, 'PAYPAL_WEBHOOK_ID', '')
        if not webhook_id:
            logger.error('PayPal webhook: PAYPAL_WEBHOOK_ID not configured')
            return False

        try:
            token = _get_access_token()
            verify_payload = {
                'auth_algo': auth_algo, 'cert_url': cert_url,
                'transmission_id': transmission_id, 'transmission_sig': transmission_sig,
                'transmission_time': transmission_time or '', 'webhook_id': webhook_id,
                'webhook_event': json.loads(raw_body),
            }
            resp = requests.post(
                f'{PAYPAL_BASE}/v1/notifications/verify-webhook-signature',
                json=verify_payload,
                headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                timeout=15,
            )
            resp.raise_for_status()
            result = resp.json()
            verified = result.get('verification_status', '') == 'SUCCESS'
            if not verified:
                logger.warning(f'PayPal webhook verification failed: status={result.get("verification_status")}')
            return verified
        except Exception as e:
            logger.error(f'PayPal webhook verification error: {e}')
            return False

    def create_refund(
        self,
        gateway_payment_id: str,
        amount: Decimal,
        currency: str,
        reason: str = '',
        idempotency_key: str = '',
    ) -> dict:
        token = _get_access_token()
        try:
            resp = requests.get(
                f'{PAYPAL_BASE}/v2/checkout/orders/{gateway_payment_id}',
                headers={'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            captures = []
            for pu in data.get('purchase_units', []):
                for cap in pu.get('payments', {}).get('captures', []):
                    if cap.get('status') == 'COMPLETED':
                        captures.append(cap)

            if not captures:
                raise ValueError('PAYPAL_NO_CAPTURE_FOUND')

            capture_id = captures[0]['id']
            refund_payload = {
                'amount': {'currency_code': currency.upper(), 'value': f'{amount:.2f}'},
                'note_to_payer': reason or 'Customer requested refund',
            }
            refund_resp = requests.post(
                f'{PAYPAL_BASE}/v2/payments/captures/{capture_id}/refund',
                json=refund_payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                    'PayPal-Request-Id': idempotency_key,
                },
                timeout=15,
            )
            refund_resp.raise_for_status()
            refund_data = refund_resp.json()
            logger.info(f'PayPal refund created: {refund_data["id"]} for capture {capture_id}')
            return {
                'gateway_refund_id': refund_data['id'],
                'status': refund_data.get('status', 'COMPLETED'),
                'amount': refund_data.get('amount', {}).get('value', '0.00'),
                'currency': refund_data.get('amount', {}).get('currency_code', ''),
            }
        except (requests.Timeout, requests.ConnectionError) as e:
            logger.error(f'PayPal refund outcome unknown for {gateway_payment_id}: {e}')
            raise GatewayRefundUnknownError(f'PAYPAL_REFUND_UNKNOWN: {e}') from e
        except requests.HTTPError as e:
            status_code = getattr(e.response, 'status_code', 0) or 0
            if 400 <= status_code < 500:
                raise GatewayRefundRejectedError(f'PAYPAL_REFUND_REJECTED: {e}') from e
            raise GatewayRefundUnknownError(f'PAYPAL_REFUND_UNKNOWN: {e}') from e
        except requests.RequestException as e:
            logger.error(f'PayPal refund outcome unknown for {gateway_payment_id}: {e}')
            raise GatewayRefundUnknownError(f'PAYPAL_REFUND_UNKNOWN: {e}') from e

    def query_refund(self, gateway_request_id: str, gateway_refund_id: str = '') -> dict:
        if not gateway_refund_id:
            return {'status': 'unavailable'}
        try:
            token = _get_access_token()
            response = requests.get(
                f'{PAYPAL_BASE}/v2/payments/refunds/{gateway_refund_id}',
                headers={'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            return {
                'gateway_refund_id': data.get('id', gateway_refund_id),
                'status': data.get('status', 'UNKNOWN'),
                'amount': data.get('amount', {}).get('value'),
                'currency': data.get('amount', {}).get('currency_code', ''),
            }
        except requests.RequestException:
            logger.exception('PayPal refund query failed: %s', gateway_refund_id)
            return {'status': 'unavailable'}
