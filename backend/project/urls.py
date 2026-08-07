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

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    if settings.FILE_STORAGE == 'local' and settings.MEDIA_URL.strip('/'):
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
