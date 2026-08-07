"""
ASGI config for project.

支持 HTTP 和 WebSocket:
- HTTP → Django ASGI application
- WebSocket → Django Channels (customer_service routing)
"""

import os

from django.core.asgi import get_asgi_application

# 服务入口默认 prod；与 wsgi/celery 共用 project.runtime_env。
from project.runtime_env import resolve_settings_module

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    resolve_settings_module(default='prod'),
)

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from apps.customer_service.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
