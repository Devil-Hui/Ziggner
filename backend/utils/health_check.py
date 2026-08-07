"""Dependency-aware health endpoint with non-sensitive release metadata."""

import json

from django.conf import settings
from django.db import connections
from django.http import HttpResponse
from django.views import View


class HealthCheckView(View):
    def get(self, request):
        status_code = 200
        database_status = "up"
        redis_status = "up"
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            database_status = "down"
            status_code = 503

        try:
            from django.core.cache import cache

            cache.set("_health", "1", timeout=10)
            if cache.get("_health") != "1":
                raise RuntimeError("cache health check failed")
            cache.delete("_health")
        except Exception:
            redis_status = "down"
            status_code = 503

        body = json.dumps({
            "status": "ok" if status_code == 200 else "degraded",
            "version": settings.APP_VERSION,
            "git_commit": settings.GIT_COMMIT,
            "environment": settings.DJANGO_ENV,
            "database": database_status,
            "redis": redis_status,
        })
        return HttpResponse(body, content_type="application/json", status=status_code)
