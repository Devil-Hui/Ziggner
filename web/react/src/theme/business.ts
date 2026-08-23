/**
 * Business Tokens — 第四层（业务状态 → 语义 tone 映射）
 * ───────────────────────────────────────────────────
 * 业务只声明 tone，颜色全由 Semantic.status[tone] 解析。
 * 这样视觉体系稳定，而业务状态枚举可无限扩展而不引入新的"写死颜色"。
 */

import { StatusTone } from './semantic'

export const Business = {
  /** 商品状态 */
  ProductStatus: {
    draft: 'neutral',
    pending: 'warning',
    approved: 'info',
    rejected: 'danger',
    on_sale: 'success',
    suspended: 'warning',
    off_sale: 'neutral',
  },

  /** 订单状态 */
  OrderStatus: {
    pending_payment: 'warning',
    paid: 'info',
    shipped: 'info',
    delivered: 'info',
    completed: 'success',
    cancelled: 'neutral',
    refunding: 'warning',
    refunded: 'danger',
  },

  /** 优惠券状态 */
  CouponStatus: {
    DRAFT: 'neutral',
    PENDING: 'warning',
    APPROVED: 'info',
    REJECTED: 'danger',
    SCHEDULED: 'info',
    ACTIVE: 'success',
    EXPIRED: 'neutral',
  },

  /** 审批状态 */
  ApprovalStatus: {
    draft: 'neutral',
    pending: 'warning',
    approved: 'info',
    rejected: 'danger',
  },

  /** 异步任务状态 */
  TaskStatus: {
    pending: 'neutral',
    running: 'info',
    success: 'success',
    failed: 'danger',
    canceled: 'neutral',
  },
} as const

export type ProductStatus = keyof typeof Business.ProductStatus
export type OrderStatus = keyof typeof Business.OrderStatus
export type CouponStatus = keyof typeof Business.CouponStatus
export type ApprovalStatus = keyof typeof Business.ApprovalStatus
export type TaskStatus = keyof typeof Business.TaskStatus

/** 取业务状态对应的 tone（供 StatusBadge 使用） */
export const productTone = (s: ProductStatus): StatusTone => Business.ProductStatus[s]
export const orderTone = (s: OrderStatus): StatusTone => Business.OrderStatus[s]
export const couponTone = (s: CouponStatus): StatusTone => Business.CouponStatus[s]
export const approvalTone = (s: ApprovalStatus): StatusTone => Business.ApprovalStatus[s]
export const taskTone = (s: TaskStatus): StatusTone => Business.TaskStatus[s]
