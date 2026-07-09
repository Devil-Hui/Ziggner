from django.urls import path
from .views import (
    AfterSaleApplyView, AfterSaleDetailView,
    OrderCancelView, OrderCheckoutView, OrderConfirmView,
    OrderDetailView, OrderListView,
)

urlpatterns = [
    path('checkout/', OrderCheckoutView.as_view(), name='order-checkout'),
    path('', OrderListView.as_view(), name='order-list'),
    path('<str:order_no>/', OrderDetailView.as_view(), name='order-detail'),
    path('<str:order_no>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<str:order_no>/confirm/', OrderConfirmView.as_view(), name='order-confirm'),
    path('<str:order_no>/aftersale/', AfterSaleApplyView.as_view(), name='order-aftersale-apply'),
    path('<str:order_no>/aftersale/detail/', AfterSaleDetailView.as_view(), name='order-aftersale-detail'),
]
