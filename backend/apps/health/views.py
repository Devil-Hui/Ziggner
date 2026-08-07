"""Health check endpoint — MySQL-only (DB + DatabaseCache + optional Celery ping)."""
import logging

from django.db import connections
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('biz')


def health_check(request):
    """GET /health/ — 200 if core services reachable, 503 otherwise."""
    statuses = {}

    try:
        connections['default'].cursor().execute('SELECT 1')
        statuses['db'] = 'ok'
    except Exception as e:
        statuses['db'] = f'error: {e}'

    try:
        cache.set('health_check', '1', timeout=10)
        if cache.get('health_check') == '1':
            statuses['cache'] = 'ok'
        else:
            statuses['cache'] = 'error: read failed'
        cache.delete('health_check')
    except Exception as e:
        statuses['cache'] = f'error: {e}'

    # Celery 可选：worker 未起时标记 degraded 但不强制 503（单机可先起 API）
    try:
        from project.celery import app as celery_app
        result = celery_app.control.ping(timeout=2)
        statuses['celery'] = 'ok' if result else 'warn: no workers'
    except Exception as e:
        statuses['celery'] = f'warn: {e}'

    critical_ok = statuses.get('db') == 'ok' and statuses.get('cache') == 'ok'
    return JsonResponse(
        {
            'status': 'healthy' if critical_ok else 'degraded',
            'infra': 'mysql-only',
            'checks': statuses,
        },
        status=200 if critical_ok else 503,
    )
