"""
Payment Celery tasks — webhook 补偿轮询 & 过期支付清理.
"""
from celery import shared_task
from .services import PaymentService


@shared_task(
    name='payment.sync_expired_payments',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_expired_payments(self):
    """轮询超过 15 分钟仍未完成的支付，向网关查询最新状态。
    用于 webhook 丢失/延迟的补偿。由 Celery Beat 每 15 分钟调度一次。
    """
    try:
        PaymentService.sync_expired_payments()
    except Exception as exc:
        self.retry(exc=exc)