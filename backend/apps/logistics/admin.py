from django.contrib import admin
from .models import Carrier, ShippingRate, Shipment


@admin.register(Carrier)
class CarrierAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'sort_order']
    list_filter = ['is_active']
    search_fields = ['name', 'code']


@admin.register(ShippingRate)
class ShippingRateAdmin(admin.ModelAdmin):
    list_display = ['carrier', 'name', 'price', 'estimated_days', 'is_active']
    list_filter = ['carrier', 'is_active']
    search_fields = ['name']


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ['order_no', 'carrier', 'tracking_no', 'status', 'created_at']
    list_filter = ['status', 'carrier']
    search_fields = ['order_no', 'tracking_no']
