"""
PayPal Orders v2 API gateway.
Creates PayPal-hosted checkout, verifies webhooks via PayPal's official API.
"""
import json
import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger('biz')

PAYPAL_BASE = getattr(settings, 'PAYPAL_BASE_URL', 'https://api-m.paypal.com')


def _get_access_token() -> str:
    """Obtain OAuth2 access token from PayPal."""
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


def create_order(payment_no: str, currency: str, amount: float,
                 product_name: str, success_url: str, cancel_url: str) -> dict:
    """Create a PayPal Order for checkout."""
    client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
    secret = getattr(settings, 'PAYPAL_CLIENT_SECRET', '')
    # 沙箱/未配置凭证时返回 mock 支付页，避免对外网网关的硬依赖导致 500
    if not client_id or not secret:
        logger.warning(f'PayPal credentials not configured; returning mock pay_url for {payment_no}')
        return {
            'gateway_id': f'mock-{payment_no}',
            'pay_url': f'/mock-payment/{payment_no}',
        }
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
            'amount': {
                'currency_code': currency.upper(),
                'value': f'{float(amount):.2f}',
            },
        }],
        'application_context': {
            'return_url': success_url,
            'cancel_url': cancel_url,
            'user_action': 'PAY_NOW',
        },
    }
    try:
        resp = requests.post(
            f'{PAYPAL_BASE}/v2/checkout/orders',
            json=payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=15,
        )
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        logger.error(f'PayPal order creation failed for {payment_no}: {e}')
        raise ValueError(f'PAYPAL_GATEWAY_ERROR: {e}')
    data = resp.json()
    pay_url = next(
        (link['href'] for link in data.get('links', [])
         if link.get('rel') == 'approve'), '',
    )
    logger.info(f'PayPal order created: {data["id"]} for {payment_no}')
    return {
        'gateway_id': data['id'],
        'pay_url': pay_url,
    }


def retrieve_order(gateway_payment_id: str) -> dict:
    """Retrieve PayPal order status."""
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
        # Auto-capture approved orders
        capture_resp = requests.post(
            f'{PAYPAL_BASE}/v2/checkout/orders/{gateway_payment_id}/capture',
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=15,
        )
        capture_resp.raise_for_status()
        capture_data = capture_resp.json()
        status = capture_data.get('status', 'COMPLETED')
    mapped = {
        'COMPLETED': 'succeeded',
        'APPROVED': 'succeeded',
        'SAVED': 'pending',
        'VOIDED': 'cancelled',
    }
    return {
        'status': mapped.get(status, status.lower()),
        'amount': float(data.get('purchase_units', [{}])[0].get('amount', {}).get('value', 0)),
        'currency': data.get('purchase_units', [{}])[0].get('amount', {}).get('currency_code', ''),
    }


def verify_webhook_signature(
    raw_body: str,
    transmission_id: str,
    transmission_time: str,
    transmission_sig: str,
    cert_url: str,
    auth_algo: str,
    webhook_id: str = '',
) -> bool:
    """
    Verify PayPal webhook using PayPal's official verification API.
    
    Uses PayPal v1/notifications/verify-webhook-signature endpoint which
    performs asymmetric RSA certificate-based verification with CRC32 checksum,
    preventing attackers from forging payment callbacks.

    Args:
        raw_body: The raw webhook event body (JSON string).
        transmission_id: PayPal-Transmission-Id header.
        transmission_time: PayPal-Transmission-Time header.
        transmission_sig: PayPal-Transmission-Sig header.
        cert_url: PayPal-Cert-Url header.
        auth_algo: PayPal-Auth-Algo header.
        webhook_id: Your webhook ID from PayPal Developer Dashboard.
    
    Returns:
        True if verified, False otherwise.
    """
    if not all([raw_body, transmission_id, transmission_sig, cert_url]):
        logger.warning('PayPal webhook: missing required verification headers')
        return False
    
    webhook_id = webhook_id or getattr(settings, 'PAYPAL_WEBHOOK_ID', '')
    if not webhook_id:
        logger.error('PayPal webhook: PAYPAL_WEBHOOK_ID not configured')
        return False

    try:
        token = _get_access_token()
        verify_payload = {
            'auth_algo': auth_algo,
            'cert_url': cert_url,
            'transmission_id': transmission_id,
            'transmission_sig': transmission_sig,
            'transmission_time': transmission_time or '',
            'webhook_id': webhook_id,
            'webhook_event': json.loads(raw_body),
        }
        resp = requests.post(
            f'{PAYPAL_BASE}/v1/notifications/verify-webhook-signature',
            json=verify_payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=15,
        )
        resp.raise_for_status()
        result = resp.json()
        verified = result.get('verification_status', '') == 'SUCCESS'
        if not verified:
            logger.warning(
                f'PayPal webhook verification failed: status={result.get("verification_status")}'
            )
        return verified
    except Exception as e:
        logger.error(f'PayPal webhook verification error: {e}')
        return False


def create_refund(gateway_payment_id: str, amount: float, currency: str, reason: str = '') -> dict:
    """Create a PayPal Refund for a captured order.

    First captures the order if needed, then refunds the capture.
    """
    token = _get_access_token()
    try:
        # Get captures for the order
        resp = requests.get(
            f'{PAYPAL_BASE}/v2/checkout/orders/{gateway_payment_id}',
            headers={'Authorization': f'Bearer {token}'},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        # Find the first capture
        captures = []
        for pu in data.get('purchase_units', []):
            for cap in pu.get('payments', {}).get('captures', []):
                if cap.get('status') == 'COMPLETED':
                    captures.append(cap)

        if not captures:
            raise ValueError('PAYPAL_NO_CAPTURE_FOUND')

        capture_id = captures[0]['id']
        refund_payload = {
            'amount': {
                'currency_code': currency.upper(),
                'value': f'{float(amount):.2f}',
            },
            'note_to_payer': reason or 'Customer requested refund',
        }
        refund_resp = requests.post(
            f'{PAYPAL_BASE}/v2/payments/captures/{capture_id}/refund',
            json=refund_payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=15,
        )
        refund_resp.raise_for_status()
        refund_data = refund_resp.json()
        logger.info(f'PayPal refund created: {refund_data["id"]} for capture {capture_id}')
        return {
            'gateway_refund_id': refund_data['id'],
            'status': refund_data.get('status', 'COMPLETED'),
            'amount': float(refund_data.get('amount', {}).get('value', 0)),
            'currency': refund_data.get('amount', {}).get('currency_code', ''),
        }
    except requests.RequestException as e:
        logger.error(f'PayPal refund failed for {gateway_payment_id}: {e}')
        raise ValueError(f'PAYPAL_REFUND_ERROR: {str(e)}')
