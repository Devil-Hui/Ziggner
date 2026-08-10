// 客服 API — 统一后端为 customer_service（/api/v1/chat/）
// 本文件对外仍暴露 Support.tsx 期望的数据形状，内部转发到 customer_service
// 并做结构转换，使 storefront 与管理台共用同一张会话表，实现双向互通。

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
  spu_info: { id: number; name: string; main_image: string; price: string } | null
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
  cart_snapshot: unknown[]
  messages: SupportMessage[]
}

export interface CreateConversationParams {
  subject?: string
  spu_id?: number
  content?: string
  attachments?: Array<string | { url: string; msg_type?: 'image' | 'video' }>
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
  attachments?: Array<string | { url: string; msg_type?: 'image' | 'video' }>
  product_snapshot?: {
    id: number
    name: string
    main_image: string
    price: string
  }
}

// ── 结构转换：customer_service 形状 → support 形状 ──

interface CsMessage {
  id: number
  sender?: number
  sender_name?: string
  sender_type?: string
  content?: string
  msg_type?: string
  file_url?: string
  card_data?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  is_read?: boolean
  created_at?: string
}

interface CsConversation {
  id: number
  user?: number
  user_name?: string
  admin?: number | null
  agent_name?: string
  subject?: string
  status?: string
  spu_id?: number | null
  user_msg_count?: number
  unread_count?: number
  spu_info?: { id: number; name: string; main_image: string; price: string } | null
  last_message?: {
    id?: number
    content?: string
    sender_type?: string
    msg_type?: string
    created_at?: string
  } | null
  messages?: CsMessage[]
  created_at?: string
  updated_at?: string
}

function transformMessage(m: CsMessage): SupportMessage {
  const card = m.card_data as
    | { spu_id?: number; product_name?: string; main_image?: string; price?: string }
    | null
    | undefined
  return {
    id: m.id,
    sender: (m.sender_type === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
    content: m.content || '',
    attachments: m.file_url ? [m.file_url] : [],
    product_snapshot: card
      ? {
          id: card.spu_id || 0,
          name: card.product_name || '',
          main_image: card.main_image || '',
          price: card.price || '0',
        }
      : null,
    is_system: Boolean(m.metadata && (m.metadata as Record<string, unknown>).is_system),
    created_at: m.created_at || '',
  }
}

function transformSummary(c: CsConversation): SupportConversationSummary {
  const lm = c.last_message
  return {
    id: c.id,
    subject: c.subject || '',
    status: (c.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
    spu_id: c.spu_id ?? null,
    spu_info: c.spu_info ?? null,
    last_message: lm
      ? {
          content: lm.content || '',
          sender: lm.sender_type || '',
          created_at: lm.created_at || '',
        }
      : null,
    unread_count: c.unread_count || 0,
    created_at: c.created_at || '',
    updated_at: c.updated_at || '',
  }
}

function transformDetail(c: CsConversation): SupportConversation {
  const base = transformSummary(c)
  return {
    ...base,
    cart_snapshot: [],
    messages: (c.messages || []).map(transformMessage),
  }
}

function unwrap<T>(data: unknown): T {
  // customer_service 用户端列表在无分页参数时直接返回数组；
  // 管理端分页时返回 { results: [...] }。统一兼容。
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: T }).results as T
  }
  return data as T
}

export const supportAPI = {
  /** 获取对话列表 */
  listConversations: async (): Promise<SupportConversationSummary[]> => {
    const raw = await get<unknown>('/chat/conversations/')
    return unwrap<CsConversation[]>(raw).map(transformSummary)
  },

  /** 创建新对话 */
  createConversation: async (params: CreateConversationParams): Promise<SupportConversation> => {
    const raw = await post<CsConversation>('/chat/conversations/', params)
    return transformDetail(raw)
  },

  /** 获取对话详情（含消息列表） */
  getConversation: async (convId: number): Promise<SupportConversation> => {
    const raw = await get<CsConversation>(`/chat/conversations/${convId}/`)
    return transformDetail(raw)
  },

  /** 发送消息 */
  sendMessage: async (convId: number, params: SendMessageParams): Promise<SupportConversation> => {
    const raw = await post<CsConversation>(`/chat/conversations/${convId}/messages/`, params)
    return transformDetail(raw)
  },

  /** 关闭对话 */
  closeConversation: async (convId: number): Promise<{ detail: string }> => {
    return post<{ detail: string }>(`/chat/conversations/${convId}/close/`, {})
  },

  /** 上传附件（图片/视频） */
  uploadAttachment: async (file: File): Promise<{ url: string; filename: string }> => {
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
