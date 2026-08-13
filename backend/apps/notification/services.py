from django.conf import settings
from utils.cache import Cache
from .models import Notification

_cache = Cache('notification')


class NotificationService:

    @staticmethod
    def list_for_user(user, unread_only=False, page=1, per_page=None, type=None):
        if per_page is None:
            per_page = getattr(settings, 'NOTIFICATION_DEFAULT_PAGE_SIZE', 20)
        cache_ttl = getattr(settings, 'NOTIFICATION_LIST_CACHE_TTL', 120)
        cache_key = f'list:{user.id}:{unread_only}:{page}:{per_page}:{type}'
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached['results'], cached['total']

        qs = Notification.objects.filter(user=user)
        if type:
            qs = qs.filter(type=type)
        if unread_only:
            qs = qs.filter(is_read=False)
        total = qs.count()
        results = list(qs[(page - 1) * per_page:page * per_page])
        # DatabaseCache / JSON serializer cannot store model instances
        serializable = [
            {
                'id': n.id,
                'type': n.type,
                'title': n.title,
                'content': n.content,
                'is_read': n.is_read,
                'related_order_no': n.related_order_no,
                'created_at': n.created_at.isoformat() if n.created_at else None,
                'expires_at': n.expires_at.isoformat() if n.expires_at else None,
            }
            for n in results
        ]
        _cache.set(cache_key, {'results': serializable, 'total': total}, cache_ttl)
        return results, total

    @staticmethod
    def mark_read(user, notification_id):
        updated = Notification.objects.filter(user=user, pk=notification_id, is_read=False).update(is_read=True)
        # 直接重写未读计数缓存（不依赖 clear_by_prefix 是否对各缓存后端生效），
        # 避免标记已读后缓存仍返回旧未读数导致「刷新后红点回退」。
        if updated:
            remaining = Notification.objects.filter(user=user, is_read=False).count()
            unread_ttl = getattr(settings, 'NOTIFICATION_UNREAD_CACHE_TTL', 60)
            _cache.set(f'unread:{user.id}', remaining, unread_ttl)
        _cache.clear_by_prefix(f'list:{user.id}')
        _cache.delete(f'unread:{user.id}')

    @staticmethod
    def mark_all_read(user):
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        unread_ttl = getattr(settings, 'NOTIFICATION_UNREAD_CACHE_TTL', 60)
        _cache.set(f'unread:{user.id}', 0, unread_ttl)
        _cache.clear_by_prefix(f'list:{user.id}')
        _cache.delete(f'unread:{user.id}')

    @staticmethod
    def unread_count(user):
        unread_cache_ttl = getattr(settings, 'NOTIFICATION_UNREAD_CACHE_TTL', 60)
        cache_key = f'unread:{user.id}'
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached
        count = Notification.objects.filter(user=user, is_read=False).count()
        _cache.set(cache_key, count, unread_cache_ttl)
        return count
