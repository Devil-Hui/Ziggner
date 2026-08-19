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
  /** 显式 SKU 列表：创建时随请求提交，后端据此创建 SKU 并跳过 specs 自动生成 */
  skus?: {
    spec_values: Record<string, string>;
    price: string | number;
    stock: number;
    discount_price?: string | number | null;
    shelf_status?: string;
    sku_code?: string;
    barcode?: string;
    weight?: string;
    track_inventory?: boolean;
  }[];
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
  spu_name?: string;
  spu_id?: number;
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
  read_at?: string | null;
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
  account_no: string;
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

/** 专属推广码（引流追踪）：同一张基础券可挂多个推广码 */
export interface PromoCodeItem {
  id: number;
  coupon: number;
  coupon_code: string;
  code: string;
  name: string;
  note: string;
  is_active: boolean;
  claim_count: number;
  paid_order_count: number;
  gmv: number | string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  /** 看板聚合：独立领取用户数 */
  unique_users?: number;
}

export interface PromoCodeCreateData {
  codes?: string[];
  count?: number;
  prefix?: string;
  name?: string;
  note?: string;
}

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

/** 优惠券审核申请（promotion 端点）：coupon 为嵌套对象含 id */
export interface CouponApplicationItem {
  id: number;
  status: string;
  coupon?: { id: number } | number | null;
  coupon_name?: string;
  coupon_code?: string;
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
  login: async (email: string, verifyId?: string, verifyCode?: string, turnstileToken?: string, password?: string, username?: string) => {
    await ensureCSRFCookie();
    return post<LoginResult>('/users/login/', {
      email,
      ...(verifyId && verifyCode ? { verify_id: verifyId, code: verifyCode } : {}),
      ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      ...(password ? { password } : {}),
      ...(username ? { username } : {}),
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
  searchSKUs: (q: string) =>
    get<{ items: (SKUItem & { spu_name: string; spu_id: number })[] }>(`/goods/sku/search?q=${encodeURIComponent(q)}&limit=20`),
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

  // Admin Group —— 管理面统一走 /api/admin/groups/，分组以 slug 寻址、成员以 account_no
  // 指认（不暴露内部 id、不以 PII 查询）。列表/创建仍带 id 仅用于 AdminCategories /
  // AdminApplications 设置 admin_group_id 外键关联，寻址一律用 slug。
  getAdminGroups: () =>
    get<GroupItem[]>('/admin/groups/'),
  createAdminGroup: (data: { name: string; slug: string }) =>
    post<GroupItem>('/admin/groups/create/', data),
  getGroupMembers: (slug: string) =>
    get<{ slug: string; name: string; members: GroupMember[] }>(`/admin/groups/${slug}/members`),
  addGroupMember: (slug: string, data: { account_no: string; role: string }) =>
    post(`/admin/groups/${slug}/members`, data),
  removeGroupMember: (slug: string, accountNo: string) =>
    del(`/admin/groups/${slug}/members/${accountNo}`),
  updateGroup: (slug: string, data: { name?: string; slug?: string; description?: string }) =>
    put<GroupItem>(`/admin/groups/${slug}/update`, data),
  deleteGroup: (slug: string) =>
    del(`/admin/groups/${slug}/delete`),

  // 管理员账号（超管创建/开通，与普通用户自助注册分离）
  // email 必填；first_name / last_name / role 必填；其余可选。
  createAdminUser: (data: {
    username: string;
    password: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'superadmin' | 'ops' | 'admin_leader' | 'admin_member';
    country_code?: string;
    phone?: string;
    department?: string;
    is_active?: boolean;
    note?: string;
    locale?: string;
    group_slug?: string;
    group_role?: 'leader' | 'member';
  }) =>
    post<{ account_no?: string; id?: number; username: string; email?: string; first_name?: string; last_name?: string; is_active: boolean; roles?: string[] }>('/admin/users/create/', data),

  // Application
  submitApplication: (data: Record<string, unknown>) =>
    post('/goods/application', data),
  getMyApplications: () =>
    get<ApplicationItem[]>('/goods/application/my'),
  getPendingApplications: () =>
    get<ApplicationItem[]>('/goods/application/pending'),
  reviewApplication: (id: number, data: { type: string; action: string; comment?: string }) =>
    post(`/goods/application/${id}/review`, data),
  // 优惠券草稿：提交审核 / 编辑（复用 promotion 端点，覆盖草稿与驳回态）
  submitCouponApplication: (id: number) =>
    post(`/promotion/application/${id}/submit/`, {}),
  updateCouponApplication: (id: number, data: Record<string, unknown>) =>
    patch(`/promotion/application/${id}/`, data),
  // 优惠券审核申请：当前用户申请列表 + 新建草稿（super admin 可直接为已有券发起）
  getMyCouponApplications: () =>
    get<{ items: CouponApplicationItem[] }>('/promotion/application/my/'),
  createCouponApplication: (data: Record<string, unknown>) =>
    post<CouponApplicationItem>('/promotion/application/', data),
  getStaffList: () =>
    get<{ items: { id: number; username: string; is_superuser: boolean }[] }>('/goods/staff/list'),

  // Notification（统一走通用通知中心 /notification/，含客服消息 cs_* 通知）
  getNotifications: (params?: { page?: number; per_page?: number }) =>
    get<PaginatedData<NotificationItem>>('/notification/', params),
  getUnreadCount: () =>
    get<{ unread_count: number }>('/notification/unread_count/'),
  markRead: (id: number) =>
    post(`/notification/${id}/read/`, {}),
  markAllRead: () =>
    post('/notification/read-all/', {}),

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

  // Promo Code（专属券推广码 / 引流追踪）
  getPromoCodes: (couponId: number) =>
    get<PromoCodeItem[]>(`/promotion/coupon/${couponId}/promo-codes`),
  createPromoCodes: (couponId: number, data: PromoCodeCreateData) =>
    post<PromoCodeItem[]>(`/promotion/coupon/${couponId}/promo-codes`, data),
  getPromoDashboard: (couponId: number) =>
    get<PromoCodeItem[]>(`/promotion/coupon/${couponId}/promo-dashboard`),
  // 单码更新（启用/停用、改名改备注）
  updatePromoCode: (id: number, data: Partial<Pick<PromoCodeItem, 'is_active' | 'name' | 'note'>>) =>
    patch<PromoCodeItem>(`/promotion/coupon/promo/${id}/`, data),
  // 单码删除
  deletePromoCode: (id: number) =>
    del<{ message: string }>(`/promotion/coupon/promo/${id}/`),

  // Activity
  getActivities: (params?: { page?: number; search?: string }) =>
    get<PaginatedData<ActivityItem>>('/promotion/activity', params),
  createActivity: (data: ActivityFormData) =>
    post<Activity>('/promotion/activity/create', data),
  updateActivity: (id: number, data: ActivityFormData) =>
    put<ActivityItem>(`/promotion/activity/${id}/update`, data),
  deleteActivity: (id: number) =>
    del(`/promotion/activity/${id}/delete`),
  setActivitySKUs: (id: number, data: { sku_ids: number[]; activity_price?: number }) =>
    post(`/promotion/activity/${id}/skus`, data),

  // Email Templates
  getEmailTemplates: () =>
    get<{ code: number; data: EmailTemplateItem[] }>('/users/email/templates/'),
  updateEmailTemplate: (templateType: string, data: { subject: string; html_body: string; text_body: string; is_active: boolean }) =>
    post(`/users/email/templates/${templateType}/`, data),
  resetEmailTemplate: (templateType: string) =>
    post(`/users/email/templates/${templateType}/reset/`),

  // RBAC — 角色 × 权限矩阵 + 用户角色（管理面 /api/admin/users/，按 account_no 指认）
  getRbacMatrix: () =>
    get<RbacMatrix>('/rbac/matrix'),
  updateRbacRole: (role: string, permCodes: string[]) =>
    put<{ role: string; perm_codes: string[] }>('/rbac/matrix', { role, perm_codes: permCodes }),
  getRbacUsers: (params?: { role?: string; account_no?: string; page?: number; size?: number }) =>
    get<PaginatedData<RbacUser>>('/admin/users/', params),
  getUserRoles: (accountNo: string) =>
    get<{ roles: string[] }>(`/admin/users/${accountNo}/roles`),
  updateUserRoles: (accountNo: string, roles: string[]) =>
    put<{ roles: string[] }>(`/admin/users/${accountNo}/roles`, { roles }),
};

export interface EmailTemplateItem {
  template_type: string;
  subject: string;
  html_body: string;
  text_body: string;
  is_active: boolean;
  updated_at: string | null;
}

export interface RbacRole {
  value: string;
  label: string;
}

export interface RbacPermission {
  code: string;
  label: string;
}

export interface RbacDomain {
  domain: string;
  permissions: RbacPermission[];
}

export interface RbacMatrix {
  roles: RbacRole[];
  domains: RbacDomain[];
  grants: Record<string, string[]>;
  superadmin_implicit: boolean;
  orphaned: string[];
}

export interface RbacUser {
  account_no: string;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: string[];
}

export default adminAPI;
