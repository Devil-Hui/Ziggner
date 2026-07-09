// 订单 API

import { get } from './request'

export interface OrderItem {
  id: number
  spu_name: string
  sku_code: string
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
  address?: {
    name: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
  }
  items?: OrderItem[]
  subtotal: string
  shipping_cost: number
  discount_amount: number
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
}