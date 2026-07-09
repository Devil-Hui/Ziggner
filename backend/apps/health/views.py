"""Health check endpoint — verifies DB + Redis + RabbitMQ connectivity."""
import logging

from django.db import connections
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('biz')


def health_check(request):
    """GET /health/ — 200 if all services reachable, 503 otherwise."""
    statuses = {}

    # DB check
    try:
        connections['default'].cursor().execute('SELECT 1')
        statuses['db'] = 'ok'
    except Exception as e:
        statuses['db'] = f'error: {e}'

    # Redis check
    try:
        cache.set('health_check', '1', timeout=10)
        if cache.get('health_check') == '1':
            statuses['redis'] = 'ok'
        else:
            statuses['redis'] = 'error: read failed'
        cache.delete('health_check')
    except Exception as e:
        statuses['redis'] = f'error: {e}'

    # RabbitMQ check (via Celery)
    try:
        from project.celery import app as celery_app
        result = celery_app.control.ping(timeout=2)
        statuses['celery'] = 'ok' if result else 'error: no response'
    except Exception as e:
        statuses['celery'] = f'error: {e}'

    healthy = all(v == 'ok' for v in statuses.values())
    return JsonResponse(
        {'status': 'healthy' if healthy else 'degraded', 'checks': statuses},
        status=200 if healthy else 503,
    )
