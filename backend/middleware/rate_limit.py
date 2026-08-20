"""IP / 用户级限流中间件 — Redis+Lua 原子令牌桶。

2C4G 资源约束下的限流落地：
- 购买接口 5 req/s per IP、登录接口 2 req/s per IP、管理后台 API 10 req/s per user。
- 令牌桶在 Lua 脚本内原子补充+扣减，跨多 worker 无竞态。
- 触发限流返回 429 + Retry-After。
- 系统降级态（内存看门狗置位）下 fail-open，避免雪崩式 429。

路径→速率在 settings.RATE_LIMITS（req/s/IP）；管理后台前缀在
settings.ADMIN_API_RATE_LIMIT_PREFIX，按登录用户计数（settings.ADMIN_API_RATE_LIMIT）。
"""

from __future__ import annotations

import fnmatch
import logging
import uuid

from django.conf import settings
from django.http import JsonResponse

from utils.client_ip import get_client_ip
from utils.token_bucket import allow as token_allow

logger = logging.getLogger("biz")


class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1) 管理后台 API：按登录用户限流（10 req/s per user）
        admin_prefix = getattr(settings, "ADMIN_API_RATE_LIMIT_PREFIX", "/api/v1/admin/")
        if request.path.startswith(admin_prefix):
            return self._check_admin(request)

        # 2) 资源敏感接口：按 IP 限流（req/s/IP）
        matched = self._match_ip_limit(request.path)
        if matched is None:
            return self.get_response(request)

        pattern, rate = matched
        client_ip = get_client_ip(request)
        allowed, _remaining, retry_after = token_allow(
            f"ip:{pattern}:{client_ip}", rate, ttl=120,
        )
        if not allowed:
            logger.warning("Rate limit exceeded: %s ip=%s", request.path, client_ip)
            return self._limited(retry_after or 0.2)
        return self.get_response(request)

    # ─── 管理后台：按用户 ───

    def _check_admin(self, request):
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            # 未登录的后台请求由认证中间件拦截，这里不重复限流
            return self.get_response(request)
        rate = float(getattr(settings, "ADMIN_API_RATE_LIMIT", 10))
        allowed, _r, retry_after = token_allow(
            f"user:{request.user.id}", rate, ttl=120,
        )
        if not allowed:
            logger.warning("Admin rate limit exceeded: user=%s path=%s", request.user.id, request.path)
            return self._limited(retry_after or 0.1)
        return self.get_response(request)

    # ─── IP 路径匹配 ───

    @staticmethod
    def _match_ip_limit(path: str):
        norm = path if path.endswith("/") else f"{path}/"
        for pattern, limit in getattr(settings, "RATE_LIMITS", {}).items():
            p = pattern if pattern.endswith("/") else f"{pattern}/"
            if fnmatch.fnmatchcase(norm, p):
                return p, float(limit)
        return None

    # ─── 响应 ───

    @staticmethod
    def _request_id() -> str:
        return str(uuid.uuid4())

    @classmethod
    def _limited(cls, retry_after: float):
        secs = max(1, int(retry_after))
        response = JsonResponse(
            {
                "code": "RATE_LIMITED",
                "message": "请求过于频繁，请稍后重试",
                "details": {"retry_after": secs},
                "request_id": cls._request_id(),
            },
            status=429,
        )
        response["Retry-After"] = str(secs)
        return response
