from django.contrib import admin

from .models import (
    Brand,
    Category,
    SPU,
    SKU,
    Tag,
    SPUTagRelation,
    AdminGroup,
    AdminGroupMember,
    GoodsAuditLog,
    PriceHistory,
    ProductOperationLog,
)
from .models_application import (
    CategoryRenameApplication,
    BrandRenameApplication,
    LeaderChangeApplication,
    CouponApplication,
)
from .models_notification import AdminNotification


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'parent', 'level', 'is_active', 'created_by', 'created_at']
    list_filter = ['level', 'is_active']
    search_fields = ['name']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(SPUTagRelation)
class SPUTagRelationAdmin(admin.ModelAdmin):
    list_display = ['id', 'spu', 'tag']
    list_filter = ['tag']


@admin.register(AdminGroup)
class AdminGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug', 'created_at']
    search_fields = ['name', 'slug']


@admin.register(AdminGroupMember)
class AdminGroupMemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'group', 'user', 'role', 'created_at']
    list_filter = ['role', 'group']
    search_fields = ['user__username']


@admin.register(SPU)
class SPUAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'brand', 'category', 'status', 'submitted_by', 'created_at']
    list_filter = ['status', 'brand', 'category']
    search_fields = ['name']
    readonly_fields = ['status', 'submitted_by', 'submitted_at', 'reviewed_by', 'reviewed_at', 'review_comment', 'deleted_at', 'deleted_by']


@admin.register(SKU)
class SKUAdmin(admin.ModelAdmin):
    list_display = ['id', 'spu', 'spec_values', 'price', 'discount_price', 'stock', 'shelf_status']
    list_filter = ['shelf_status']
    search_fields = ['spu__name']


@admin.register(GoodsAuditLog)
class GoodsAuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'action', 'resource_type', 'resource_id', 'created_at']
    list_filter = ['action', 'resource_type']
    search_fields = ['user__username']
    readonly_fields = ['user', 'action', 'resource_type', 'resource_id', 'changes', 'ip_address', 'created_at']


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'sku', 'old_price', 'new_price', 'changed_by', 'changed_at']
    list_filter = ['changed_at']
    search_fields = ['sku__spu__name']


@admin.register(ProductOperationLog)
class ProductOperationLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'action', 'user', 'spu', 'created_at']
    list_filter = ['action']


# Application models
@admin.register(CategoryRenameApplication)
class CategoryRenameApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'category', 'new_name', 'applicant', 'status', 'created_at']
    list_filter = ['status']


@admin.register(BrandRenameApplication)
class BrandRenameApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'brand', 'new_name', 'applicant', 'status', 'created_at']
    list_filter = ['status']


@admin.register(LeaderChangeApplication)
class LeaderChangeApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'group', 'new_leader', 'applicant', 'status', 'created_at']
    list_filter = ['status']


@admin.register(CouponApplication)
class CouponApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'discount_type', 'amount', 'min_amount', 'applicant', 'status', 'created_at']
    list_filter = ['discount_type', 'status']


@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']
    search_fields = ['user__username']