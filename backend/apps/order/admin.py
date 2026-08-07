from django.contrib import admin
from .models import Order, OrderItem, AfterSale


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ['spu_name', 'sku_code', 'spec_snapshot', 'price', 'quantity', 'subtotal', 'sku']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """只读兜底：日常管理走 /api/order/admin/* DRF 接口。"""
    list_display = ['order_no', 'user', 'status', 'payment_status',
                    'actual_amount', 'shipping_name', 'created_at']
    list_filter = ['status', 'payment_status']
    search_fields = ['order_no', 'shipping_name', 'shipping_phone']
    readonly_fields = [
        'order_no', 'user', 'status', 'total_amount', 'actual_amount',
        'shipping_name', 'shipping_phone', 'shipping_address', 'currency',
        'payment_method', 'payment_status', 'payment_no',
        'paid_at', 'tracking_no', 'shipped_at', 'delivered_at',
        'completed_at', 'cancelled_at', 'cancel_reason',
        'buyer_remark', 'seller_remark', 'version', 'created_at', 'updated_at',
    ]
    actions = None
    inlines = [OrderItemInline]

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(AfterSale)
class AfterSaleAdmin(admin.ModelAdmin):
    """只读兜底：审核走 /api/order/admin/aftersale/*/review/。"""
    list_display = ['after_sale_no', 'order', 'type', 'amount', 'status', 'created_at']
    list_filter = ['status', 'type']
    search_fields = ['after_sale_no', 'order__order_no']
    readonly_fields = [
        'after_sale_no', 'order', 'type', 'reason', 'amount', 'status',
        'evidence', 'admin_remark', 'refunded_at', 'created_at', 'updated_at',
    ]
    actions = None

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
