// 订单 API

import { get, post } from './request'

export interface OrderItem {
  id: number
  spu_name: string
  sku_code: string
  image_url?: string
  spec_snapshot: { spec_name: string; spec_value: string }[]
  price: string
  quantity: number
  subtotal: string
}

export interface OrderSummary {
  id: number
  order_no: string
  status: string
  total_amount: string
  actual_amount: string
  payment_status: string
  item_count: number
  created_at: string
}

export interface OrderListResult {
  results: OrderSummary[]
  count: number
}

export interface Order extends OrderSummary {
  discount_amount: string
  shipping_name: string
  shipping_phone: string
  shipping_address: Record<string, string>
  payment_deadline?: string
  payment_remaining_seconds: number
  cancel_reason?: string
  items: OrderItem[]
}

export interface AdminOrderListParams {
  status?: string
  payment_status?: string
  search?: string
  page?: number
  size?: number
}

export interface AfterSaleReviewPayload {
  action: 'approve' | 'reject' | 'complete_refund'
  admin_remark?: string
}

export const orderAPI = {
  /** 获取订单列表，支持按状态和支付状态筛选 */
  list: (status?: string, page = 1, paymentStatus?: string) => {
    const statusParam = status ? `status=${status}` : ''
    const paymentParam = paymentStatus ? `payment_status=${paymentStatus}` : ''
    const pageParam = `page=${page}`
    const query = [statusParam, paymentParam, pageParam].filter(Boolean).join('&')
    return get<OrderListResult>(`/order/?${query}`)
  },

  /** 获取订单详情 */
  detail: (orderNo: string) =>
    get<Order>(`/order/${orderNo}/`),

  // ── Admin ──
  adminList: (params: AdminOrderListParams = {}) =>
    get('/order/admin/list/', params as Record<string, unknown>),

  adminDetail: (orderNo: string) =>
    get(`/order/admin/${orderNo}/`),

  adminShip: (orderNo: string, tracking_no: string) =>
    post(`/order/admin/${orderNo}/ship/`, { tracking_no }),

  adminCancel: (orderNo: string, reason = 'Cancelled by admin') =>
    post(`/order/admin/${orderNo}/cancel/`, { reason }),

  adminAfterSaleList: (params: { status?: string; type?: string; search?: string; page?: number; size?: number } = {}) =>
    get('/order/admin/aftersale/', params as Record<string, unknown>),

  adminAfterSaleReview: (afterSaleNo: string, payload: AfterSaleReviewPayload) =>
    post(`/order/admin/aftersale/${afterSaleNo}/review/`, payload),
}
