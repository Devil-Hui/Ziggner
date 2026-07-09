"""
Stripe Checkout Session gateway.
Creates Stripe-hosted Checkout pages, verifies webhooks via SDK.
"""
import logging

import stripe
from django.conf import settings

logger = logging.getLogger('biz')


def create_checkout_session(payment_no: str, currency: str, amount: float,
                            product_name: str, success_url: str, cancel_url: str) -> dict:
    """Create a Stripe Checkout Session for a single payment."""
    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    # 沙箱/未配置凭证时返回 mock 支付页，避免对外网网关的硬依赖导致 500
    if not stripe.api_key:
        logger.warning(f'Stripe secret key not configured; returning mock pay_url for {payment_no}')
        return {
            'gateway_id': f'mock-{payment_no}',
            'pay_url': f'/mock-payment/{payment_no}',
        }
    unit_amount = int(round(float(amount) * 100))

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency.lower(),
                    'product_data': {'name': product_name},
                    'unit_amount': unit_amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={'payment_no': payment_no},
        )
        logger.info(f'Stripe session created: {session.id} for {payment_no}')
        return {
            'gateway_id': session.id,
            'pay_url': session.url,
        }
    except stripe.error.StripeError as e:
        logger.error(f'Stripe session creation failed for {payment_no}: {e}')
        raise ValueError(f'STRIPE_ERROR: {e.user_message if hasattr(e, "user_message") else str(e)}')


def retrieve_payment_intent(gateway_payment_id: str) -> dict:
    """Retrieve payment status from Stripe."""
    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    try:
        session = stripe.checkout.Session.retrieve(gateway_payment_id)
        pi_id = session.get('payment_intent')
        if pi_id:
            pi = stripe.PaymentIntent.retrieve(pi_id)
            return {
                'status': pi.status,
                'amount': pi.amount / 100.0,
                'currency': pi.currency,
            }
        return {'status': session.get('payment_status', 'unknown')}
    except stripe.error.StripeError as e:
        logger.warning(f'Stripe retrieve failed for {gateway_payment_id}: {e}')
        return {'status': 'unknown'}


def verify_webhook_signature(raw_body: str, signature: str) -> bool:
    """Verify Stripe webhook using SDK construct_event."""
    try:
        stripe.Webhook.construct_event(
            raw_body, signature,
            getattr(settings, 'STRIPE_WEBHOOK_SECRET', ''),
        )
        return True
    except (stripe.error.SignatureVerificationError, ValueError) as e:
        logger.warning(f'Stripe webhook signature invalid: {e}')
        return False


def create_refund(gateway_payment_id: str, amount: float, currency: str, reason: str = '') -> dict:
    """Create a Stripe Refund for a completed PaymentIntent."""
    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    try:
        # Retrieve PaymentIntent ID from the Checkout Session
        session = stripe.checkout.Session.retrieve(gateway_payment_id)
        pi_id = session.get('payment_intent')
        if not pi_id:
            raise ValueError('STRIPE_NO_PAYMENT_INTENT')

        refund = stripe.Refund.create(
            payment_intent=pi_id,
            amount=int(round(float(amount) * 100)),
            reason='requested_by_customer',
            metadata={'reason': reason},
        )
        logger.info(f'Stripe refund created: {refund.id} for PI {pi_id}')
        return {
            'gateway_refund_id': refund.id,
            'status': refund.status,
            'amount': refund.amount / 100.0,
            'currency': refund.currency,
        }
    except stripe.error.StripeError as e:
        logger.error(f'Stripe refund failed for {gateway_payment_id}: {e}')
        raise ValueError(f'STRIPE_REFUND_ERROR: {e.user_message if hasattr(e, "user_message") else str(e)}')
