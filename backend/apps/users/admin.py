from django.contrib import admin

from apps.users.models import (
    UserProfile, ExpiringToken, SMSVerificationCode, EmailTemplate,
)


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    """邮件模板管理（管理后台可编辑发送内容）"""
    list_display = ['template_type', 'subject', 'is_active', 'updated_at']
    list_filter = ['is_active', 'template_type']
    search_fields = ['subject', 'html_body']


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
