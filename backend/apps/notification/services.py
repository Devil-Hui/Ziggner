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
        # 每用户 list 缓存版本：标记已读时自增，旧版本 key 自然失效，
        # 不再依赖 clear_by_prefix 的 SCAN（Redis 上可能静默 no-op）。
        version = _cache.get(f'list_version:{user.id}') or 0
        cache_key = f'list:{user.id}:{version}:{unread_only}:{page}:{per_page}:{type}'
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
    def _bump_list_version(user):
        """自增每用户 list 缓存版本，使旧的 list 缓存 key 失效。

        优先用 Redis 原子 incr；非 Redis 后端（如 DatabaseCache）incr 缺键会抛错，
        退化为 get+set。替换原先依赖 SCAN 前缀删除的方案（Redis 上可能静默 no-op）。
        """
        version_key = f'list_version:{user.id}'
        try:
            return _cache.incr(version_key)
        except Exception:
            cur = _cache.get(version_key) or 0
            nxt = cur + 1
            _cache.set(version_key, nxt)
            return nxt

    @staticmethod
    def mark_read(user, notification_id):
        updated = Notification.objects.filter(user=user, pk=notification_id, is_read=False).update(is_read=True)
        if updated:
            # 可靠失效：自增 list 版本让旧 key 失效；clear_by_prefix / unread 删除仅作冗余兜底。
            NotificationService._bump_list_version(user)
            _cache.clear_by_prefix(f'list:{user.id}')
            _cache.delete(f'unread:{user.id}')

    @staticmethod
    def mark_all_read(user):
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        NotificationService._bump_list_version(user)
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
