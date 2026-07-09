from django.contrib import admin
from .models import PaymentLog, RefundLog


@admin.register(PaymentLog)
class PaymentLogAdmin(admin.ModelAdmin):
    list_display = ['payment_no', 'user', 'order', 'amount', 'method', 'status', 'created_at']
    list_filter = ['status', 'method']
    search_fields = ['payment_no', 'order__order_no']
    readonly_fields = ['payment_no']


@admin.register(RefundLog)
class RefundLogAdmin(admin.ModelAdmin):
    list_display = ['refund_no', 'payment', 'amount', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['refund_no', 'payment__payment_no']
    readonly_fields = ['refund_no']
