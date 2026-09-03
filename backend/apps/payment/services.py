import hashlib
import hmac
import json
import logging
import re
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction as db_transaction
from django.db import IntegrityError
from django.db.models import Sum
from django.utils import timezone

from apps.order.models import (
    AfterSale,
    AfterSaleStatus,
    Order,
    OrderStatus,
    PaymentStatus as OrderPaymentStatus,
)
from payment.gateways.base import GatewayRefundRejectedError, PaymentGatewayFactory

from .models import (
    PaymentEvent,
    PaymentLog,
    PaymentMethod,
    PaymentStatus,
    RefundLog,
    RefundStatus,
)

logger = logging.getLogger(__name__)

_IDEMPOTENT_TTL = 86400 * 7  # 7 天


class PaymentService:

    @staticmethod
    def simulate_mock_payment(user, payment_no: str, scenario: str) -> dict:
        if not settings.ENABLE_MOCK_PAYMENT:
            raise ValueError('MOCK_PAYMENT_UNAVAILABLE')
        if scenario not in {'success', 'failure', 'cancel', 'timeout'}:
            raise ValueError('MOCK_SCENARIO_INVALID')

        payment = PaymentLog.objects.filter(
            user=user,
            payment_no=payment_no,
            method='mock',
        ).first()
        if not payment:
            raise ValueError('PAYMENT_NOT_FOUND')

        payload = {
            'gateway_payment_id': payment.gateway_payment_id,
            'event_id': f'mock-simulator:{payment.payment_no}:{scenario}',
            'scenario': scenario,
            'amount': str(payment.amount),
            'currency': payment.currency,
        }
        raw_body = json.dumps(payload, separators=(',', ':'))
        signature = hmac.new(
            settings.MOCK_PAYMENT_SECRET.encode(),
            raw_body.encode(),
            hashlib.sha256,
        ).hexdigest()
        return PaymentService.handle_webhook('mock', raw_body, signature)

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
            # 但超过 PENDING_TTL 的 pending 视为过期，允许重新发起（避免用户永远无法重试）
            from django.utils import timezone
            pending_ttl = getattr(settings, 'PAYMENT_PENDING_TTL_MINUTES', 15)
            existing = PaymentLog.objects.filter(
                order=order, status=PaymentStatus.PENDING,
            ).first()
            if existing:
                is_expired = (
                    timezone.now() - existing.created_at
                ) > timezone.timedelta(minutes=pending_ttl)
                if not is_expired:
                    return {
                        'payment_no': existing.payment_no,
                        'pay_url': existing.gateway_data.get('pay_url'),
                        'client_secret': existing.gateway_data.get('client_secret'),
                    }
                # 过期：标记为过期，允许重新发起
                existing.status = PaymentStatus.CANCELLED
                existing.save(update_fields=['status'])

            payment = PaymentLog.objects.create(
                user=user, order=order,
                currency=order.currency, amount=order.actual_amount,
                method=method, status=PaymentStatus.PENDING,
            )

        try:
            gateway_result = PaymentService._create_gateway_payment(
                payment, success_url, cancel_url,
            )
            if not isinstance(gateway_result, dict):
                raise ValueError('GATEWAY_RESPONSE_INVALID')
        except Exception:
            PaymentLog.objects.filter(
                pk=payment.pk,
                status=PaymentStatus.PENDING,
                gateway_payment_id='',
            ).update(status=PaymentStatus.FAILED)
            raise

        with db_transaction.atomic():
            payment = PaymentLog.objects.select_for_update().get(pk=payment.pk)
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
        event_id = PaymentService._extract_event_id(gateway, payload)

        if not gateway_payment_id or not event_id:
            raise ValueError('INVALID_PAYLOAD')

        late_refund_id = None
        with db_transaction.atomic():
            if PaymentEvent.objects.filter(gateway=gateway, event_id=event_id).exists():
                return {'status': 'duplicate', 'gateway_payment_id': gateway_payment_id}
            payment = PaymentLog.objects.select_for_update().select_related('order').filter(
                gateway_payment_id=gateway_payment_id, method=gateway,
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
                # 金额比较用 Decimal：float 二进制误差（0.1+0.2≠0.3）可能造成临界金额误判
                try:
                    gateway_amount_dec = Decimal(str(gateway_amount))
                except ArithmeticError:
                    logger.error('Unparseable gateway amount: %s', gateway_amount)
                    raise ValueError('AMOUNT_MISMATCH')
                if abs(gateway_amount_dec - payment.amount) > Decimal('0.01'):
                    logger.error(
                        f'[{gateway}] Amount mismatch: '
                        f'gateway={gateway_amount}, order={payment.amount}'
                    )
                    raise ValueError('AMOUNT_MISMATCH')

            # 幂等落库：并发下两个相同 event_id 的请求可能同时通过 exists() 检查，
            # 靠 PaymentEvent 的 (gateway, event_id) 唯一约束兜底。
            # 捕获 IntegrityError 并返回 duplicate，避免 500。
            try:
                PaymentEvent.objects.create(
                    gateway=gateway,
                    event_id=event_id,
                    event_type=event_type,
                    payment=payment,
                    payload=payload,
                )
            except IntegrityError:
                logger.warning(
                    f'[{gateway}] Duplicate event_id={event_id} (concurrent) '
                    f'for payment {payment.payment_no}'
                )
                return {'status': 'duplicate', 'gateway_payment_id': gateway_payment_id}

            # 6. 更新状态
            payment.gateway_data = {**payment.gateway_data, 'webhook': payload}

            if event_type == 'payment_completed':
                payment.status = PaymentStatus.SUCCESS
                payment.save()
                if payment.order.status == OrderStatus.CANCELLED:
                    payment.order.payment_status = OrderPaymentStatus.REFUNDING
                    payment.order.save(update_fields=['payment_status'])
                    late_refund, _created = RefundLog.objects.get_or_create(
                        payment=payment,
                        idempotency_key=f'late-payment:{payment.payment_no}',
                        defaults={
                            'amount': payment.amount,
                            'reason': 'Automatic refund for payment received after order cancellation',
                            'status': RefundStatus.PENDING,
                        },
                    )
                    late_refund_id = late_refund.pk
                else:
                    payment.order.pay(
                        payment_method=payment.method,
                        payment_no=payment.payment_no,
                    )
            elif event_type == 'payment_failed':
                payment.status = PaymentStatus.FAILED
                payment.save()
            elif event_type == 'payment_cancelled':
                payment.status = PaymentStatus.CANCELLED
                payment.save()
            elif event_type == 'refund_completed':
                payment.status = PaymentStatus.REFUNDED
                payment.save()
            else:
                payment.save(update_fields=['gateway_data'])

        logger.info(f'[{gateway}] Webhook: {gateway_payment_id} → {payment.status}')
        if late_refund_id is not None:
            try:
                late_refund = PaymentService._process_reserved_refund(late_refund_id)
            except ValueError as exc:
                logger.error(
                    'Automatic late-payment refund failed: refund_id=%s error=%s',
                    late_refund_id,
                    exc,
                )
                late_refund = RefundLog.objects.get(pk=late_refund_id)
            return PaymentService._refund_result(late_refund)
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
        # 待支付状态时主动向网关查询最新状态（兼容 Webhook 未配置/延迟场景），
        # 确保"收款到账后再返回状态"。
        # 节流：同一支付在 GATEWAY_QUERY_INTERVAL 秒内不重复查询网关，
        # 避免用户高频轮询状态时频繁消耗网关 API 配额（防 DoS / 防网关限流）。
        if payment.status == PaymentStatus.PENDING and payment.gateway_payment_id:
            query_interval = getattr(settings, 'PAYMENT_GATEWAY_QUERY_INTERVAL', 30)
            last_query = payment.gateway_data.get('last_status_query_at')
            should_query = True
            if last_query:
                from django.utils import timezone
                try:
                    from datetime import datetime
                    last_dt = datetime.fromisoformat(last_query)
                    if (timezone.now() - last_dt).total_seconds() < query_interval:
                        should_query = False
                except (ValueError, TypeError):
                    should_query = True
            if should_query:
                try:
                    PaymentService._query_gateway_status(payment)
                    payment.refresh_from_db()
                    # 记录本次查询时间，用于节流
                    payment.gateway_data = {
                        **payment.gateway_data,
                        'last_status_query_at': timezone.now().isoformat(),
                    }
                    payment.save(update_fields=['gateway_data'])
                except Exception:
                    logger.exception(f'get_status: gateway query failed for {payment.payment_no}')
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
    def _is_admin_user(user) -> bool:
        """管理角色判断：超管/管理组长/组员可豁免售后门控（线下协商退款等场景）。"""
        if getattr(user, 'is_superuser', False):
            return True
        try:
            from apps.rbac.constants import Role
            from apps.rbac.services import has_role
        except Exception:  # pragma: no cover - rbac 不可用时退化为超管判断
            return False
        return any(
            has_role(user, r)
            for r in (Role.SUPERADMIN.value, Role.ADMIN_LEADER.value, Role.ADMIN_MEMBER.value)
        )

    @staticmethod
    def create_refund(
        user,
        order_no: str,
        reason: str = '',
        amount=None,
        idempotency_key: str | None = None,
    ) -> dict:
        """
        发起退款。校验：
        1. 订单存在且属于当前用户
        2. 订单已支付
        3. 有对应的成功支付记录
        4. 退款金额不超过支付金额
        """
        idempotency_key = PaymentService._normalize_refund_idempotency_key(idempotency_key)
        with db_transaction.atomic():
            # 归属过滤：普通用户只能退自己的支付单（IDOR 防护）；
            # 管理员豁免（线下协商退款），可按订单号定位任意支付单。
            is_admin = PaymentService._is_admin_user(user)
            payment_q = PaymentLog.objects.select_for_update().select_related('order').filter(
                order__order_no=order_no,
                status__in=(PaymentStatus.SUCCESS, PaymentStatus.REFUNDED),
            )
            if not is_admin:
                payment_q = payment_q.filter(user=user)
            payment = payment_q.first()
            if not payment:
                raise ValueError('PAYMENT_NOT_FOUND_OR_NOT_PAID')

            # ── 退款安全门控（与"真收款才发货"同一严谨级别）──
            # 真实退款必须先有已批准/已完成的售后单（管理员审核通过），
            # 防止买家收货后绕过售后审核直接自退全款（退钱不退货）。
            # 管理角色豁免，覆盖线下协商退款场景。
            if not is_admin:
                has_approved_after_sale = AfterSale.objects.filter(
                    order=payment.order,
                    status__in=(AfterSaleStatus.APPROVED, AfterSaleStatus.COMPLETED),
                ).exists()
                if not has_approved_after_sale:
                    logger.warning(
                        'Refund blocked: no approved after-sale for order=%s user=%s',
                        payment.order.order_no, getattr(user, 'pk', None),
                    )
                    raise ValueError('REFUND_REQUIRES_APPROVED_AFTER_SALE')

            order = payment.order
            existing = RefundLog.objects.filter(
                payment=payment,
                idempotency_key=idempotency_key,
            ).first()
            if existing:
                return PaymentService._refund_result(existing)

            if payment.status == PaymentStatus.REFUNDED or order.payment_status == OrderPaymentStatus.REFUNDED:
                raise ValueError('ORDER_ALREADY_REFUNDED')

            reserved_amount = RefundLog.objects.filter(
                payment=payment,
                status__in=(
                    RefundStatus.PENDING,
                    RefundStatus.UNKNOWN,
                    RefundStatus.SUCCEEDED,
                    'processing',
                    'success',
                ),
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            remaining_amount = payment.amount - reserved_amount
            refund_amount = Decimal(str(amount)) if amount is not None else remaining_amount
            if refund_amount <= Decimal('0.00'):
                raise ValueError('REFUND_AMOUNT_INVALID')
            if refund_amount > remaining_amount:
                raise ValueError('REFUND_AMOUNT_EXCEEDED')

            # Mark as refunding
            order.payment_status = OrderPaymentStatus.REFUNDING
            order.save(update_fields=['payment_status'])

            refund = RefundLog.objects.create(
                payment=payment,
                amount=refund_amount,
                reason=reason,
                status=RefundStatus.PENDING,
                idempotency_key=idempotency_key,
            )

        refund = PaymentService._process_reserved_refund(refund.pk)
        return PaymentService._refund_result(refund)

    @staticmethod
    def _process_reserved_refund(refund_id: int):
        refund = RefundLog.objects.select_related('payment').get(pk=refund_id)
        if refund.status != RefundStatus.PENDING:
            return refund
        payment = refund.payment

        try:
            gateway_result = PaymentService._create_gateway_refund(
                payment,
                refund.amount,
                refund.reason,
                refund.gateway_request_id,
            )
        except ValueError as exc:
            PaymentService._finalize_refund(
                refund.pk,
                RefundStatus.FAILED,
                {'error': str(exc)},
            )
            raise
        except Exception as exc:
            logger.warning(
                'Refund outcome unknown: %s error=%s',
                refund.refund_no,
                exc,
            )
            refund = PaymentService._finalize_refund(
                refund.pk,
                RefundStatus.UNKNOWN,
                {'error': str(exc)},
            )
        else:
            if not isinstance(gateway_result, dict):
                gateway_result = {
                    'status': 'unknown',
                    'error': 'GATEWAY_REFUND_RESPONSE_INVALID',
                }
            final_status = PaymentService._classify_refund_result(refund, gateway_result)
            refund = PaymentService._finalize_refund(refund.pk, final_status, gateway_result)

        return refund

    @staticmethod
    def _create_gateway_refund(
        payment,
        amount: Decimal,
        reason: str,
        idempotency_key: str,
    ) -> dict:
        """Call the appropriate gateway refund API via factory."""
        gateway = PaymentGatewayFactory.get_gateway(payment.method)
        return gateway.create_refund(
            payment.gateway_payment_id,
            amount,
            payment.currency,
            reason,
            idempotency_key=idempotency_key,
        )

    @staticmethod
    def _normalize_refund_idempotency_key(value) -> str:
        if value is None or not str(value).strip():
            # Compatibility for older internal callers. API clients should send a stable key.
            return f'legacy-{uuid.uuid4().hex}'
        value = str(value)
        if value != value.strip():
            raise ValueError('REFUND_IDEMPOTENCY_KEY_INVALID')
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:-]{0,127}', value):
            raise ValueError('REFUND_IDEMPOTENCY_KEY_INVALID')
        return value

    @staticmethod
    def _classify_refund_result(refund, gateway_result: dict) -> str:
        if not isinstance(gateway_result, dict):
            return RefundStatus.UNKNOWN
        gateway_status = str(gateway_result.get('status', '')).lower()
        if gateway_status in ('failed', 'rejected', 'cancelled', 'canceled'):
            return RefundStatus.FAILED
        if gateway_status not in ('success', 'succeeded', 'completed'):
            return RefundStatus.UNKNOWN
        try:
            gateway_amount = Decimal(str(gateway_result.get('amount')))
        except (ArithmeticError, TypeError, ValueError):
            return RefundStatus.UNKNOWN
        gateway_currency = str(gateway_result.get('currency', '')).upper()
        if gateway_amount != refund.amount or gateway_currency != refund.payment.currency.upper():
            return RefundStatus.UNKNOWN
        return RefundStatus.SUCCEEDED

    @staticmethod
    def _finalize_refund(refund_id: int, status: str, gateway_data: dict):
        if not isinstance(gateway_data, dict):
            gateway_data = {'status': 'unknown', 'error': 'GATEWAY_REFUND_RESPONSE_INVALID'}
        with db_transaction.atomic():
            refund = RefundLog.objects.select_for_update().select_related(
                'payment__order',
            ).get(pk=refund_id)
            if refund.status in (RefundStatus.SUCCEEDED, RefundStatus.FAILED, 'success'):
                return refund

            payment = refund.payment
            order = payment.order
            refund.status = status
            refund.gateway_refund_id = gateway_data.get(
                'gateway_refund_id',
                refund.gateway_refund_id,
            )
            refund.gateway_data = gateway_data
            refund.save(update_fields=[
                'status',
                'gateway_refund_id',
                'gateway_data',
                'updated_at',
            ])

            if status == RefundStatus.SUCCEEDED:
                succeeded_amount = RefundLog.objects.filter(
                    payment=payment,
                    status__in=(RefundStatus.SUCCEEDED, 'success'),
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                full_refund = succeeded_amount >= payment.amount
                if full_refund:
                    payment.status = PaymentStatus.REFUNDED
                    payment.save(update_fields=['status'])
                    order.payment_status = OrderPaymentStatus.REFUNDED
                    order.save(update_fields=['payment_status'])
                    from apps.promotion.services import PromotionService
                    PromotionService.return_for_refund(order.order_no, full_refund=True)
                elif RefundLog.objects.filter(
                    payment=payment,
                    status__in=(RefundStatus.PENDING, RefundStatus.UNKNOWN, 'processing'),
                ).exists():
                    order.payment_status = OrderPaymentStatus.REFUNDING
                    order.save(update_fields=['payment_status'])
                else:
                    order.payment_status = OrderPaymentStatus.PARTIALLY_REFUNDED
                    order.save(update_fields=['payment_status'])
            elif status == RefundStatus.UNKNOWN:
                order.payment_status = OrderPaymentStatus.REFUNDING
                order.save(update_fields=['payment_status'])
            elif status == RefundStatus.FAILED:
                still_reserved = RefundLog.objects.filter(
                    payment=payment,
                    status__in=(RefundStatus.PENDING, RefundStatus.UNKNOWN, 'processing'),
                ).exists()
                succeeded_exists = RefundLog.objects.filter(
                    payment=payment,
                    status__in=(RefundStatus.SUCCEEDED, 'success'),
                ).exists()
                if still_reserved:
                    order.payment_status = OrderPaymentStatus.REFUNDING
                elif succeeded_exists:
                    order.payment_status = OrderPaymentStatus.PARTIALLY_REFUNDED
                else:
                    order.payment_status = OrderPaymentStatus.PAID
                order.save(update_fields=['payment_status'])

            return refund

    @staticmethod
    def _refund_result(refund) -> dict:
        status = RefundStatus.SUCCEEDED if refund.status == 'success' else refund.status
        return {
            'refund_no': refund.refund_no,
            'amount': refund.amount,
            'status': status,
            'gateway_refund_id': refund.gateway_refund_id,
        }

    @staticmethod
    def reconcile_unknown_refunds(batch_size: int = 20) -> int:
        """对账 UNKNOWN 退款。

        防死循环：UNKNOWN 退款若网关持续异常，会无限次被重试（每 5 分钟一次），
        无限消耗网关 API 配额。因此用 reconcile_attempts 计数，超过
        REFUND_RECONCILIATION_MAX_ATTEMPTS（默认 5 次）后标记为 FAILED 停止重试。
        """
        batch_size = max(1, min(int(batch_size), 100))
        max_attempts = getattr(
            settings, 'REFUND_RECONCILIATION_MAX_ATTEMPTS', 5,
        )
        refund_ids = list(
            RefundLog.objects.filter(status=RefundStatus.UNKNOWN)
            .order_by('created_at')
            .values_list('pk', flat=True)[:batch_size]
        )
        finalized = 0
        for refund_id in refund_ids:
            refund = RefundLog.objects.select_related('payment').get(pk=refund_id)
            # 超过重试上限：强制标记 FAILED，避免无限重试
            if refund.reconcile_attempts >= max_attempts:
                logger.error(
                    'Refund %s exceeded %d reconciliation attempts, marking FAILED',
                    refund.refund_no, max_attempts,
                )
                PaymentService._finalize_refund(
                    refund.pk, RefundStatus.FAILED,
                    {'error': 'RECONCILIATION_MAX_ATTEMPTS_EXCEEDED'},
                )
                finalized += 1
                continue
            try:
                gateway = PaymentGatewayFactory.get_gateway(refund.payment.method)
                gateway_result = gateway.query_refund(
                    refund.gateway_request_id,
                    refund.gateway_refund_id,
                )
            except Exception:
                logger.exception('Refund reconciliation query failed: %s', refund.refund_no)
                # 查询失败：计数 +1，下次再试（有上限保护）
                RefundLog.objects.filter(pk=refund.pk).update(
                    reconcile_attempts=refund.reconcile_attempts + 1,
                )
                continue

            query_status = (
                str(gateway_result.get('status', '')).lower()
                if isinstance(gateway_result, dict)
                else 'unknown'
            )
            if not refund.gateway_refund_id and query_status in ('', 'unknown', 'unavailable'):
                try:
                    gateway_result = gateway.create_refund(
                        refund.payment.gateway_payment_id,
                        refund.amount,
                        refund.payment.currency,
                        refund.reason,
                        idempotency_key=refund.gateway_request_id,
                    )
                except GatewayRefundRejectedError as exc:
                    gateway_result = {'status': 'failed', 'error': str(exc)}
                except Exception as exc:
                    logger.error('Refund reconciliation replay failed: %s', refund.refund_no)
                    gateway_result = {'status': 'unknown', 'error': str(exc)}

            if not isinstance(gateway_result, dict):
                gateway_result = {
                    'status': 'unknown',
                    'error': 'GATEWAY_REFUND_RESPONSE_INVALID',
                }
            status = PaymentService._classify_refund_result(refund, gateway_result)
            PaymentService._finalize_refund(refund.pk, status, gateway_result)
            if status in (RefundStatus.SUCCEEDED, RefundStatus.FAILED):
                finalized += 1
            elif status == RefundStatus.UNKNOWN:
                # 仍未知：计入重试次数，下次调度再试（有上限保护）
                RefundLog.objects.filter(pk=refund.pk).update(
                    reconcile_attempts=refund.reconcile_attempts + 1,
                )
        return finalized

    # ==================== 补偿任务 ====================

    @staticmethod
    def sync_expired_payments():
        """
        轮询超过 N 分钟仍未完成的支付，向网关查询最新状态。
        用于 webhook 丢失/延迟的补偿。由 Celery Beat 定时调用。

        防死循环：超过 PAYMENT_MAX_PENDING_MINUTES（默认 24 小时）仍未完成的
        pending 支付视为用户放弃，直接标记为 CANCELLED，避免无限轮询网关。
        """
        from django.utils import timezone
        cutoff = timezone.now() - timezone.timedelta(minutes=15)
        max_pending_minutes = getattr(
            settings, 'PAYMENT_MAX_PENDING_MINUTES', 24 * 60,
        )
        abandon_cutoff = timezone.now() - timezone.timedelta(
            minutes=max_pending_minutes,
        )

        pending = PaymentLog.objects.filter(
            status=PaymentStatus.PENDING,
            created_at__lt=cutoff,
        ).exclude(gateway_payment_id='')

        for payment in pending:
            # 超过最大待支付时长：视为用户放弃，标记取消，不再轮询
            if payment.created_at < abandon_cutoff:
                payment.status = PaymentStatus.CANCELLED
                payment.save(update_fields=['status'])
                logger.info(
                    'Payment %s abandoned (pending > %d min), cancelled',
                    payment.payment_no, max_pending_minutes,
                )
                continue
            try:
                PaymentService._query_gateway_status(payment)
            except Exception:
                logger.exception(
                    f'Sync failed for payment {payment.payment_no}'
                )

    @staticmethod
    def _query_gateway_status(payment):
        """向网关查询支付状态并同步。

        安全说明：主动轮询虽然走官方 API（已由网关侧签名/鉴权保证真实性），
        但作为纵深防御，仍对网关返回的金额与币种做二次校验，
        防止网关数据被篡改或返回异常值导致订单被错误标记为已支付。
        """
        try:
            gateway = PaymentGatewayFactory.get_gateway(payment.method)
        except ValueError:
            return
        result = gateway.retrieve_payment(payment.gateway_payment_id)
        if result.get('status') == 'succeeded':
            # 金额/币种二次校验：与订单应付金额不一致则拒绝标记为已支付
            gateway_amount = result.get('amount')
            gateway_currency = (result.get('currency') or '').upper()
            if gateway_amount is not None and gateway_currency:
                if gateway_currency != payment.currency.upper():
                    logger.error(
                        f'[{payment.method}] Sync currency mismatch: '
                        f'gateway={gateway_currency}, order={payment.currency} '
                        f'payment_no={payment.payment_no}'
                    )
                    return
                # 金额比较用 Decimal：float 二进制误差（0.1+0.2≠0.3）可能造成临界金额误判
                try:
                    gateway_amount_dec = Decimal(str(gateway_amount))
                except ArithmeticError:
                    logger.error(
                        f'[{payment.method}] Unparseable gateway amount: {gateway_amount} '
                        f'payment_no={payment.payment_no}'
                    )
                    return
                if abs(gateway_amount_dec - payment.amount) > Decimal('0.01'):
                    logger.error(
                        f'[{payment.method}] Sync amount mismatch: '
                        f'gateway={gateway_amount}, order={payment.amount} '
                        f'payment_no={payment.payment_no}'
                    )
                    return
            payment.status = PaymentStatus.SUCCESS
            payment.save()
            payment.order.pay(
                payment_method=payment.method,
                payment_no=payment.payment_no,
            )
        elif result.get('status') in ('cancelled', 'failed'):
            payment.status = PaymentStatus.FAILED
            payment.save()

    # ==================== 网关适配层 ====================

    @staticmethod
    def _create_gateway_payment(payment, success_url: str, cancel_url: str) -> dict:
        """Create real payment via gateway factory."""
        product_name = f'Order {payment.order.order_no}'
        gateway = PaymentGatewayFactory.get_gateway(payment.method)
        return gateway.create_payment(
            payment.payment_no, payment.currency, payment.amount,
            product_name, success_url, cancel_url,
        )

    @staticmethod
    def _verify_signature(gateway: str, body: str, signature: str, headers: dict = None) -> bool:
        if not signature:
            return False
        try:
            gw = PaymentGatewayFactory.get_gateway(gateway)
            return gw.verify_webhook(body, signature, headers or {})
        except ValueError:
            return False

    @staticmethod
    def _extract_gateway_id(gateway: str, payload: dict) -> str:
        if gateway == 'mock':
            return payload.get('gateway_payment_id', '')
        if gateway == 'stripe':
            return ((payload.get('data') or {}).get('object') or {}).get('id', '')
        if gateway == 'paypal':
            return (payload.get('resource') or {}).get('id', '')
        if gateway == 'alipay':
            return payload.get('trade_no', '')
        return ''

    @staticmethod
    def _extract_event_id(gateway: str, payload: dict) -> str:
        if gateway in ('stripe', 'paypal'):
            return payload.get('id', '')
        if gateway == 'alipay':
            return payload.get('notify_id', '')
        if gateway == 'mock':
            return payload.get('event_id', '')
        return ''

    # 各网关事件类型 → 内部事件的严格白名单映射。
    # ⚠️ 历史实现用子串模糊匹配（'succeeded'/'capture'/'refund' 等），存在真实误判：
    #   PayPal 'PAYMENT.CAPTURE.DENIED' / '.FAILED' / '.REFUNDED' / '.REVERSED'
    #   均含 'capture' → 被误判为 payment_completed（未收款/已退款被标记为支付成功）；
    #   Stripe 'refund.failed' / 'refund.updated' 含 'refund' → 被误判为退款成功。
    # 改为精确白名单：未命中事件一律原样返回（视为通知类，仅存档 gateway_data，
    # 不推进支付状态）；万一漏标成功事件，由 sync_expired_payments 轮询网关补偿。
    _WEBHOOK_EVENT_MAP = {
        'stripe': {
            'checkout.session.completed': 'payment_completed',
            'checkout.session.async_payment_succeeded': 'payment_completed',
            'payment_intent.succeeded': 'payment_completed',
            'payment_intent.payment_failed': 'payment_failed',
            'charge.refunded': 'refund_completed',
            'charge.dispute.created': 'dispute_created',
        },
        'paypal': {
            'PAYMENT.CAPTURE.COMPLETED': 'payment_completed',
            'PAYMENT.CAPTURE.DENIED': 'payment_failed',
            'PAYMENT.CAPTURE.DECLINED': 'payment_failed',
            'PAYMENT.CAPTURE.REFUNDED': 'refund_completed',
            'PAYMENT.CAPTURE.REVERSED': 'refund_completed',
            'CUSTOMER.DISPUTE.CREATED': 'dispute_created',
        },
        'alipay': {
            'TRADE_SUCCESS': 'payment_completed',
            'TRADE_FINISHED': 'payment_completed',
            'TRADE_CLOSED': 'payment_cancelled',
        },
        'mock': {
            'success': 'payment_completed',
            'failure': 'payment_failed',
            'cancel': 'payment_cancelled',
            'timeout': 'payment_timeout',
            'refund': 'refund_completed',
        },
    }

    @staticmethod
    def _extract_event(gateway: str, payload: dict) -> str:
        if gateway == 'mock':
            scenario = payload.get('scenario', '')
            return PaymentService._WEBHOOK_EVENT_MAP['mock'].get(scenario, scenario)
        event = {
            'stripe': payload.get('type', ''),
            'paypal': payload.get('event_type', ''),
            'alipay': payload.get('trade_status', ''),
        }.get(gateway, '')
        mapped = PaymentService._WEBHOOK_EVENT_MAP.get(gateway, {}).get(event)
        if mapped:
            return mapped
        # 白名单外事件（expired / refund.updated / dispute.updated 等）：
        # 不推断状态，原样返回交由 handle_webhook 走「仅存档 gateway_data」分支
        return event

    @staticmethod
    def _extract_amount(gateway: str, payload: dict) -> tuple:
        if gateway == 'mock':
            return payload.get('amount'), (payload.get('currency') or '').upper() or None
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
