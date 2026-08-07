"""IP rate limiting for resource-sensitive and abuse-prone endpoints."""

from __future__ import annotations

import fnmatch
import logging
import uuid

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

from utils.client_ip import get_client_ip
from utils.sliding_window import RateLimitBackendUnavailable, check_sliding_window

logger = logging.getLogger("biz")


class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path if request.path.endswith("/") else f"{request.path}/"
        matched = self._match_limit(path)
        if not matched:
            return self.get_response(request)

        pattern, limit = matched
        client_ip = get_client_ip(request)
        key = f"ratelimit:{pattern}:{client_ip}"
        block_key = f"ratelimit_block:{pattern}:{client_ip}"
        block_ttl = int(getattr(settings, "RATE_LIMIT_BLOCK_TTL", 300))

        try:
            if cache.get(block_key):
                return self._limited(block_ttl)

            allowed = check_sliding_window(
                key,
                window_seconds=int(getattr(settings, "RATE_LIMIT_WINDOW", 60)),
                max_count=int(limit),
                fail_open=False,
            )
            if not allowed:
                cache.set(block_key, 1, timeout=block_ttl)
                logger.warning("Rate limit exceeded: %s ip=%s", path, client_ip)
                return self._limited(block_ttl)
        except RateLimitBackendUnavailable:
            logger.error("Rate limit backend unavailable: path=%s", path)
            return self._unavailable()
        except Exception:
            logger.exception("Rate limit check failed: path=%s", path)
            return self._unavailable()

        return self.get_response(request)

    @staticmethod
    def _match_limit(path: str):
        for pattern, limit in getattr(settings, "RATE_LIMITS", {}).items():
            normalized = pattern if pattern.endswith("/") else f"{pattern}/"
            if fnmatch.fnmatchcase(path, normalized):
                return normalized, limit
        return None

    @staticmethod
    def _request_id() -> str:
        return str(uuid.uuid4())

    @classmethod
    def _limited(cls, retry_after: int):
        response = JsonResponse(
            {
                "code": "RATE_LIMITED",
                "message": "请求过于频繁，请稍后重试",
                "details": {"retry_after": retry_after},
                "request_id": cls._request_id(),
            },
            status=429,
        )
        response["Retry-After"] = str(retry_after)
        return response

    @classmethod
    def _unavailable(cls):
        response = JsonResponse(
            {
                "code": "SERVICE_UNAVAILABLE",
                "message": "服务暂时繁忙，请稍后重试",
                "details": {},
                "request_id": cls._request_id(),
            },
            status=503,
        )
        response["Retry-After"] = "5"
        return response
