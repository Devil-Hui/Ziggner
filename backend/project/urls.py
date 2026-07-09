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

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path('', include('django_prometheus.urls')),
    path("admin/", admin.site.urls),
    # 生成 OpenAPI 3 schema
    path("api/users/", include("apps.users.urls")),
    path("api/goods/", include("apps.goods.urls")),
    path("api/cart/", include("apps.cart.urls")),
    path("api/order/", include("apps.order.urls")),
    path("api/address/", include("apps.address.urls")),
    path("api/payment/", include("apps.payment.urls")),
    path("api/review/", include("apps.review.urls")),
    path("api/notification/", include("apps.notification.urls")),
    path("api/promotion/", include("apps.promotion.urls")),
    path("api/lovegoods/", include("apps.lovegoods.urls")),
    path("api/tracking/", include("apps.tracking.urls")),
    path("api/support/", include("apps.support.urls")),
    path("api/chat/", include("apps.customer_service.urls")),
    path("api/terms/", include("apps.terms.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # === v1 版本路由（规范，与上面指向同一 View，未来 /api/v2/ 可独立演进） ===
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/goods/", include("apps.goods.urls")),
    path("api/v1/cart/", include("apps.cart.urls")),
    path("api/v1/order/", include("apps.order.urls")),
    path("api/v1/address/", include("apps.address.urls")),
    path("api/v1/payment/", include("apps.payment.urls")),
    path("api/v1/review/", include("apps.review.urls")),
    path("api/v1/notification/", include("apps.notification.urls")),
    path("api/v1/promotion/", include("apps.promotion.urls")),
    path("api/v1/lovegoods/", include("apps.lovegoods.urls")),
    path("api/v1/tracking/", include("apps.tracking.urls")),
    path("api/v1/support/", include("apps.support.urls")),
    path("api/v1/chat/", include("apps.customer_service.urls")),
    path("api/v1/terms/", include("apps.terms.urls")),
    # Swagger UI
    path("api/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # ReDoc 文档
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    if settings.FILE_STORAGE == 'local' and settings.MEDIA_URL.strip('/'):
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
