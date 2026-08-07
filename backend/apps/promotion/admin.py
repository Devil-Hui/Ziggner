from django.contrib import admin
from .models import Coupon, CouponApplication, CouponApprovalHistory, UserCoupon


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


@admin.register(CouponApplication)
class CouponApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'coupon_name', 'discount_type', 'amount', 'applicant',
        'admin_group', 'status', 'created_at',
    ]
    list_filter = ['discount_type', 'status', 'admin_group']
    search_fields = ['coupon_name', 'coupon_code', 'applicant__username']
    readonly_fields = ['submitted_at', 'reviewed_at', 'created_at', 'updated_at']


@admin.register(CouponApprovalHistory)
class CouponApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'application', 'actor', 'from_status', 'to_status', 'created_at']
    list_filter = ['from_status', 'to_status']
    readonly_fields = [
        'application', 'actor', 'from_status', 'to_status', 'comment',
        'snapshot', 'created_at',
    ]

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
