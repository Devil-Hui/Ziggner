"""
WSGI config for project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

# gevent monkey-patch 必须早于任何 boto3/urllib3/ssl 导入执行：
# 否则上传媒体（boto3 构建 ssl_context）会触发 gevent SSLContext.options
# setter 无限递归（RecursionError）→ worker 崩溃 → 502 / ERR_CONNECTION_CLOSED。
# 该模块仅由 gunicorn 加载；celery / daphne 不经过此处，不受影响。
try:  # pragma: no cover - 仅 gunicorn 环境存在 gevent
    from gevent import monkey
    monkey.patch_all()
except ImportError:
    pass

import os

from django.core.wsgi import get_wsgi_application

# 服务入口默认 prod（fail-closed）；Docker/CI 必须显式设 DJANGO_ENV。
from project.runtime_env import resolve_settings_module

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    resolve_settings_module(default='prod'),
)

application = get_wsgi_application()
