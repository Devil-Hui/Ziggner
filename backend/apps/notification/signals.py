from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.order.models import Order, OrderStatus
from utils.cache import Cache
from .models import Notification

_notification_cache = Cache('notification')


STATUS_MESSAGES = {
    OrderStatus.PAID: ('order_paid', 'Payment Successful',
                       'Your order #{order_no} has been paid.'),
    OrderStatus.SHIPPED: ('order_shipped', 'Order Shipped',
                          'Your order #{order_no} has been shipped.'),
    OrderStatus.DELIVERED: ('order_delivered', 'Order Delivered',
                            'Your order #{order_no} has been delivered.'),
    OrderStatus.CANCELLED: ('order_cancelled', 'Order Cancelled',
                            'Your order #{order_no} has been cancelled.'),
}


@receiver(post_save, sender=Order)
def create_order_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.user,
            type='order_created',
            title='Order Placed',
            content=f'Your order #{instance.order_no} has been placed successfully.',
            related_order_no=instance.order_no,
        )
        _notification_cache.clear_by_prefix(f'list:{instance.user_id}')
        _notification_cache.delete(f'unread:{instance.user_id}')
        return

    # 仅在 status 字段实际变更时发送通知，避免重复发送
    update_fields = kwargs.get('update_fields')
    if update_fields is not None and 'status' not in update_fields:
        return

    if instance.status in STATUS_MESSAGES:
        msg_type, title_tpl, content_tpl = STATUS_MESSAGES[instance.status]
        # 幂等检查：同一订单号 + 同一类型不重复创建
        if not Notification.objects.filter(
            user=instance.user,
            type=msg_type,
            related_order_no=instance.order_no,
        ).exists():
            Notification.objects.create(
                user=instance.user,
                type=msg_type,
                title=title_tpl,
                content=content_tpl.format(order_no=instance.order_no),
                related_order_no=instance.order_no,
            )
            _notification_cache.clear_by_prefix(f'list:{instance.user_id}')
            _notification_cache.delete(f'unread:{instance.user_id}')
