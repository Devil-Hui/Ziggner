import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.db import transaction as db_transaction
from django.core.cache import cache

from apps.order.models import Order, OrderStatus
from payment.gateways.paypal import create_order, retrieve_order
from payment.gateways.stripe import create_checkout_session, retrieve_payment_intent

from .models import PaymentLog, PaymentMethod, PaymentStatus, RefundLog

logger = logging.getLogger(__name__)

_IDEMPOTENT_TTL = 86400 * 7  # 7 天


class PaymentService:

    # ==================== 发起支付 ====================

    @staticmethod
    def create_payment(user, order_no: str, method: str,
                       success_url: str = '', cancel_url: str = '') -> dict:
        """
        发起支付。校验：
        1. 支付方式合法
        2. 订单存在且属于当前用户
        3. 订单未支付、未取消
        4. 同一订单已有 pending 支付时复用（防重复）
        """
        method = method.lower()
        if method not in PaymentMethod.values:
            raise ValueError(f'UNSUPPORTED_METHOD: {method}')

        with db_transaction.atomic():
            order = Order.objects.select_for_update().filter(
                user=user, order_no=order_no,
            ).first()
            if not order:
                raise ValueError('ORDER_NOT_FOUND')

            # 已支付 → 拒绝
            if order.payment_status == 'paid':
                raise ValueError('ORDER_ALREADY_PAID')

            # 已取消 → 拒绝
            if order.status == OrderStatus.CANCELLED:
                raise ValueError('ORDER_CANCELLED')

            # 只有待支付状态才能发起支付
            if order.status != OrderStatus.PENDING_PAYMENT:
                raise ValueError('ORDER_STATUS_INVALID')

            # 防重复：同一订单已有 pending 支付，直接返回
            existing = PaymentLog.objects.filter(
                order=order, status=PaymentStatus.PENDING,
            ).first()
            if existing:
                return {
                    'payment_no': existing.payment_no,
                    'pay_url': existing.gateway_data.get('pay_url'),
                    'client_secret': existing.gateway_data.get('client_secret'),
                }

            payment = PaymentLog.objects.create(
                user=user, order=order,
                currency=order.currency, amount=order.actual_amount,
                method=method, status=PaymentStatus.PENDING,
            )

            gateway_result = PaymentService._create_gateway_payment(
                payment, success_url, cancel_url,
            )

            payment.gateway_payment_id = gateway_result.get('gateway_id', '')
            payment.gateway_data = gateway_result
            payment.save(update_fields=['gateway_payment_id', 'gateway_data'])

        logger.info(
            f'Payment created: {payment.payment_no} '
            f'[{method}] {order.currency} {order.actual_amount}'
        )
        return {
            'payment_no': payment.payment_no,
            'pay_url': gateway_result.get('pay_url'),
            'client_secret': gateway_result.get('client_secret'),
        }

    # ==================== Webhook 回调 ====================

    @staticmethod
    def handle_webhook(gateway: str, raw_body: str, signature: str, headers: dict = None) -> dict:
        """
        支付网关异步回调。安全措施：
        1. 签名验证（防伪造）— PayPal v1 API 证书链验证 / Alipay RSA-SHA256
        2. 幂等处理（防重复）
        3. 币种 + 金额校验（防篡改）
        4. 行级锁（防并发）
        """
        # 1. 验签
        if not PaymentService._verify_signature(gateway, raw_body, signature, headers):
            logger.warning(f'[{gateway}] Invalid webhook signature')
            raise ValueError('INVALID_SIGNATURE')

        # 2. 解析 body
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            raise ValueError('INVALID_BODY')

        gateway_payment_id = PaymentService._extract_gateway_id(gateway, payload)
        event_type = PaymentService._extract_event(gateway, payload)

        if not gateway_payment_id:
            raise ValueError('INVALID_PAYLOAD')

        # 3. 幂等
        idempotent_key = f'webhook:{gateway}:{gateway_payment_id}:{event_type}'
        if cache.get(idempotent_key):
            return {'status': 'duplicate', 'gateway_payment_id': gateway_payment_id}
        cache.set(idempotent_key, 1, _IDEMPOTENT_TTL)

        with db_transaction.atomic():
            # 4. 行级锁
            payment = PaymentLog.objects.select_for_update().select_related('order').filter(
                gateway_payment_id=gateway_payment_id,
            ).first()

            if not payment:
                raise ValueError('PAYMENT_NOT_FOUND')

            # 已成功则跳过
            if payment.status == PaymentStatus.SUCCESS:
                return {'status': 'already_processed', 'payment_no': payment.payment_no}

            # 5. 币种 + 金额校验
            gateway_amount, gateway_currency = PaymentService._extract_amount(gateway, payload)
            if gateway_amount is not None and gateway_currency:
                if gateway_currency.upper() != payment.currency.upper():
                    logger.error(
                        f'[{gateway}] Currency mismatch: '
                        f'gateway={gateway_currency}, order={payment.currency}'
                    )
                    raise ValueError('CURRENCY_MISMATCH')
                if abs(float(gateway_amount) - float(payment.amount)) > 0.01:
                    logger.error(
                        f'[{gateway}] Amount mismatch: '
                        f'gateway={gateway_amount}, order={payment.amount}'
                    )
                    raise ValueError('AMOUNT_MISMATCH')

            # 6. 更新状态
            payment.gateway_data = {**payment.gateway_data, 'webhook': payload}

            if event_type == 'payment_completed':
                payment.status = PaymentStatus.SUCCESS
                payment.save()
                payment.order.pay(payment_method=payment.method)
            elif event_type == 'payment_failed':
                payment.status = PaymentStatus.FAILED
                payment.save()
            elif event_type == 'refund_completed':
                payment.status = PaymentStatus.REFUNDED
                payment.save()
            else:
                payment.save(update_fields=['gateway_data'])

        logger.info(f'[{gateway}] Webhook: {gateway_payment_id} → {payment.status}')
        return {'status': payment.status, 'payment_no': payment.payment_no}

    # ==================== 状态查询 ====================

    @staticmethod
    def get_status(user, order_no: str) -> dict:
        payment = PaymentLog.objects.filter(
            user=user, order__order_no=order_no,
        ).order_by('-created_at').first()
        if not payment:
            return {
                'paid': False, 'status': None,
                'method': None, 'payment_no': None,
                'amount': None, 'currency': None,
            }
        return {
            'paid': payment.status == PaymentStatus.SUCCESS,
            'status': payment.status,
            'method': payment.method,
            'payment_no': payment.payment_no,
            'amount': float(payment.amount),
            'currency': payment.currency,
        }

    # ==================== 退款 ====================

    @staticmethod
    def create_refund(user, order_no: str, reason: str = '', amount=None) -> dict:
        """
        发起退款。校验：
        1. 订单存在且属于当前用户
        2. 订单已支付
        3. 有对应的成功支付记录
        4. 退款金额不超过支付金额
        """
        with db_transaction.atomic():
            payment = PaymentLog.objects.select_for_update().select_related('order').filter(
                user=user, order__order_no=order_no, status=PaymentStatus.SUCCESS,
            ).first()
            if not payment:
                raise ValueError('PAYMENT_NOT_FOUND_OR_NOT_PAID')

            order = payment.order
            if order.payment_status in ('refunding', 'refunded'):
                raise ValueError('ORDER_ALREADY_REFUNDED')

            refund_amount = float(amount) if amount is not None else float(payment.amount)
            if refund_amount > float(payment.amount):
                raise ValueError('REFUND_AMOUNT_EXCEEDED')

            # Mark as refunding
            order.payment_status = 'refunding'
            order.save(update_fields=['payment_status'])

            refund = RefundLog.objects.create(
                payment=payment,
                amount=refund_amount,
                reason=reason,
                status='pending',
            )

        # Call gateway refund API
        try:
            gateway_result = PaymentService._create_gateway_refund(
                payment, refund_amount, reason,
            )
            refund.gateway_refund_id = gateway_result.get('gateway_refund_id', '')
            refund.gateway_data = gateway_result
            refund.status = 'success'
            refund.save()

            # Update payment and order status
            payment.status = PaymentStatus.REFUNDED
            payment.save(update_fields=['status'])
            order.payment_status = 'refunded'
            order.save(update_fields=['payment_status'])

            logger.info(
                f'Refund processed: {refund.refund_no} '
                f'payment={payment.payment_no} amount={refund_amount}'
            )
        except Exception as e:
            refund.status = 'failed'
            refund.gateway_data = {'error': str(e)}
            refund.save()
            order.payment_status = 'paid'  # revert
            order.save(update_fields=['payment_status'])
            logger.error(f'Refund failed: {refund.refund_no} error={e}')
            raise

        return {
            'refund_no': refund.refund_no,
            'amount': float(refund.amount),
            'status': refund.status,
            'gateway_refund_id': refund.gateway_refund_id,
        }

    @staticmethod
    def _create_gateway_refund(payment, amount: float, reason: str) -> dict:
        """Call the appropriate gateway refund API."""
        if payment.method == PaymentMethod.STRIPE:
            from payment.gateways.stripe import create_refund
            return create_refund(payment.gateway_payment_id, amount, payment.currency, reason)
        elif payment.method == PaymentMethod.PAYPAL:
            from payment.gateways.paypal import create_refund
            return create_refund(payment.gateway_payment_id, amount, payment.currency, reason)
        elif payment.method == PaymentMethod.ALIPAY:
            # Alipay refund not implemented yet
            raise ValueError('ALIPAY_REFUND_NOT_SUPPORTED')
        raise ValueError(f'UNSUPPORTED_REFUND_METHOD: {payment.method}')

    # ==================== 补偿任务 ====================

    @staticmethod
    def sync_expired_payments():
        """
        轮询超过 N 分钟仍未完成的支付，向网关查询最新状态。
        用于 webhook 丢失/延迟的补偿。由 Celery Beat 定时调用。
        """
        from django.utils import timezone
        cutoff = timezone.now() - timezone.timedelta(minutes=15)

        pending = PaymentLog.objects.filter(
            status=PaymentStatus.PENDING,
            created_at__lt=cutoff,
        ).exclude(gateway_payment_id='')

        for payment in pending:
            try:
                PaymentService._query_gateway_status(payment)
            except Exception:
                logger.exception(
                    f'Sync failed for payment {payment.payment_no}'
                )

    @staticmethod
    def _query_gateway_status(payment):
        """向网关查询支付状态并同步"""
        if payment.method == PaymentMethod.STRIPE:
            result = retrieve_payment_intent(payment.gateway_payment_id)
        elif payment.method == PaymentMethod.PAYPAL:
            result = retrieve_order(payment.gateway_payment_id)
        else:
            return
        if result.get('status') == 'succeeded':
            payment.status = PaymentStatus.SUCCESS
            payment.save()
            payment.order.pay(payment_method=payment.method)
        elif result.get('status') in ('cancelled', 'failed'):
            payment.status = PaymentStatus.FAILED
            payment.save()

    # ==================== 网关适配层 ====================

    @staticmethod
    def _create_gateway_payment(payment, success_url: str, cancel_url: str) -> dict:
        """Create real payment via Stripe or PayPal gateway."""
        product_name = f'Order {payment.order.order_no}'
        if payment.method == PaymentMethod.STRIPE:
            return create_checkout_session(
                payment.payment_no, payment.currency, payment.amount,
                product_name, success_url, cancel_url,
            )
        elif payment.method == PaymentMethod.PAYPAL:
            return create_order(
                payment.payment_no, payment.currency, payment.amount,
                product_name, success_url, cancel_url,
            )
        return {}

    @staticmethod
    def _verify_signature(gateway: str, body: str, signature: str, headers: dict = None) -> bool:
        if not signature:
            return False
        headers = headers or {}
        if gateway == 'stripe':
            try:
                import stripe
                stripe.Webhook.construct_event(
                    body, signature, getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
                )
                return True
            except Exception as e:
                logger.error(f'[stripe] Signature failed: {e}')
                return False
        if gateway == 'paypal':
            from payment.gateways.paypal import verify_webhook_signature
            return verify_webhook_signature(
                raw_body=body,
                transmission_id=headers.get('HTTP_PAYPAL_TRANSMISSION_ID', ''),
                transmission_time=headers.get('HTTP_PAYPAL_TRANSMISSION_TIME', ''),
                transmission_sig=headers.get('HTTP_PAYPAL_TRANSMISSION_SIG', ''),
                cert_url=headers.get('HTTP_PAYPAL_CERT_URL', ''),
                auth_algo=headers.get('HTTP_PAYPAL_AUTH_ALGO', ''),
            )
        if gateway == 'alipay':
            from payment.gateways.alipay import verify_signature, extract_params_from_body, verify_notify_id
            params = extract_params_from_body(body)
            sign = params.get('sign', '') or signature
            notify_id = params.get('notify_id', '')
            # RSA signature verification
            if not verify_signature(params, sign):
                return False
            # Anti-replay: verify notify_id
            if notify_id and not verify_notify_id(notify_id):
                return False
            return True
        return False

    @staticmethod
    def _extract_gateway_id(gateway: str, payload: dict) -> str:
        if gateway == 'stripe':
            return ((payload.get('data') or {}).get('object') or {}).get('id', '')
        if gateway == 'paypal':
            return (payload.get('resource') or {}).get('id', '')
        if gateway == 'alipay':
            return payload.get('trade_no', '')
        return ''

    @staticmethod
    def _extract_event(gateway: str, payload: dict) -> str:
        event = {
            'stripe': payload.get('type', ''),
            'paypal': payload.get('event_type', ''),
            'alipay': payload.get('trade_status', ''),
        }.get(gateway, '')

        e = event.lower()
        if any(s in e for s in ('succeeded', 'completed', 'success', 'capture')):
            return 'payment_completed'
        if any(s in e for s in ('failed', 'denied', 'cancelled')):
            return 'payment_failed'
        if any(s in e for s in ('refund', 'reversed')):
            return 'refund_completed'
        return event

    @staticmethod
    def _extract_amount(gateway: str, payload: dict) -> tuple:
        if gateway == 'stripe':
            obj = (payload.get('data') or {}).get('object') or {}
            cents = obj.get('amount', 0)
            return (float(cents) / 100.0 if cents else None), (obj.get('currency') or '').upper() or None
        if gateway == 'paypal':
            amt = (payload.get('resource') or {}).get('amount') or {}
            return (float(amt.get('value', 0)) if amt else None), (amt.get('currency_code') or '').upper() or None
        if gateway == 'alipay':
            return (float(payload['total_amount']) if payload.get('total_amount') else None), \
                   (payload.get('currency') or '').upper() or None
        return None, None
