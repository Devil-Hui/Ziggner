"""客服系统 WebSocket 路由"""

from django.urls import re_path
from .consumers import CustomerServiceConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<conv_id>\d+)/$', CustomerServiceConsumer.as_asgi()),
]
