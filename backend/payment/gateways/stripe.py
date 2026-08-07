"""
Stripe Checkout Session gateway.
Implements BasePaymentGateway interface.
"""
import logging
from decimal import Decimal

import stripe
from django.conf import settings

from payment.gateways.base import (
    BasePaymentGateway,
    GatewayRefundRejectedError,
    GatewayRefundUnknownError,
    PaymentGatewayFactory,
)

logger = logging.getLogger('biz')


@PaymentGatewayFactory.register('stripe')
class StripeGateway(BasePaymentGateway):
    """Stripe 支付网关"""

    def create_payment(self, payment_no: str, currency: str, amount: float,
                       product_name: str, success_url: str, cancel_url: str) -> dict:
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        if not stripe.api_key:
            raise ValueError('GATEWAY_NOT_CONFIGURED: stripe')

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
            return {'gateway_id': session.id, 'pay_url': session.url}
        except stripe.error.StripeError as e:
            logger.error(f'Stripe session creation failed for {payment_no}: {e}')
            raise ValueError(f'STRIPE_ERROR: {e.user_message if hasattr(e, "user_message") else str(e)}')

    def retrieve_payment(self, gateway_payment_id: str) -> dict:
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        try:
            session = stripe.checkout.Session.retrieve(gateway_payment_id)
            pi_id = session.get('payment_intent')
            if pi_id:
                pi = stripe.PaymentIntent.retrieve(pi_id)
                return {'status': pi.status, 'amount': pi.amount / 100.0, 'currency': pi.currency}
            return {'status': session.get('payment_status', 'unknown')}
        except stripe.error.StripeError as e:
            logger.warning(f'Stripe retrieve failed for {gateway_payment_id}: {e}')
            return {'status': 'unknown'}

    def verify_webhook(self, raw_body: str, signature: str, headers: dict = None) -> bool:
        try:
            stripe.Webhook.construct_event(
                raw_body, signature,
                getattr(settings, 'STRIPE_WEBHOOK_SECRET', ''),
            )
            return True
        except (stripe.error.SignatureVerificationError, ValueError) as e:
            logger.warning(f'Stripe webhook signature invalid: {e}')
            return False

    def create_refund(
        self,
        gateway_payment_id: str,
        amount: Decimal,
        currency: str,
        reason: str = '',
        idempotency_key: str = '',
    ) -> dict:
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        try:
            session = stripe.checkout.Session.retrieve(gateway_payment_id)
            pi_id = session.get('payment_intent')
            if not pi_id:
                raise ValueError('STRIPE_NO_PAYMENT_INTENT')

            refund = stripe.Refund.create(
                payment_intent=pi_id,
                amount=int(amount * 100),
                reason='requested_by_customer',
                metadata={'reason': reason},
                idempotency_key=idempotency_key,
            )
            logger.info(f'Stripe refund created: {refund.id} for PI {pi_id}')
            return {
                'gateway_refund_id': refund.id,
                'status': refund.status,
                'amount': f'{Decimal(refund.amount) / 100:.2f}',
                'currency': refund.currency,
            }
        except stripe.error.InvalidRequestError as e:
            logger.error(f'Stripe refund failed for {gateway_payment_id}: {e}')
            raise GatewayRefundRejectedError(
                f'STRIPE_REFUND_REJECTED: {e.user_message if hasattr(e, "user_message") else str(e)}'
            ) from e
        except stripe.error.StripeError as e:
            logger.error(f'Stripe refund outcome unknown for {gateway_payment_id}: {e}')
            raise GatewayRefundUnknownError(f'STRIPE_REFUND_UNKNOWN: {e}') from e

    def query_refund(self, gateway_request_id: str, gateway_refund_id: str = '') -> dict:
        if not gateway_refund_id:
            return {'status': 'unavailable'}
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        try:
            refund = stripe.Refund.retrieve(gateway_refund_id)
            return {
                'gateway_refund_id': refund.id,
                'status': refund.status,
                'amount': f'{Decimal(refund.amount) / 100:.2f}',
                'currency': refund.currency,
            }
        except stripe.error.StripeError:
            logger.exception('Stripe refund query failed: %s', gateway_refund_id)
            return {'status': 'unavailable'}
