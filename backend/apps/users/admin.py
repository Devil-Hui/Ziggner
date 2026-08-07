from django.contrib import admin

from apps.users.models import UserProfile, ExpiringToken, SMSVerificationCode


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """用户扩展信息管理"""
    list_display = ['user', 'country_code', 'phone', 'phone_verified', 'created_at']
    search_fields = ['user__username', 'phone', 'country_code']
    list_filter = ['phone_verified', 'created_at']
    raw_id_fields = ['user']


@admin.register(ExpiringToken)
class ExpiringTokenAdmin(admin.ModelAdmin):
    list_display = ['key', 'user', 'created_at', 'expires_at']
    search_fields = ['user__username']
    raw_id_fields = ['user']


@admin.register(SMSVerificationCode)
class SMSVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ['phone', 'country_code', 'code', 'is_used', 'created_at', 'expires_at']
    list_filter = ['is_used', 'created_at']
    search_fields = ['phone', 'country_code']
