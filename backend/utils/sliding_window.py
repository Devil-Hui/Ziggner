"""滑动窗口限流 — MySQL-only 友好（Django cache），可选 Redis ZSET。

优先 Redis sorted set（精确滑动窗口）；无 Redis 时用 DatabaseCache 计数桶。
失败默认放行，避免基础设施故障阻断主路径。
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)


class RateLimitBackendUnavailable(RuntimeError):
    """The distributed rate-limit store cannot make a safe decision."""


def _redis_client():
    try:
        from django_redis import get_redis_connection
        from django.conf import settings

        configured = getattr(settings, 'CACHES', {})
        alias = 'default'
        backend = (configured.get(alias) or {}).get('BACKEND', '')
        if 'redis' not in backend.lower() and 'django_redis' not in backend.lower():
            # DatabaseCache / LocMem 等：不要走 get_redis_connection
            return None
        return get_redis_connection(alias)
    except Exception:
        return None


def check_sliding_window(
    key: str,
    *,
    window_seconds: int = 60,
    max_count: int = 30,
    fail_open: bool = True,
) -> bool:
    """返回 True 表示允许通过，False 表示超限。"""
    now = time.time()
    client = _redis_client()
    if client is not None:
        try:
            window_start = now - window_seconds
            client.zremrangebyscore(key, 0, window_start)
            count = client.zcard(key)
            if count >= max_count:
                return False
            client.zadd(key, {str(now): now})
            client.expire(key, window_seconds + 10)
            return True
        except Exception as e:
            logger.warning('sliding_window redis failed key=%s: %s', key, e)
            if not fail_open:
                return False
            # fall through to cache bucket

    # DatabaseCache / 通用 cache：固定窗口计数（近似滑动窗口，2C4G 足够）
    try:
        bucket = int(now // window_seconds)
        cache_key = f'{key}:bucket:{bucket}'
        # add 初始化；失败则 incr
        if cache.add(cache_key, 1, timeout=window_seconds + 10):
            return True
        try:
            n = cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=window_seconds + 10)
            n = 1
        return int(n) <= max_count
    except Exception as e:
        logger.error('sliding_window cache failed key=%s: %s', key, e)
        if fail_open:
            return True
        raise RateLimitBackendUnavailable('rate limit backend unavailable') from e
