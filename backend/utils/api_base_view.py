from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser, AllowAny
from utils.api_permission import ApiPermission
from utils.api_jwt_authentication import UsersJWTAuthentication
from utils.api_base_pagination import BasePagination, AdminPagination
from utils.admin_authentication import ExpiringTokenAuthentication
import logging

logger = logging.getLogger('biz')


class PublicApiView(APIView):
    """公开接口基类：无需认证，允许匿名访问。"""
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = BasePagination

    def paginate_queryset(self, queryset):
        self.paginator = self.pagination_class()
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        return self.paginator.get_paginated_response(data)


class BaseApiView(APIView):
    """
    用户端基础视图基类。
    
    ⚠️ 安全说明:
    默认 permission_classes = [ApiPermission] 仅检查 user.is_active，
    不检查 staff/superuser 角色。新增视图若包含敏感操作，必须
    显式覆盖 permission_classes 以添加更严格的权限检查。
    
    所有 Admin 视图应使用 AdminApiView 或显式设置 IsAdminUser 类权限。
    """
    authentication_classes = [UsersJWTAuthentication]
    permission_classes = [ApiPermission]
    pagination_class = BasePagination

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        # 运行时守卫：检测新子类的默认权限是否未覆盖
        # 警告：此检测在模块导入时触发，不拦截请求
        if 'permission_classes' not in cls.__dict__:
            logger.info(
                f'BaseApiView 子类 {cls.__name__} 未覆盖 permission_classes，'
                f'使用默认值 {cls.permission_classes}（仅检查 is_active）'
            )

    def paginate_queryset(self, queryset):
        self.paginator = self.pagination_class()
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        return self.paginator.get_paginated_response(data)


class AdminApiView(APIView):
    authentication_classes = [ExpiringTokenAuthentication]
    permission_classes = [IsAdminUser]
    pagination_class = AdminPagination

    def paginate_queryset(self, queryset):
        self.paginator = self.pagination_class()
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        return self.paginator.get_paginated_response(data)