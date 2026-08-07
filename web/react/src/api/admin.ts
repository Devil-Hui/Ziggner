import { get, post, put, del, patch, postWithProgress, ensureCSRFCookie } from './request';

// ==================== Types ====================

export interface LoginResult { authenticated: boolean; }

export interface AdminUser {
  id: number;
  username: string;
  is_superuser: boolean;
  is_group_leader: boolean;
  group_name?: string;
  group_id?: number;
}

export interface SPUItem {
  id: number;
  name: string;
  brand_name: string;
  category_path: string;
  main_image: string;
  status: string;
  status_display: string;
  price_range: { min: string; max: string } | null;
  sku_count: number;
  specs?: { name: string; values: string[] }[];
  created_at: string;
}

export interface SPUFormData {
  name: string;
  brand_id: number;
  category_id: number;
  main_image?: string;
  description?: string;
  specs?: { name: string; values: string[] }[];
}

export interface SKUItem {
  id: number;
  spec_values: Record<string, string>;
  price: number;
  discount_price: number | null;
  stock: number;
  shelf_status: string;
  sku_code: string;
  barcode: string;
  weight: string;
  track_inventory: boolean;
}

export interface CategoryNode {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
  is_active: boolean;
  children: CategoryNode[];
}

export interface BrandItem {
  id: number;
  name: string;
  logo_url: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface TagItem {
  id: number;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

/** 已保存的媒体项（后端 ProductMedia 返回） */
export interface ProductMediaItem {
  id: number;
  media_type: 'image' | 'video';
  sort_order: number;
  status: 'pending' | 'active' | 'rejected';
  alt_text: string;
  file_size: number;
  thumb_url?: string;
  list_url?: string;
  large_url?: string;
  original_url?: string;
  video_url?: string;
  video_thumb_url?: string;
  video_list_url?: string;
  video_large_url?: string;
  created_at?: string;
}

/** 管理端 SPU 详情完整类型（含 product_kind / media / tags[].color） */
export interface SPUAdminDetail {
  id: number;
  name: string;
  brand_id: number;
  brand_name: string;
  category_id: number;
  category_path: string;
  description: string;
  main_image: string;
  specs: { name: string; values: string[] }[];
  status: string;
  status_display: string;
  submitted_by?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string;
  scheduled_publish_at?: string | null;
  scheduled_unpublish_at?: string | null;
  skus: SKUItem[];
  tags: TagItem[];
  media: ProductMediaItem[];
  product_kind: 'physical' | 'virtual';
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface OperationLogItem {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number;
  changes: Record<string, unknown>;
  ip_address: string;
  user: string;
  created_at: string;
}

export interface ApplicationItem {
  id: number;
  type: string;
  type_label: string;
  status: string;
  applicant_name: string;
  created_at: string;
  reviewed_at: string | null;
  review_comment: string | null;
  detail: Record<string, unknown>;
}

export interface GroupItem {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface GroupMember {
  id: number;
  username: string;
  role: 'leader' | 'member';
}

export interface CouponItem {
  id: number;
  code: string;
  discount_type: 'fixed' | 'percent';
  amount: number;
  min_amount: number;
  max_discount: number | null;
  stackable: boolean;
  start_time: string;
  end_time: string;
  total_count: number;
  claimed_count: number;
  used_count: number;
  created_at: string;
}

// Compatibility aliases used by AdminCoupons.tsx
export type Coupon = CouponItem;
export interface CouponFormData {
  code?: string;
  discount_type: 'fixed' | 'percent';
  amount: number;
  min_amount: number;
  max_discount?: number | null;
  stackable: boolean;
  is_active?: boolean;
  total_count: number;
  start_time: string;
  end_time: string;
}

export interface ActivityItem {
  id: number;
  name: string;
  type: 'full_reduction' | 'percent_off' | 'each_full';
  rule: Array<{ min_amount: number; discount: number; max_discount?: number }>;
  start_time: string;
  end_time: string;
  created_at: string;
}

// Compatibility aliases used by AdminActivities.tsx
export type Activity = ActivityItem;
export interface RuleItem {
  min_amount: number;
  discount: number;
  max_discount?: number;
}
export interface ActivityFormData {
  name: string;
  type: 'full_reduction' | 'percent_off' | 'each_full';
  rule: RuleItem[];
  start_time: string;
  end_time: string;
}

export interface AuditLogItem {
  id: number;
  user: string;
  action: string;
  resource_type: string;
  resource_id: number;
  changes: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface TaskItem {
  task_id: string;
  type: string;
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';
  current: number;
  total: number;
  error_message?: string;
  created_at: string;
}

export interface RecycleItem {
  id: number;
  name: string;
  brand_name: string;
  category_name: string;
  sku_count: number;
  deleted_at: string;
}

export interface PaginatedData<T> {
  /** DRF 标准分页字段 */
  results?: T[];
  /** SPU 列表使用 items 字段 */
  items?: T[];
  /** 后端返回的计数字段 (count 或 total) */
  count?: number;
  total: number;
  page: number;
  /** page_size 或 size */
  page_size?: number;
  size?: number;
}

// ==================== API ====================

export const adminAPI = {
  // Auth
  login: async (email: string, verifyId?: string, verifyCode?: string) => {
    await ensureCSRFCookie();
    return post<LoginResult>('/users/login/', {
      email,
      ...(verifyId && verifyCode ? { verify_id: verifyId, code: verifyCode } : {}),
    });
  },
  logout: () => post('/users/session/logout/', {}),

  // SPU
  getSPUs: (params?: Record<string, unknown>) =>
    get<PaginatedData<SPUItem>>('/goods/spu/admin', params),
  getSPU: (id: number) =>
    get<SPUAdminDetail>(`/goods/spu/${id}/admin`),
  createSPU: (data: SPUFormData) =>
    post<SPUItem>('/goods/spu/create', data),
  createSPUWithMedia: (formData: FormData) =>
    post<SPUItem>('/goods/spu/create', formData),
  updateSPU: (id: number, data: Partial<SPUFormData>) =>
    put<SPUItem>(`/goods/spu/${id}/update`, data),
  deleteSPU: (id: number) =>
    del(`/goods/spu/${id}/delete`),
  submitAudit: (id: number) =>
    post(`/goods/spu/${id}/submit`, {}),
  auditSPU: (id: number, data: { action: string; remark?: string }) =>
    post(`/goods/spu/${id}/audit`, data),
  shelfSPU: (id: number, data: { action: string }) =>
    post(`/goods/spu/${id}/shelf`, data),
  scheduleSPU: (id: number, data: { publish_at?: string; unpublish_at?: string }) =>
    post(`/goods/spu/${id}/schedule`, data),
  duplicateSPU: (id: number) =>
    post(`/goods/spu/${id}/duplicate`, {}),

  // Batch
  batchSPU: (data: { action: string; spu_ids: number[]; data?: Record<string, unknown> }) =>
    post<{ task_id: string }>('/goods/spu/batch', data),
  getBatchProgress: (taskId: string) =>
    get<{ task_id: string; state: string; current: number; total: number }>(`/goods/spu/batch/task/${taskId}`),

  // SKU
  getSKUs: (spuId: number) =>
    get<SKUItem[]>(`/goods/sku/admin?spu_id=${spuId}`),
  batchCreateSKU: (data: Record<string, unknown>) =>
    post<SKUItem[]>('/goods/sku/batch', data),
  updateSKU: (id: number, data: Record<string, unknown>) =>
    put<SKUItem>(`/goods/sku/${id}/update`, data),
  deleteSKU: (id: number) =>
    del(`/goods/sku/${id}/delete`),

  // Category
  getCategoryTree: () =>
    get<CategoryNode[]>('/goods/category/tree'),
  getCategorySubtree: () =>
    get<CategoryNode[]>('/goods/category/subtree'),
  createCategory: (data: { name: string; parent_id: number | null; level: number; admin_group_id?: number }) =>
    post<CategoryNode>('/goods/category/create', data),
  updateCategory: (id: number, data: Record<string, unknown>) =>
    put<CategoryNode>(`/goods/category/${id}/update`, data),
  deleteCategory: (id: number) =>
    del(`/goods/category/${id}/delete`),
  migrateCategory: (data: { from_category_id: number; to_category_id: number }) =>
    post<{ migrated_count: number }>('/goods/category/migrate', data),

  // Brand
  getBrands: () =>
    get<BrandItem[]>('/goods/brand'),
  createBrand: (data: { name: string; logo_url?: string; description?: string; is_active?: boolean }) =>
    post<BrandItem>('/goods/brand/create', data),
  updateBrand: (id: number, data: Partial<BrandItem>) =>
    put<BrandItem>(`/goods/brand/${id}/update`, data),
  deleteBrand: (id: number) =>
    del(`/goods/brand/${id}/delete`),

  // Tag
  getTags: () =>
    get<TagItem[]>('/goods/tag'),
  createTag: (data: { name: string; color?: string; is_active?: boolean }) =>
    post<TagItem>('/goods/tag/create', data),
  updateTag: (id: number, data: Partial<TagItem>) =>
    put<TagItem>(`/goods/tag/${id}/update`, data),
  deleteTag: (id: number) =>
    del(`/goods/tag/${id}/delete`),
  setSPUTags: (data: { spu_id: number; tag_ids: number[] }) =>
    post('/goods/spu_tag', data),
  removeSPUTag: (data: { spu_id: number; tag_ids: number[] }) =>
    del('/goods/spu_tag/remove', data),

  // Media
  /** 获取 SPU 的媒体列表（含 alt_text） */
  getMediaBySPU: (spuId: number) =>
    get<ProductMediaItem[]>(`/goods/media/spu/${spuId}`),
  /** 更新媒体信息（alt_text / sort_order） */
  updateMedia: (mediaId: number, data: { alt_text?: string; sort_order?: number }) =>
    patch<{ id: number; alt_text: string; sort_order: number; message: string }>(
      `/goods/media/${mediaId}/update`, data,
    ),
  /** 删除媒体 */
  deleteMedia: (mediaId: number) =>
    del<{ detail: string }>(`/goods/media/${mediaId}/delete`),
  /** 编辑模式：向已有 SPU 上传图片（四尺寸 FormData，XHR 进度） */
  uploadMedia: (
    spuId: number,
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) =>
    postWithProgress<ProductMediaItem>(
      `/goods/media/spu/${spuId}/upload`, formData, onProgress,
    ),

  // Admin Group
  getAdminGroups: () =>
    get<GroupItem[]>('/goods/admin_group'),
  createAdminGroup: (data: { name: string; slug: string }) =>
    post<GroupItem>('/goods/admin_group/create', data),
  getGroupMembers: (groupId: number) =>
    get<{ members: GroupMember[] }>(`/goods/admin_group/${groupId}/members`),
  addGroupMember: (groupId: number, data: { user_id: number; role: string }) =>
    post(`/goods/admin_group/${groupId}/members`, data),
  removeGroupMember: (groupId: number, userId: number) =>
    del(`/goods/admin_group/${groupId}/members/${userId}`),
  updateGroup: (id: number, data: { name?: string; slug?: string; description?: string }) =>
    put<GroupItem>(`/goods/admin_group/${id}/update`, data),
  deleteGroup: (id: number) =>
    del(`/goods/admin_group/${id}/delete`),

  // Application
  submitApplication: (data: Record<string, unknown>) =>
    post('/goods/application', data),
  getMyApplications: () =>
    get<ApplicationItem[]>('/goods/application/my'),
  getPendingApplications: () =>
    get<ApplicationItem[]>('/goods/application/pending'),
  reviewApplication: (id: number, data: { type: string; action: string; comment?: string }) =>
    post(`/goods/application/${id}/review`, data),
  getStaffList: () =>
    get<{ items: { id: number; username: string; is_superuser: boolean }[] }>('/goods/staff/list'),

  // Notification
  getNotifications: (params?: { page?: number; page_size?: number }) =>
    get<PaginatedData<NotificationItem>>('/goods/notification', params),
  getUnreadCount: () =>
    get<{ unread_count: number }>('/goods/notification/unread_count'),
  markRead: (id: number) =>
    post(`/goods/notification/${id}/read`, {}),
  markAllRead: () =>
    post('/goods/notification/read_all', {}),

  // Operation Logs
  getOperationLogs: (params?: { page?: number; page_size?: number }) =>
    get<PaginatedData<OperationLogItem>>('/notification/logs/', params),

  // Stats
  getAdminStats: () =>
    get<Record<string, unknown>>('/goods/stats'),

  // Audit
  getAuditLogs: (params?: { page?: number; spu_id?: number }) =>
    get<PaginatedData<AuditLogItem>>('/goods/audit_log', params),
  getSPUAuditLog: (spuId: number) =>
    get<AuditLogItem[]>(`/goods/audit_log/${spuId}`),

  // Recycle
  getRecycleList: () =>
    get<RecycleItem[]>('/goods/recycle'),
  restoreSPU: (id: number) =>
    post(`/goods/recycle/${id}/restore`, {}),
  permanentDeleteSPU: (id: number) =>
    del(`/goods/recycle/${id}/permanent`),

  // Task
  getMyTasks: () =>
    get<TaskItem[]>('/goods/task'),
  getTaskProgress: (taskId: string) =>
    get<TaskItem>(`/goods/task/${taskId}`),

  // Coupon
  getCoupons: (params?: { page?: number; search?: string }) =>
    get<PaginatedData<CouponItem>>('/promotion/coupon', params),
  createCoupon: (data: Record<string, unknown>) =>
    post<CouponItem>('/promotion/coupon/create', data),
  updateCoupon: (id: number, data: Record<string, unknown>) =>
    put<CouponItem>(`/promotion/coupon/${id}/update`, data),
  deleteCoupon: (id: number) =>
    del(`/promotion/coupon/${id}/delete`),
  setCouponScope: (id: number, data: { scope_type: string; target_ids: number[] }) =>
    post(`/promotion/coupon/${id}/scope`, data),

  // Activity
  getActivities: (params?: { page?: number; search?: string }) =>
    get<PaginatedData<ActivityItem>>('/promotion/activity', params),
  createActivity: (data: ActivityFormData) =>
    post<Activity>('/promotion/activity/create', data),
  updateActivity: (id: number, data: ActivityFormData) =>
    put<ActivityItem>(`/promotion/activity/${id}/update`, data),
  deleteActivity: (id: number) =>
    del(`/promotion/activity/${id}/delete`),
  setActivitySKUs: (id: number, data: { sku_ids: number[]; activity_price: number }) =>
    post(`/promotion/activity/${id}/skus`, data),
};

export default adminAPI;
