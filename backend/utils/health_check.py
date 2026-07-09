"""
健康检查端点 — 不经过 DRF 认证/限流/中间件包装
用于负载均衡（SLB）健康探测，返回 DB 和 Redis 连接状态
"""
import json
from django.http import HttpResponse
from django.db import connections
from django.views import View


class HealthCheckView(View):
    """健康检查 — 绕过 DRF 认证和限流"""

    def get(self, request):
        status_code = 200
        db_status = 'up'
        redis_status = 'up'

        # 检查数据库连接
        try:
            cursor = connections['default'].cursor()
            cursor.execute('SELECT 1')
            cursor.fetchone()
        except Exception:
            db_status = 'down'
            status_code = 503

        # 检查 Redis 连接
        try:
            from django_redis import get_redis_connection
            r = get_redis_connection('default')
            r.ping()
        except Exception:
            redis_status = 'down'
            status_code = 503

        body = json.dumps({
            'status': 'ok' if status_code == 200 else 'degraded',
            'db': db_status,
            'redis': redis_status,
        })
        return HttpResponse(body, content_type='application/json', status=status_code)