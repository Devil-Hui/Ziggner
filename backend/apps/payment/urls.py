from django.urls import path
from .views import CreatePaymentView, MockPaymentCompleteView, PaymentWebhookView, \
    PaymentStatusView, RefundView, RefundStatusView, RefundListView

urlpatterns = [
    path('create/', CreatePaymentView.as_view(), name='payment-create'),
    path('mock/<str:payment_no>/complete/', MockPaymentCompleteView.as_view(), name='mock-payment-complete'),
    path('refund/', RefundView.as_view(), name='payment-refund'),
    path('refund/<str:order_no>/', RefundStatusView.as_view(), name='refund-status'),
    path('refunds/', RefundListView.as_view(), name='refund-list'),
    path('webhook/<str:gateway>/', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('status/<str:order_no>/', PaymentStatusView.as_view(), name='payment-status'),
]
