"""
URL configuration for project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.conf import settings
from django.conf.urls.static import static
from utils.health_check import HealthCheckView
from utils.versioned_router import router
from apps.goods import urls_admin_group_slug

# ── API 路由注册表（通过 VersionedAPIRouter） ──
# 新 app 只需在此添加一行，自动注册到 /api/ 和 /api/v1/
# 当某 app 的 v2 版本需要不同视图时，使用 router.register_v2() 替代
_API_APPS = [
    "apps.users.urls",
    "apps.goods.urls",
    "apps.cart.urls",
    "apps.order.urls",
    "apps.address.urls",
    "apps.payment.urls",
    "apps.review.urls",
    "apps.notification.urls",
    "apps.promotion.urls",
    "apps.lovegoods.urls",
    "apps.tracking.urls",
    "apps.logistics.urls",
    "apps.support.urls",
    "apps.customer_service.urls",
    "apps.rbac.urls",
]

_APP_NAMES = [
    "users", "goods", "cart", "order", "address", "payment",
    "review", "notification", "promotion", "lovegoods",
    "tracking", "logistics", "support", "chat", "rbac",
]

for name, url_conf in zip(_APP_NAMES, _API_APPS):
    router.register(name, url_conf)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path('', include('django_prometheus.urls')),
    path("admin/", admin.site.urls),
    # OpenAPI 3 schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# 通过 VersionedAPIRouter 注册所有 API 路由
urlpatterns += router.get_urlpatterns()

# 管理员命名空间（与普通用户自助面 /api/v1/users/ 分离）：
# 仅超管/运维可达，且只用 account_no 指认用户、用 slug 寻址分组，绝不暴露内部自增 id。
# 仅挂载 /api/v1/admin/（无前缀旧版 /api/admin/ 已废弃，见 utils/versioned_router）。
urlpatterns += [
    # 分组管理：复用已有的 id 版 AdminGroup* 视图（数字 group_id / user_id 寻址），
    # 与已部署前端（Cloudflare Pages 构建）的分组端点契约一致。
    path('api/v1/admin/groups/', include(urls_admin_group_slug)),
    # 用户管理：沿用既有 account_no 寻址实现（apps.users.admin_urls）。
    # 此命名空间为 /admin/rbac 页面的用户列表、创建管理员、角色指派提供后端，
    # 与分组（goods id 版）是两个独立领域。
    path('api/v1/admin/users/', include('apps.users.admin_urls')),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    if settings.FILE_STORAGE == 'local' and settings.MEDIA_URL.strip('/'):
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
