// 支付 API — 对接后端 /api/payment/

import { post, get } from './request'

export interface CreatePaymentParams {
  order_no: string
  method: 'paypal' | 'stripe'
  success_url: string
  cancel_url: string
}

export interface CreatePaymentResult {
  payment_no: string
  pay_url: string
  client_secret?: string
}

export interface PaymentStatusResult {
  paid: boolean
  status: string | null
  method: string | null
  payment_no: string | null
  amount: number | null
  currency: string | null
}

export interface RefundResult {
  id: number
  payment_no: string
  amount: number
  status: string
  reason: string
  created_at: string
}

export interface RefundListResult {
  count: number
  results: RefundResult[]
}

export const paymentAPI = {
  /** 发起支付，返回 pay_url 用于重定向跳转 */
  create: (params: CreatePaymentParams) =>
    post<CreatePaymentResult>('/payment/create/', params),

  /** 查询订单支付状态 */
  getStatus: (orderNo: string) =>
    get<PaymentStatusResult>(`/payment/status/${orderNo}/`),

  /** 查询当前用户的退款列表 */
  getRefunds: (page = 1) =>
    get<RefundListResult>(`/payment/refunds/?page=${page}`),
}