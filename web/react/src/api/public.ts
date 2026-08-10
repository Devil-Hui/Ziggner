/**
 * 前台公开 API 客户端。
 *
 * 所有端点无需认证，使用 AllowAny 权限。
 * 数据从后端实时获取，与 admin 后台操作保持一致。
 */

import { get, post, put, patch, del } from './request';

// ── 类型定义 ──────────────────────────────────────────────────────

/** 后台 SPU 列表项 */
export interface PublicSPU {
  id: number;
  name: string;
  description?: string;
  status: string;
  brand_name?: string;
  category_name?: string;
  min_price?: string;
  max_price?: string;
  total_stock?: number;
  main_image?: string;
  created_at?: string;
}

/** 商品媒体 */
export interface PublicProductMedia {
  id: number
  media_type: 'image' | 'video' | string
  sort_order?: number
  status?: string
  alt_text?: string
  thumb_url?: string
  list_url?: string
  large_url?: string
  original_url?: string
  video_url?: string
  video_thumb_url?: string
  video_list_url?: string
  video_large_url?: string
}

/** 后台 SPU 详情 */
export interface PublicSPUDetail {
  id: number;
  name: string;
  description?: string;
  brand_id?: number;
  brand_name?: string;
  category_id?: number;
  category_path?: string;
  main_image?: string;
  status?: string;
  /** 规格定义: [{name: "颜色", values: ["红色","蓝色"]}, ...] */
  specs: { name: string; values: string[] }[];
  /** 属性参数: [{name: "材质", value: "纯棉"}, ...] */
  attributes: { name: string; value: string }[];
  skus: PublicSKU[];
  media?: PublicProductMedia[];
  tags?: { id: number; name: string }[];
  submitted_by_name?: string;
  submitted_at?: string;
}

/** 后台 SKU */
export interface PublicSKU {
  id: number;
  name: string;
  price: string;
  discount_price?: string;
  stock: number;
  /** 当前 SKU 的具体规格值: {"颜色": "红色", "尺寸": "M"} */
  spec_values: Record<string, string>;
  image_url?: string;
  shelf_status?: string;
  sku_code?: string;
  spu_id?: number;
}

/** 后台分类 */
export interface PublicCategory {
  id: number;
  name: string;
  level: number;
  parent_id?: number;
  children?: PublicCategory[];
}

/** 后台品牌 */
export interface PublicBrand {
  id: number;
  name: string;
  description?: string;
}

/** 后台优惠券（公开可领取列表） */
export interface PublicCoupon {
  id: number;
  name?: string;
  code: string;
  discount_type: 'fixed' | 'percent';
  amount: number;
  min_amount: string;
  max_discount?: string;
  stackable: boolean;
  total_count: number;
  claimed_count: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  remaining?: number;
  claimable?: boolean;
  per_user_limit?: number;
}

/** 用户已领取优惠券 */
export interface UserCoupon {
  id: number
  coupon: PublicCoupon
  status: 'available' | 'locked' | 'used' | 'expired' | 'returned'
  claimed_at: string
  used_at?: string
}

/** 购物车项 */
export interface ApiCartItem {
  id: number
  sku_id: number
  spu_name: string
  sku_code: string
  price: string
  stock: number
  image: string
  spec_values: { spec_name: string; spec_value: string }[]
  quantity: number
  selected: boolean
  created_at: string
}

/** 分页响应 */
export interface PageResponse<T> {
  items?: T[];
  results?: T[];
  total: number;
  page: number;
  page_size?: number;
  count?: number;
}

/** 浏览历史项 */
export interface BrowseHistoryItem {
  id: number;
  spu_id: number;
  spu_name: string;
  spu_image: string;
  spu_price: string | null;
  category_path: string;
  viewed_at: string;
  created_at: string;
}

/** 浏览历史分页响应 */
export interface BrowseHistoryResponse {
  items: BrowseHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

/** 通知项 */
export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

/** 收藏项 */
export interface FavoriteItem {
  id: number;
  spu_id: number;
  spu_name: string;
  spu_image?: string;
  spu_price?: string;
  created_at: string;
}

// ── API 方法 ──────────────────────────────────────────────────────

export const publicAPI = {
  // ── 认证 ──
  /** 浏览器登录，认证令牌仅写入 HttpOnly Cookie。 */
  login: async (username: string, password: string, turnstileToken: string) => {
    const { ensureCSRFCookie } = await import('./request');
    await ensureCSRFCookie();
    return post<{ authenticated: boolean }>('/users/session/login/', {
      username,
      password,
      turnstile_token: turnstileToken,
    });
  },

  logout: () => post<void>('/users/session/logout/', {}),

  /** 用户注册 */
  register: (data: {
    username: string;
    password: string;
    email?: string;
    verify_id?: string;
    verify_code?: string;
  }) =>
    post<{ id: number; username: string; email: string }>('/users/register/', data),

  /** 获取当前用户信息 */
  getMe: () => get<{ id: number; username: string; email: string; phone?: string; profile?: Record<string, unknown> }>('/users/me/'),

  // ── 商品 ──
  /** 获取已上架 SPU 列表 */
  getSPUList: (params?: {
    page?: number;
    per_page?: number;
    category_id?: number;
    brand_id?: number;
  }) => get<PageResponse<PublicSPU>>('/goods/spu', { ...params, status: 'on_sale' }),

  /** 获取 SPU 详情（含 SKU 列表） */
  getSPUDetail: (spuId: number) =>
    get<PublicSPUDetail>(`/goods/spu/${spuId}`),

  /** 获取分类树 */
  getCategoryTree: () =>
    get<PublicCategory[]>('/goods/category/tree'),

  /** 获取品牌列表 */
  getBrandList: () =>
    get<PublicBrand[]>('/goods/brand'),

  /** 获取热销商品 */
  getHotProducts: (categoryId?: number) =>
    get<PublicSKU[]>('/goods/hot', categoryId ? { category_id: categoryId } : undefined),

  /** 全文搜索 */
  search: (params: {
    q?: string;
    category_id?: number;
    brand_id?: number;
    price_min?: number;
    price_max?: number;
    sort?: string;
    page?: number;
    per_page?: number;
  }) => get<PageResponse<PublicSPU>>('/goods/search', params),

  /** 获取可领取的优惠券列表 */
  getCouponList: () => get<PublicCoupon[]>('/promotion/'),

  /** 获取公开优惠券分享详情，游客可访问。 */
  getCouponDetail: (code: string) =>
    get<PublicCoupon>(`/promotion/${encodeURIComponent(code)}/`),

  /** 领取优惠券，未登录时后端返回 401。 */
  claimCoupon: (code: string) =>
    post<{ detail: string }>(`/promotion/${encodeURIComponent(code)}/claim/`, {}),

  /** 获取用户已领取的优惠券 */
  getMyCoupons: (params?: { status?: string; page?: number; page_size?: number }) =>
    get<UserCoupon[]>('/promotion/my/', params),

  // ── 购物车 ──
  /** 获取购物车 */
  getCart: () =>
    get<ApiCartItem[]>('/cart/'),

  /** 添加商品到购物车 */
  addToCart: (skuId: number, quantity: number) =>
    post<{ detail: string }>('/cart/items/', { sku_id: skuId, quantity }),

  /** 更新购物车项数量 */
  updateCartItem: (itemId: number, quantity: number) =>
    patch<{ detail: string }>(`/cart/items/${itemId}/`, { quantity }),

  /** 移除购物车项 */
  removeCartItem: (itemId: number) =>
    del(`/cart/items/${itemId}/remove/`),

  /** 清空购物车 */
  clearCart: () =>
    del('/cart/clear/'),

  // ── 订单 ──
  /** 提交结算 */
  checkout: (data: {
    cart_item_ids: number[];
    shipping_name: string;
    shipping_phone: string;
    shipping_address: Record<string, string>;
    payment_method?: string;
    buyer_remark?: string;
    user_coupon_id?: number;
    /** @deprecated Use user_coupon_id. Kept for one API compatibility cycle. */
    coupon_code?: string;
    idempotency_key?: string;
  }) =>
    post<{ order_no: string; actual_amount: number; idempotency_key: string }>('/order/checkout/', data),

  /** 获取订单列表 */
  getOrders: (params?: { status?: string; page?: number; per_page?: number }) =>
    get<{ count: number; results: Record<string, unknown>[] }>('/order/', params),

  /** 获取订单详情 */
  getOrderDetail: (orderNo: string) =>
    get('/order/' + orderNo + '/'),

  /** 取消订单 */
  cancelOrder: (orderNo: string, reason?: string) =>
    post('/order/' + orderNo + '/cancel/', { reason: reason || '' }),

  // ── 支付 ──
  /** 创建支付 */
  createPayment: (orderNo: string, method: string) =>
    post('/payment/create/', { order_no: orderNo, method }),

  /** 查询支付状态 */
  getPaymentStatus: (orderNo: string) =>
    get('/payment/status/' + orderNo + '/'),

  /** 申请退款 */
  requestRefund: (
    orderNo: string,
    reason?: string,
    amount?: number,
    idempotencyKey = `refund-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ) =>
    post(
      '/payment/refund/',
      { order_no: orderNo, reason: reason || '', amount },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),

  // ── 地址 ──
  /** 获取地址列表 */
  getAddresses: () =>
    get('/address/'),

  /** 创建地址 */
  createAddress: (data: Record<string, any>) =>
    post('/address/', data),

  /** 更新地址 */
  updateAddress: (id: number, data: Record<string, any>) =>
    put('/address/' + id + '/', data),

  /** 删除地址 */
  deleteAddress: (id: number) =>
    del('/address/' + id + '/'),

  // ── 浏览历史追踪 ──
  /** 获取浏览历史 */
  getBrowseHistory: (params?: { page?: number; page_size?: number }) =>
    get<BrowseHistoryResponse>('/tracking/history/', params),

  /** 记录一次商品浏览 */
  recordBrowse: (spuId: number) =>
    post<{ id: number; spu_id: number; viewed_at: string; created: boolean }>('/tracking/history/', { spu_id: spuId }),

  /** 清空浏览历史 */
  clearBrowseHistory: () =>
    del<{ message: string; deleted_count: number }>('/tracking/history/'),

  // ── 通知 ──
  /** 获取通知列表 */
  getNotifications: (params?: { page?: number; per_page?: number }) =>
    get<PageResponse<NotificationItem>>('/notification/', params),

  /** 标记单条通知已读 */
  markRead: (id: number) =>
    post<{ status: string }>(`/notification/${id}/read/`),

  /** 全部已读 */
  markAllRead: () =>
    post<{ status: string }>('/notification/read-all/'),

  // ── 收藏 ──
  /** 获取我的收藏列表 */
  getFavorites: (params?: { page?: number; per_page?: number }) =>
    get<PageResponse<FavoriteItem>>('/lovegoods/', params),

  /** 添加收藏 */
  addFavorite: (spuId: number) =>
    post<{ status: string }>(`/lovegoods/${spuId}/`),

  /** 取消收藏 */
  removeFavorite: (spuId: number) =>
    del(`/lovegoods/${spuId}/`),
};
