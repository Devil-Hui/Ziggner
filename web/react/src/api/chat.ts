// 客服系统 API — 用户端 + Admin 端
// 复用已有 support API 端点，新增 Admin 专属接口

import { get, post } from './request'

// ── Types ──

export interface ChatMessage {
  id: number
  sender: string
  sender_type: 'user' | 'admin'
  sender_name: string
  content: string
  /** 消息类型：text | image | video | product_link | product_card | cart_share | order_card */
  msg_type: 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share' | 'order_card'
  /** 文件附件 URL（替代 attachments[]） */
  file_url: string | null
  /** 卡片数据（替代 product_snapshot / product_card） */
  card_data: {
    id?: number
    title?: string
    image?: string
    price?: string
    order_status?: string
    order_id?: number
  } | null
  /** 已读状态 */
  is_read: boolean
  /** 已读时间 */
  read_at: string | null
  created_at: string
}

export interface ConversationSummary {
  id: number
  subject: string
  user: { id: number; username: string; avatar?: string }
  admin: { id: number; username: string } | null
  group: number | null
  status: 'open' | 'closed'
  user_msg_count: number
  unread_count: number
  last_message: {
    content: string
    sender: string
    created_at: string
  } | null
  created_at: string
  updated_at: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
  /** 当前处理该会话的管理员 ID（null = 无人处理） */
  handled_by: number | null
  /** 当前处理该会话的管理员名称 */
  handled_by_name: string | null
}

export interface CreateConversationParams {
  subject: string
  content?: string
  attachments?: string[]
  spu_id?: number
  product_snapshot?: {
    id: number
    name: string
    main_image: string
    price: string
  }
  cart_snapshot?: Array<{
    spec: string
    quantity: number
    unit_price: string
  }>
}

export interface SendMessageParams {
  content?: string
  msg_type?: 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share' | 'order_card'
  attachments?: string[]
  /** product_card 消息数据 */
  product_card?: {
    id: number
    name: string
    main_image: string
    price: string
    order_status?: string
    order_id?: number
  }
}

export interface ProductSearchResult {
  id: number
  name: string
  main_image: string
  price: string
}

export interface PaginatedResult<T> {
  results: T[]
  count: number
  page: number
  page_size: number
}

// ── User API ──

export const chatAPI = {
  /** 获取用户对话列表 */
  getConversations: () =>
    get<ConversationSummary[]>('/support/'),

  /** 创建新对话 */
  createConversation: (params: CreateConversationParams) =>
    post<ConversationDetail>('/support/', params),

  /** 获取对话详情（含消息列表） */
  getMessages: (convId: number) =>
    get<ConversationDetail>(`/support/${convId}/`),

  /** 发送消息 */
  sendMessage: (convId: number, params: SendMessageParams) =>
    post<ConversationDetail>(`/support/${convId}/`, params),

  /** 关闭对话 */
  closeConversation: (convId: number) =>
    post<{ detail: string }>(`/support/${convId}/close/`),

  /** 上传附件（图片/视频） */
  uploadFile: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { default: api } = await import('./request')
    const response = await api.post('/support/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      return (body as { data: { url: string; filename: string } }).data
    }
    return body as { url: string; filename: string }
  },
}

// ── Admin API ──

export const adminChatAPI = {
  /** Admin 获取所有对话列表（分页） */
  getConversations: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    get<PaginatedResult<ConversationSummary>>('/chat/conversations/', params),

  /** Admin 获取某商品相关的对话列表 */
  getConversationsByProduct: (spuId: number) =>
    get<PaginatedResult<ConversationSummary>>('/chat/conversations/', { spu_id: spuId }),

  /** Admin 获取未处理会话数量 */
  getOpenCount: () =>
    get<{ count: number }>('/chat/conversations/', { status: 'open', page_size: 1 }),

  /** Admin 获取对话详情 */
  getConversation: (convId: number) =>
    get<ConversationDetail>(`/chat/conversations/${convId}/`),

  /** Admin 发送回复 */
  sendMessage: (convId: number, params: SendMessageParams) =>
    post<ConversationDetail>(`/chat/conversations/${convId}/messages/`, params),

  /** Admin 标记为已回复 */
  markReplied: (convId: number) =>
    post<{ detail: string }>(`/chat/conversations/${convId}/`, { status: 'replied' }),

  /** Admin 关闭对话 */
  closeConversation: (convId: number) =>
    post<{ detail: string }>(`/chat/conversations/${convId}/`, { status: 'closed' }),

  /** Admin 商品搜索（用于发送商品卡片） */
  searchProducts: (query: string) =>
    get<ProductSearchResult[]>('/chat/products/search/', { q: query }),

  /** Admin 上传附件 */
  uploadFile: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { default: api } = await import('./request')
    const response = await api.post('/chat/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      return (body as { data: { url: string; filename: string } }).data
    }
    return body as { url: string; filename: string }
  },
}
