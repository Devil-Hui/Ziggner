"""
Redis sliding window rate limiter middleware.
Limits: login=60/min, verify-code=5/min per IP.
"""
import logging
import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('biz')

# Endpoint-specific limits (requests per minute per IP) — from Django settings
_limits = getattr(settings, 'RATE_LIMITS', {
    '/api/users/login/': 60,
    '/api/users/register/': 30,
    '/api/users/send-verify-code/': 5,
    '/api/order/checkout/': 30,
})

WINDOW_SECONDS = getattr(settings, 'RATE_LIMIT_WINDOW', 60)
BLOCK_TTL = getattr(settings, 'RATE_LIMIT_BLOCK_TTL', 300)  # 5 min block after exceeding limit


class RateLimitMiddleware:
    """Lightweight Redis sliding window rate limiter."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path.rstrip('/')
        limit = _limits.get(path)
        if limit:
            ip = self._get_client_ip(request)
            key = f'ratelimit:{path}:{ip}'

            now = time.time()
            window_start = now - WINDOW_SECONDS

            try:
                # Redis sorted set sliding window
                cache.client.zremrangebyscore(key, '-inf', window_start)
                count = cache.client.zcard(key)
                block_key = f'ratelimit_block:{path}:{ip}'

                if cache.get(block_key):
                    return JsonResponse(
                        {'detail': 'TOO_MANY_REQUESTS', 'retry_after': BLOCK_TTL},
                        status=429,
                    )

                if count >= limit:
                    cache.set(block_key, 1, timeout=BLOCK_TTL)
                    logger.warning(f'Rate limit exceeded: {path} ip={ip} count={count}')
                    return JsonResponse(
                        {'detail': 'TOO_MANY_REQUESTS', 'retry_after': BLOCK_TTL},
                        status=429,
                    )

                cache.client.zadd(key, {str(now): now})
                cache.client.expire(key, WINDOW_SECONDS + 10)
            except Exception as e:
                # 故障安全：Redis 不可用时放行请求（记录日志），不阻塞正常流量
                logger.error(
                    f'Rate limit middleware error: {type(e).__name__}: '
                    f'{str(e)[:80]}, path={path}, ip={ip}'
                )
        return self.get_response(request)

    def _get_client_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')
