"""
邮件发送 Celery 异步任务。

使用 project 级别的 Celery app，send_verification_email 为独立任务，
失败自动重试（最多 3 次，指数退避）。
send_admin_welcome_email 为管理员欢迎邮件任务：失败仅记日志，不影响建号。
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


@shared_task
def send_admin_welcome_email(user_id: int) -> None:
    """异步发送管理员欢迎邮件（含邮箱验证链接）。

    仅当事务成功提交后由 AdminUserCreateView 通过 transaction.on_commit 派发。
    失败仅记录日志，**不影响账号创建与登录可用性**（建号已返回 201）。
    """
    from django.contrib.auth import get_user_model

    from apps.rbac.models import UserRole
    from apps.users.email_service import EmailService

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning(f'[CELERY] Welcome email skipped: user {user_id} not found')
        return

    try:
        roles = list(
            UserRole.objects.filter(user_id=user_id).values_list('role', flat=True)
        )
        role_label = ', '.join(roles) if roles else 'customer'
        context = {
            'role': role_label,
            'login_url': settings.FRONTEND_URL,
            'support_url': settings.SUPPORT_URL,
        }
        EmailService.send_admin_welcome_email(user, context)
        logger.info(f'[CELERY] Welcome email sent to {user.email}')
    except Exception as exc:
        # 邮件失败不影响建号：仅记日志
        logger.warning(
            f'[CELERY] Welcome email failed for user {user_id} ({user.email}): {exc}',
            exc_info=True,
        )

