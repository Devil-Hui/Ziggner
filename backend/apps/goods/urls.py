from django.urls import path

from .views import (
    # 公开 API
    CategoryTreeView, BrandListView, SPUListView, SPUDetailView,
    SKUDetailView, TagListView, HotProductsView, ProductSearchView,
    SearchSuggestView, AdminImageUploadView,
    # Admin SPU
    SPUAdminListView, SPUAdminCreateView, SPUAdminUpdateView,
    SPUAdminDeleteView, SPUAdminDetailView, SPUAdminSubmitView,
    SPUAdminAuditView, SPUAdminShelfView, SPUAdminScheduleView,
    SPUAdminDuplicateView,
    # Admin Batch
    SPUAdminBatchView, SPUAdminBatchTaskView,
    # Admin SKU
    SKUAdminListView, SKUAdminBatchCreateView, SKUAdminUpdateView,
    SKUAdminDeleteView, SKUSearchView,
    # Admin Category
    CategoryAdminCreateView, CategoryAdminUpdateView,
    CategoryAdminDeleteView, CategoryAdminSubtreeView,
    CategoryAdminMigrateView, CategoryAdminAuditView, CategoryPendingListView,
    # Admin Brand
    BrandAdminCreateView, BrandAdminUpdateView, BrandAdminDeleteView,
    # Admin Group
    AdminGroupListView, AdminGroupCreateView, AdminGroupMembersView,
    AdminGroupUpdateView, AdminGroupDeleteView,
    # Admin Tag
    TagAdminCreateView, TagAdminUpdateView, TagAdminDeleteView,
    SPUTagSetView, SPUTagRemoveView,
    # Admin Recycle
    RecycleListView, RecycleRestoreView, RecyclePermanentDeleteView,
    # Admin Audit
    AuditLogListView, SPUAuditLogView,
    AuditLogStatsView, OperationLogListView,
    # Admin Application
    ApplicationSubmitView, ApplicationListView,
    ApplicationPendingListView, ApplicationReviewView,
    StaffListView,
    # Admin Notification
    NotificationListView, NotificationUnreadCountView,
    NotificationReadView, NotificationReadAllView,
    # Admin Stats
    AdminStatsView,
    # Admin Task
    TaskProgressView, TaskListView,
    # Admin Import/Export
    ImportProductsView, ExportProductsView,
    # Admin Media
    MediaListBySPUView, MediaDeleteView, MediaReorderView, MediaUpdateView, MediaCreateView, MediaVideoCreateView,
)

urlpatterns = [
    # ==================== 公开 API ====================
    path('category/tree', CategoryTreeView.as_view(), name='category-tree'),
    path('category/subtree', CategoryAdminSubtreeView.as_view(), name='category-subtree'),
    # 前端兼容别名
    path('categories/', CategoryTreeView.as_view(), name='category-tree-alias'),
    path('brand', BrandListView.as_view(), name='brand-list'),
    path('brands/', BrandListView.as_view(), name='brand-list-alias'),
    path('spu', SPUListView.as_view(), name='spu-list'),
    path('spu/<int:spu_id>', SPUDetailView.as_view(), name='spu-detail'),
    path('sku/<int:sku_id>', SKUDetailView.as_view(), name='sku-detail'),
    path('tag', TagListView.as_view(), name='tag-list'),
    path('hot', HotProductsView.as_view(), name='hot-products'),
    path('search', ProductSearchView.as_view(), name='search'),
    path('search/suggest', SearchSuggestView.as_view(), name='search-suggest'),
    path('upload/image', AdminImageUploadView.as_view(), name='upload-image'),

    # ==================== Admin SPU ====================
    path('spu/admin', SPUAdminListView.as_view(), name='admin-spu-list'),
    path('spu/<int:spu_id>/admin', SPUAdminDetailView.as_view(), name='admin-spu-detail'),
    path('spu/create', SPUAdminCreateView.as_view(), name='admin-spu-create'),
    path('spu/<int:spu_id>/update', SPUAdminUpdateView.as_view(), name='admin-spu-update'),
    path('spu/<int:spu_id>/delete', SPUAdminDeleteView.as_view(), name='admin-spu-delete'),
    path('spu/<int:spu_id>/submit', SPUAdminSubmitView.as_view(), name='admin-spu-submit'),
    path('spu/<int:spu_id>/audit', SPUAdminAuditView.as_view(), name='admin-spu-audit'),
    path('spu/<int:spu_id>/shelf', SPUAdminShelfView.as_view(), name='admin-spu-shelf'),
    path('spu/<int:spu_id>/schedule', SPUAdminScheduleView.as_view(), name='admin-spu-schedule'),
    path('spu/<int:spu_id>/duplicate', SPUAdminDuplicateView.as_view(), name='admin-spu-duplicate'),
    path('spu/batch', SPUAdminBatchView.as_view(), name='admin-spu-batch'),
    path('spu/batch/task/<str:task_id>', SPUAdminBatchTaskView.as_view(), name='admin-spu-batch-task'),
    path('spu/import', ImportProductsView.as_view(), name='admin-spu-import'),
    path('spu/export', ExportProductsView.as_view(), name='admin-spu-export'),

    # ==================== Admin SKU ====================
    path('sku/admin', SKUAdminListView.as_view(), name='admin-sku-list'),
    path('sku/search', SKUSearchView.as_view(), name='admin-sku-search'),
    path('sku/batch', SKUAdminBatchCreateView.as_view(), name='admin-sku-batch-create'),
    path('sku/<int:sku_id>/update', SKUAdminUpdateView.as_view(), name='admin-sku-update'),
    path('sku/<int:sku_id>/delete', SKUAdminDeleteView.as_view(), name='admin-sku-delete'),

    # ==================== Admin Category ====================
    path('category/create', CategoryAdminCreateView.as_view(), name='admin-category-create'),
    path('category/<int:category_id>/update', CategoryAdminUpdateView.as_view(), name='admin-category-update'),
    path('category/<int:category_id>/delete', CategoryAdminDeleteView.as_view(), name='admin-category-delete'),
    path('category/migrate', CategoryAdminMigrateView.as_view(), name='admin-category-migrate'),
    path('category/<int:category_id>/audit', CategoryAdminAuditView.as_view(), name='admin-category-audit'),
    path('category/pending', CategoryPendingListView.as_view(), name='admin-category-pending'),

    # ==================== Admin Brand ====================
    path('brand/create', BrandAdminCreateView.as_view(), name='admin-brand-create'),
    path('brand/<int:brand_id>/update', BrandAdminUpdateView.as_view(), name='admin-brand-update'),
    path('brand/<int:brand_id>/delete', BrandAdminDeleteView.as_view(), name='admin-brand-delete'),

    # ==================== Admin Group ====================
    # 注意：视图签名用 group_ref/user_ref（_resolve_group 兼容数字 id 与 slug），
    # 路由 kwarg 必须同名，否则 DRF 缺参 TypeError → 500。历史 <int:group_id>/<int:user_id>
    # 与视图不匹配导致 /goods/admin_group/{id}/members 等全部 500（前端走 slug 版
    # /api/v1/admin/groups/ 未暴露，但 id 版为文档标准路径且旧调用方仍可能使用）。
    path('admin_group', AdminGroupListView.as_view(), name='admin-group-list'),
    path('admin_group/create', AdminGroupCreateView.as_view(), name='admin-group-create'),
    path('admin_group/<str:group_ref>/members', AdminGroupMembersView.as_view(), name='admin-group-members'),
    path('admin_group/<str:group_ref>/members/<str:user_ref>', AdminGroupMembersView.as_view(), name='admin-group-member-delete'),
    path('admin_group/<str:group_ref>/update', AdminGroupUpdateView.as_view(), name='admin-group-update'),
    path('admin_group/<str:group_ref>/delete', AdminGroupDeleteView.as_view(), name='admin-group-delete'),
    # 前端兼容别名
    path('admin/admin-groups/', AdminGroupListView.as_view(), name='admin-group-list-alias'),

    # ==================== Admin SPU (fe) ====================
    # 前端兼容别名 — AdminProducts 调用 /admin/spus/
    path('admin/spus/', SPUAdminListView.as_view(), name='admin-spu-list-alias'),

    # ==================== Admin Tag ====================
    path('tag/create', TagAdminCreateView.as_view(), name='admin-tag-create'),
    path('tag/<int:tag_id>/update', TagAdminUpdateView.as_view(), name='admin-tag-update'),
    path('tag/<int:tag_id>/delete', TagAdminDeleteView.as_view(), name='admin-tag-delete'),
    path('spu_tag', SPUTagSetView.as_view(), name='admin-spu-tag-set'),
    path('spu_tag/remove', SPUTagRemoveView.as_view(), name='admin-spu-tag-remove'),

    # ==================== Admin Application ====================
    path('application', ApplicationSubmitView.as_view(), name='admin-application-submit'),
    path('application/my', ApplicationListView.as_view(), name='admin-application-my'),
    path('application/pending', ApplicationPendingListView.as_view(), name='admin-application-pending'),
    path('application/<int:app_id>/review', ApplicationReviewView.as_view(), name='admin-application-review'),
    path('staff/list', StaffListView.as_view(), name='admin-staff-list'),

    # ==================== Admin Notification ====================
    path('notification', NotificationListView.as_view(), name='admin-notification-list'),
    path('notification/unread_count', NotificationUnreadCountView.as_view(), name='admin-notification-unread'),
    path('notification/<int:notification_id>/read', NotificationReadView.as_view(), name='admin-notification-read'),
    path('notification/read_all', NotificationReadAllView.as_view(), name='admin-notification-read-all'),

    # ==================== Admin Stats ====================
    path('stats', AdminStatsView.as_view(), name='admin-stats'),

    # ==================== Admin Audit ====================
    path('audit_log', AuditLogListView.as_view(), name='admin-audit-log'),
    path('audit_log/stats', AuditLogStatsView.as_view(), name='admin-audit-log-stats'),
    path('audit_log/<int:spu_id>', SPUAuditLogView.as_view(), name='admin-spu-audit-log'),
    path('operation_log', OperationLogListView.as_view(), name='admin-operation-log'),

    # ==================== Admin Recycle ====================
    path('recycle', RecycleListView.as_view(), name='admin-recycle-list'),
    path('recycle/<int:spu_id>/restore', RecycleRestoreView.as_view(), name='admin-recycle-restore'),
    path('recycle/<int:spu_id>/permanent', RecyclePermanentDeleteView.as_view(), name='admin-recycle-permanent'),

    # ==================== Admin Task ====================
    path('task/<str:task_id>', TaskProgressView.as_view(), name='admin-task-progress'),
    path('task', TaskListView.as_view(), name='admin-task-list'),

    # ==================== Admin Media ====================
    path('media/spu/<int:spu_id>', MediaListBySPUView.as_view(), name='media-spu-list'),
    path('media/spu/<int:spu_id>/upload', MediaCreateView.as_view(), name='media-create'),
    path('media/spu/<int:spu_id>/video/upload', MediaVideoCreateView.as_view(), name='media-video-create'),
    path('media/<int:media_id>/delete', MediaDeleteView.as_view(), name='media-delete'),
    path('media/<int:media_id>/update', MediaUpdateView.as_view(), name='media-update'),
    path('media/reorder', MediaReorderView.as_view(), name='media-reorder'),
]