import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import Order, OrderStatus, PaymentStatus

logger = logging.getLogger(__name__)
_cfg = settings.ORDER_AUTO_SETTINGS


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=30,
    queue='default',
)
def auto_cancel_unpaid_orders(self):
    """自动取消超时未支付的订单，恢复库存。
    
    🔥 防竞态：使用 select_for_update() 锁定订单行，
    防止与用户支付回调并发执行导致已支付订单被错误取消。
    """
    from django.db import transaction as db_transaction
    
    now = timezone.now()
    cutoff = now - timedelta(minutes=_cfg['CANCEL_UNPAID_MINUTES'])
    batch_size = max(1, min(int(_cfg.get('CANCEL_BATCH_SIZE', 100)), 500))
    count = 0
    candidate_ids = list(
        Order.objects.filter(
            Q(payment_deadline__lte=now)
            | Q(payment_deadline__isnull=True, created_at__lte=cutoff),
            status=OrderStatus.PENDING_PAYMENT,
            payment_status=PaymentStatus.UNPAID,
        ).order_by('payment_deadline', 'id').values_list('id', flat=True)[:batch_size]
    )
    for order_id in candidate_ids:
        with db_transaction.atomic():
            order = Order.objects.select_for_update().filter(
                pk=order_id,
                status=OrderStatus.PENDING_PAYMENT,
                payment_status=PaymentStatus.UNPAID,
            ).first()
            if order is None:
                continue
            is_due = (
                order.payment_deadline <= timezone.now()
                if order.payment_deadline is not None
                else order.created_at <= cutoff
            )
            if not is_due:
                continue
            try:
                order.cancel(reason=f'Auto-cancelled: unpaid after {_cfg["CANCEL_UNPAID_MINUTES"]} minutes')
                from apps.payment.models import PaymentLog, PaymentStatus as GatewayPaymentStatus
                PaymentLog.objects.filter(
                    order=order,
                    status=GatewayPaymentStatus.PENDING,
                ).update(status=GatewayPaymentStatus.CANCELLED)
                count += 1
            except ValueError as e:
                logger.warning(f'Auto-cancel failed for {order.order_no}: {e}')

    if count:
        logger.info(f'Auto-cancelled {count} unpaid orders')
    return {'cancelled': count}


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=30,
    queue='default',
)
def auto_complete_orders(self):
    """自动完成已签收超时的订单"""
    from django.db import transaction as db_transaction

    cutoff = timezone.now() - timedelta(days=_cfg['COMPLETE_DELIVERED_DAYS'])
    count = 0
    with db_transaction.atomic():
        orders = Order.objects.select_for_update(skip_locked=True).filter(
            status=OrderStatus.DELIVERED,
            delivered_at__lte=cutoff,
        )

        for order in orders:
            try:
                order.complete()
                count += 1
            except ValueError as e:
                logger.warning(f'Auto-complete failed for {order.order_no}: {e}')

    if count:
        logger.info(f'Auto-completed {count} delivered orders')
    return {'completed': count}


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=30,
    queue='default',
)
def check_timeout_payments(self):
    """检查已支付订单是否超时未确认（保留给后续支付回调用）"""
    pass
