from rest_framework.permissions import BasePermission
from django.contrib.auth.models import User
from logging import getLogger

logger = getLogger(__name__)


class ApiPermission(BasePermission):
    def has_permission(self, request, view):
        # 检查请求头中是否有有效的 Token
        return request.user and request.user.is_active
