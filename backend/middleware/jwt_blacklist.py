"""
JWT Access Token Blacklist middleware.
Checks every authenticated API request against a Redis blacklist.
When user logs out, the access token's JTI is stored in Redis for its remaining lifetime.
"""
import logging
import base64
import json
import time

from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('biz')

# 跳过黑名单检查的路径前缀
SKIP_PATHS = (
    '/api/users/login/', '/api/users/register/',
    '/api/users/refresh/', '/api/users/forgot-password/',
    '/admin/login', '/health/', '/metrics',
    '/api/goods/tag',  # 公开列表
    '/api/goods/spu', '/api/goods/sku', '/api/goods/category',
    '/api/goods/brand', '/api/goods/hot', '/api/goods/search',
)


class JWTBlacklistMiddleware:
    """Check Redis blacklist on every authenticated API request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path.rstrip('/')

        # 只对带 Bearer token 的 API 请求做检查
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return self.get_response(request)

        # 跳过公开路径
        if any(path.startswith(sp) for sp in SKIP_PATHS):
            return self.get_response(request)

        # 只检查 /api/ 路径
        if not path.startswith('/api/'):
            return self.get_response(request)

        token = auth_header[7:]
        try:
            # Decode JWT payload (no signature verification — just extract JTI + exp)
            payload = json.loads(
                base64.b64decode(token.split('.')[1] + '==')
            )
            jti = payload.get('jti', '')
            exp = payload.get('exp', 0)

            if jti and cache.get(f'blacklist:{jti}'):
                logger.warning(f'Request with blacklisted JTI: {jti}')
                return JsonResponse(
                    {'detail': '令牌已被加入黑名单', 'code': 401, 'status': 'error'},
                    status=401,
                )
        except Exception as e:
            # 故障安全：解码失败时记录日志但放行请求
            # 签名验证由 SimpleJWT 认证类在后端认证步骤完成
            logger.warning(
                f'JWT黑名单中间件解码失败: {type(e).__name__}: '
                f'{str(e)[:80]}, token_prefix={token[:20]}...'
            )

        return self.get_response(request)
