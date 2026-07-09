"""
邮件发送 Celery 异步任务。

使用 project 级别的 Celery app，send_verification_email 为独立任务，
失败自动重试（最多 3 次，指数退避）。
"""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def send_verification_email(self, subject, message, recipient):
    """
    异步发送验证码邮件。

    失败时自动重试：10s → 20s → 40s（指数退避）
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        logger.info(f'[CELERY] Email sent to {recipient}')
    except Exception as exc:
        logger.warning(f'[CELERY] Email failed to {recipient} (retry {self.request.retries}/3): {exc}')
        raise self.retry(exc=exc, countdown=10 * (2 ** self.request.retries))
