from django.contrib import admin
from .models import Coupon, UserCoupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_type', 'amount', 'min_amount',
                    'used_count', 'total_count', 'is_active', 'start_time', 'end_time']
    list_filter = ['discount_type', 'is_active']
    search_fields = ['code']


@admin.register(UserCoupon)
class UserCouponAdmin(admin.ModelAdmin):
    list_display = ['user', 'coupon', 'status', 'used_at', 'claimed_at']
    list_filter = ['status']
