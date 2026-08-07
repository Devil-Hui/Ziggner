// 评价 API

import { get, post } from './request'

export interface ReviewItem {
  id: number
  spu_id: number
  spu?: { id: number; title: string }
  rating: number
  content: string
  is_active: boolean
  created_at: string
  replies?: ReviewItem[]
}

export interface CreateReviewParams {
  spu_id: number
  order_item_id: number
  rating: number
  content: string
}

export interface ReviewListResult {
  results: ReviewItem[]
  count: number
  avg_rating: number
}

export const reviewAPI = {
  /** 获取产品评价列表 */
  list: (productId: number, page = 1) =>
    get<ReviewListResult>(`/review/?spu_id=${productId}&page=${page}`),

  /** 获取我的评价列表 */
  listByUser: (page = 1) =>
    get<{ results: ReviewItem[]; count: number }>(`/review/my/?page=${page}`),

  /** 提交评价（需提供 order_item_id 验证购买） */
  create: (params: CreateReviewParams) =>
    post<ReviewItem>('/review/create/', params),

  /** 获取用户已购买但未评价的订单项 */
  getReviewableItems: (productId: number) =>
    get<{ order_items: { id: number; order_no: string }[] }>(`/review/reviewable/?spu_id=${productId}`),

  /** 删除评价（软删除） */
  delete: (reviewId: number) =>
    post<void>(`/review/${reviewId}/delete/`, {}),  // 注意：后端使用 POST，前端保持一致

  /** 回复评价 */
  reply: (reviewId: number, params: { rating: number; content: string }) =>
    post<ReviewItem>(`/review/${reviewId}/reply/`, params),
}
