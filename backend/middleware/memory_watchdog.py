"""内存看门狗中间件 — 2C4G 自保护。

当进程 RSS 超过容器内存硬上限（MEM_LIMIT_MB）的 85% 时：
1) 清空 L1 进程内近缓存（LocMem），立即回收这部分内存；
2) 关闭非事务中的空闲 DB 连接，释放连接占用；
3) 置位降级标志（system:degraded），让限流 fail-open，避免雪崩式 429。

检查节流到每 30s 一次（per worker），避免每请求都算 RSS。
75% 告警 / 负载>2.0 告警由 Prometheus+Grafana 红色告警线负责（见 DEPLOY-GUIDE）。
"""

from __future__ import annotations

import logging
import resource
import time

from django.conf import settings
from django.core.cache import caches
from django.db import connections

logger = logging.getLogger("biz")

_LOCAL = {}
_CHECK_INTERVAL = 30  # 秒


class MemoryWatchdogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        now = time.time()
        if now - _LOCAL.get("last_check", 0.0) >= _CHECK_INTERVAL:
            _LOCAL["last_check"] = now
            self._check()
        return self.get_response(request)

    def _check(self) -> None:
        try:
            limit_mb = int(getattr(settings, "MEM_LIMIT_MB", 544))
            rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss  # Linux: KB
            rss_mb = rss_kb / 1024.0
            ratio = rss_mb / limit_mb if limit_mb else 0.0
            if ratio < 0.85:
                # 内存宽裕：清除可能残留的降级标志
                try:
                    caches["local"].delete("system:degraded")
                except Exception:
                    pass
                return

            logger.warning(
                "Memory watchdog: RSS=%.0fMB (%.0f%% of %dMB) — reclaiming",
                rss_mb, ratio * 100, limit_mb,
            )
            # 1) 清空 L1 近缓存
            try:
                caches["local"].clear()
            except Exception:
                pass
            # 2) 关闭非事务中的空闲 DB 连接
            try:
                for conn in connections.all():
                    if not conn.in_atomic_block:
                        conn.close_if_unusable_or_obsolete()
            except Exception:
                pass
            # 3) 置位降级标志（限流 fail-open）
            try:
                caches["local"].set("system:degraded", True, 60)
            except Exception:
                pass
        except Exception:
            pass
