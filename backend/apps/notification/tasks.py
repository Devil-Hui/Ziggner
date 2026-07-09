import logging
from django.utils import timezone
from project.celery import app

logger = logging.getLogger(__name__)


@app.task
def check_expired_notifications():
    """定时检查并清理过期的通知"""
    from .models import Notification
    from apps.goods.models_notification import AdminNotification

    now = timezone.now()
    total_cleaned = 0

    # 清理用户通知
    expired_user_notifications = Notification.objects.filter(
        expires_at__isnull=False, expires_at__lt=now
    )
    count = expired_user_notifications.count()
    if count:
        expired_user_notifications.delete()
        total_cleaned += count
        logger.info(f'Cleaned {count} expired user notifications')

    # 清理管理后台通知
    expired_admin_notifications = AdminNotification.objects.filter(
        expires_at__isnull=False, expires_at__lt=now
    )
    count = expired_admin_notifications.count()
    if count:
        expired_admin_notifications.delete()
        total_cleaned += count
        logger.info(f'Cleaned {count} expired admin notifications')

    logger.info(f'Total cleaned expired notifications: {total_cleaned}')
    return total_cleaned
