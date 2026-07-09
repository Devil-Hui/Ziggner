from django.contrib import admin
from .models import Order, OrderItem, AfterSale


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['spu_name', 'sku_code', 'spec_snapshot', 'price', 'quantity', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_no', 'user', 'status', 'payment_status',
                    'actual_amount', 'shipping_name', 'created_at']
    list_filter = ['status', 'payment_status']
    search_fields = ['order_no', 'shipping_name', 'shipping_phone']
    readonly_fields = ['order_no', 'total_amount', 'actual_amount',
                       'paid_at', 'shipped_at', 'delivered_at',
                       'completed_at', 'cancelled_at']
    actions = ['ship_orders']
    inlines = [OrderItemInline]

    @admin.action(description='Ship selected orders (fill tracking_no)')
    def ship_orders(self, request, queryset):
        count = 0
        for order in queryset:
            try:
                order.ship(tracking_no='')
                count += 1
            except ValueError as e:
                self.message_user(request, f'{order.order_no}: {e}', level='WARNING')
        if count:
            self.message_user(request, f'{count} order(s) shipped.')


@admin.register(AfterSale)
class AfterSaleAdmin(admin.ModelAdmin):
    list_display = ['after_sale_no', 'order', 'type', 'amount', 'status', 'created_at']
    list_filter = ['status', 'type']
    search_fields = ['after_sale_no', 'order__order_no']
    readonly_fields = ['after_sale_no']
    actions = ['approve_aftersales', 'reject_aftersales', 'complete_refund']

    @admin.action(description='Approve selected after-sales')
    def approve_aftersales(self, request, queryset):
        for a in queryset:
            try:
                a.approve()
            except ValueError as e:
                self.message_user(request, f'{a.after_sale_no}: {e}', level='WARNING')

    @admin.action(description='Reject selected after-sales')
    def reject_aftersales(self, request, queryset):
        for a in queryset:
            try:
                a.reject()
            except ValueError as e:
                self.message_user(request, f'{a.after_sale_no}: {e}', level='WARNING')

    @admin.action(description='Complete refund')
    def complete_refund(self, request, queryset):
        for a in queryset:
            try:
                a.complete_refund()
                self.message_user(
                    request,
                    f'{a.after_sale_no}: Refund completed.',
                )
            except ValueError as e:
                self.message_user(request, f'{a.after_sale_no}: {e}', level='WARNING')
