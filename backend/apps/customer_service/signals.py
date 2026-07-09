import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notification.models import Notification
from utils.cache import Cache
from .models import Message, Conversation

logger = logging.getLogger(__name__)
_cache = Cache('notification')


def _get_group_admins(group):
    """获取管理组内所有活跃成员的 User 对象列表"""
    if not group:
        return []
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return list(
        User.objects.filter(
            admin_group_memberships__group=group,
            admin_group_memberships__status=1,
            is_staff=True,
        ).distinct()
    )


def _get_all_superusers():
    """获取所有超管"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return list(User.objects.filter(is_superuser=True, is_active=True))


def _notify_group_or_all(conv, notification_type: str, title: str, content: str):
    """
    组级通知：通知会话所属组的管理员 + 所有超管。
    如果会话未绑定组，则通知所有超管。
    """
    notified_ids = set()

    # 通知超管
    for su in _get_all_superusers():
        if su.id not in notified_ids:
            Notification.objects.create(
                user=su,
                type=notification_type,
                title=title,
                content=content,
            )
            _cache.clear_by_prefix(f'list:{su.id}')
            _cache.delete(f'unread:{su.id}')
            notified_ids.add(su.id)

    # 通知组内管理员
    if conv.group:
        for admin_user in _get_group_admins(conv.group):
            if admin_user.id not in notified_ids:
                Notification.objects.create(
                    user=admin_user,
                    type=notification_type,
                    title=title,
                    content=content,
                )
                _cache.clear_by_prefix(f'list:{admin_user.id}')
                _cache.delete(f'unread:{admin_user.id}')
                notified_ids.add(admin_user.id)


@receiver(post_save, sender=Message)
def notify_admin_on_user_message(sender, instance, created, **kwargs):
    """
    用户发送新消息时 → 通知分配给该会话的管理员。
    组级隔离：仅通知所在组管理员 + 超管。
    """
    if not created:
        return
    if instance.sender_type != 'user':
        return

    conv = instance.conversation
    content_preview = instance.content[:50] if instance.content else f'[{instance.get_msg_type_display()}]'

    if conv.admin:
        # 已分配客服 → 通知该客服
        Notification.objects.create(
            user=conv.admin,
            type='cs_new_message',
            title='新客服消息',
            content=f'用户 {conv.user.username} 在会话「{conv.subject or "会话#" + str(conv.id)}」中发送了新消息: {content_preview}',
        )
        _cache.clear_by_prefix(f'list:{conv.admin_id}')
        _cache.delete(f'unread:{conv.admin_id}')
    else:
        # 未分配客服 → 使用组级通知
        _notify_group_or_all(
            conv,
            notification_type='cs_new_message',
            title='新客服消息（未分配）',
            content=f'用户 {conv.user.username} 发起了新消息: {content_preview}',
        )


@receiver(post_save, sender=Conversation)
def notify_on_conversation_created(sender, instance, created, **kwargs):
    """
    新会话创建时 → 组级通知。
    仅通知会话所属组的管理员 + 所有超管。
    """
    if not created:
        return

    _notify_group_or_all(
        instance,
        notification_type='cs_new_conversation',
        title='新客服会话',
        content=f'用户 {instance.user.username} 创建了新会话「{instance.subject or "会话#" + str(instance.id)}」',
    )
