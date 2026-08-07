from django.urls import path
from .views import (
    AfterSaleApplyView, AfterSaleDetailView,
    OrderCancelView, OrderCheckoutView, OrderConfirmView,
    OrderDetailView, OrderListView,
)
from .admin_views import (
    OrderAdminListView, OrderAdminDetailView,
    OrderAdminShipView, OrderAdminCancelView,
    AfterSaleAdminListView, AfterSaleAdminReviewView,
)

urlpatterns = [
    # Admin first (avoid capture by <str:order_no>)
    path('admin/list/', OrderAdminListView.as_view(), name='order-admin-list'),
    path('admin/aftersale/', AfterSaleAdminListView.as_view(), name='order-admin-aftersale-list'),
    path('admin/aftersale/<str:after_sale_no>/review/', AfterSaleAdminReviewView.as_view(), name='order-admin-aftersale-review'),
    path('admin/<str:order_no>/ship/', OrderAdminShipView.as_view(), name='order-admin-ship'),
    path('admin/<str:order_no>/cancel/', OrderAdminCancelView.as_view(), name='order-admin-cancel'),
    path('admin/<str:order_no>/', OrderAdminDetailView.as_view(), name='order-admin-detail'),

    # Public / user
    path('checkout/', OrderCheckoutView.as_view(), name='order-checkout'),
    path('', OrderListView.as_view(), name='order-list'),
    path('<str:order_no>/', OrderDetailView.as_view(), name='order-detail'),
    path('<str:order_no>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<str:order_no>/confirm/', OrderConfirmView.as_view(), name='order-confirm'),
    path('<str:order_no>/aftersale/', AfterSaleApplyView.as_view(), name='order-aftersale-apply'),
    path('<str:order_no>/aftersale/detail/', AfterSaleDetailView.as_view(), name='order-aftersale-detail'),
]
