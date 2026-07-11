from django.contrib import admin
from .models import Carrier, ShippingRate, Shipment


@admin.register(Carrier)
class CarrierAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']


@admin.register(ShippingRate)
class ShippingRateAdmin(admin.ModelAdmin):
    list_display = ['carrier', 'rate_type', 'price', 'is_active']
    list_filter = ['carrier', 'rate_type', 'is_active']


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'carrier', 'tracking_no', 'status', 'created_at']
    list_filter = ['status', 'carrier']
    search_fields = ['tracking_no']
