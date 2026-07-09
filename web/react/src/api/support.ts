// 客服 API

import { get, post } from './request'

export interface SupportMessage {
  id: number
  sender: 'user' | 'admin'
  content: string
  attachments: string[]
  product_snapshot?: {
    id: number
    name: string
    main_image: string
    price: string
  } | null
  is_system: boolean
  created_at: string
}

export interface SupportConversationSummary {
  id: number
  subject: string
  status: 'open' | 'closed'
  spu_id: number | null
  last_message: {
    content: string
    sender: string
    created_at: string
  } | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface SupportConversation extends SupportConversationSummary {
  spu_info: {
    id: number
    name: string
    main_image: string
    price: string
  } | null
  cart_snapshot: unknown[]
  messages: SupportMessage[]
}

export interface CreateConversationParams {
  subject?: string
  spu_id?: number
  content?: string
  attachments?: string[]
  product_snapshot?: {
    id: number
    name: string
    main_image: string
    price: string
  }
  cart_snapshot?: unknown[]
}

export interface SendMessageParams {
  content?: string
  attachments?: string[]
  product_snapshot?: {
    id: number
    name: string
    main_image: string
    price: string
  }
}

export const supportAPI = {
  /** 获取对话列表 */
  listConversations: () =>
    get<SupportConversationSummary[]>('/support/'),

  /** 创建新对话 */
  createConversation: (params: CreateConversationParams) =>
    post<SupportConversation>('/support/', params),

  /** 获取对话详情（含消息列表） */
  getConversation: (convId: number) =>
    get<SupportConversation>(`/support/${convId}/`),

  /** 发送消息 */
  sendMessage: (convId: number, params: SendMessageParams) =>
    post<SupportConversation>(`/support/${convId}/`, params),

  /** 关闭对话 */
  closeConversation: (convId: number) =>
    post<{ detail: string }>(`/support/${convId}/close/`),

  /** 上传附件（图片/视频） */
  uploadAttachment: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { default: api } = await import('./request')
    const response = await api.post('/support/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    // 解包响应
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      return (body as { data: { url: string; filename: string } }).data
    }
    return body as { url: string; filename: string }
  },
}