// 客服系统 API — 用户端 + Admin 端
// 用户端 chatAPI 已统一到 customer_service（/api/v1/chat/），与管理台共用同一张会话表。

import { get, post, patch } from './request'

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
  /** 发送状态（前端瞬态，用于「发送中/已送达/已读」回执，不来自后端） */
  status?: 'sending' | 'sent' | 'read'
}

/** 消息发送状态（推特式回执） */
export type MsgStatus = 'sending' | 'sent' | 'read'

export interface ConversationSummary {
  id: number
  subject: string
  user: { id: number; username: string; avatar?: string }
  admin: { id: number; username: string } | null
  group: number | null
  status: 'open' | 'closed'
  user_msg_count: number
  unread_count: number
  spu_id: number | null
  spu_info: { id: number; name: string; main_image: string; price: string } | null
  /** 当前处理该会话的管理员 ID（null = 无人处理） */
  handled_by?: number | null
  /** 当前处理该会话的管理员名称 */
  handled_by_name?: string | null
  /** 当前登录管理员是否可在此会话发言（占线保护权威判定） */
  can_reply?: boolean
  last_message: {
    content: string
    sender: string
    created_at: string
  } | null
  created_at: string
  updated_at: string
}

export interface OrderInfo {
  order_id: number
  order_no: string
  status: string
  status_label: string
  created_at: string
  total_amount: string
  sku_name: string
  quantity: number
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
  /** 当前处理该会话的管理员 ID（null = 无人处理） */
  handled_by: number | null
  /** 当前处理该会话的管理员名称 */
  handled_by_name: string | null
  /** 当前登录管理员是否可在此会话发言 */
  can_reply: boolean
  /** 买家在该会话关联商品上的最近订单（宏观查看用） */
  order_info?: OrderInfo[]
}

export interface CreateConversationParams {
  subject: string
  content?: string
  attachments?: Array<string | { url: string; msg_type?: 'image' | 'video' }>
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
  attachments?: Array<string | { url: string; msg_type?: 'image' | 'video' }>
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

// ── 结构转换：customer_service 形状 → chat 形状 ──

interface CsMessage {
  id: number
  sender?: number
  sender_name?: string
  sender_type?: string
  content?: string
  msg_type?: string
  file_url?: string
  card_data?: Record<string, unknown> | null
  is_read?: boolean
  created_at?: string
}

interface CsConversation {
  id: number
  user?: number
  user_name?: string
  admin?: number | null
  agent_name?: string
  group_id?: number | null
  group_name?: string
  subject?: string
  status?: string
  user_msg_count?: number
  unread_count?: number
  spu_id?: number | null
  spu_info?: { id: number; name: string; main_image: string; price: string } | null
  handled_by?: number | null
  handled_by_name?: string | null
  can_reply?: boolean
  last_message?: {
    id?: number
    content?: string
    sender_type?: string
    msg_type?: string
    created_at?: string
  } | null
  messages?: CsMessage[]
  order_info?: OrderInfo[] | undefined
  created_at?: string
  updated_at?: string
}

function transformChatMessage(m: CsMessage): ChatMessage {
  return {
    id: m.id,
    sender: String(m.sender ?? ''),
    sender_type: (m.sender_type === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
    sender_name: m.sender_name || '',
    content: m.content || '',
    msg_type: (m.msg_type || 'text') as ChatMessage['msg_type'],
    file_url: m.file_url || null,
    card_data: (m.card_data as ChatMessage['card_data']) || null,
    is_read: Boolean(m.is_read),
    read_at: null,
    created_at: m.created_at || '',
  }
}

export { transformChatMessage }

/**
 * 将 WS 推送的消息增量合并进当前会话，避免「整页重载」带来的时序竞态
 * （竞态会让最新一条被旧数据覆盖，观感上像「显示的是上一句」）。
 * - kind='message'：对方消息直接追加；自己消息的回显用于把乐观临时消息替换为真实消息（status=sent）
 * - kind='read_receipt'：把对应消息标记为已读
 */
export function mergeWsMessage(
  conv: ConversationDetail | null,
  payload: Record<string, unknown>,
  mySenderType: 'user' | 'admin',
  kind: 'message' | 'read_receipt',
): ConversationDetail | null {
  if (!conv) return conv
  const msgs = conv.messages || []
  if (kind === 'read_receipt') {
    const rid = Number(payload.msg_id)
    if (!rid) return conv
    return {
      ...conv,
      messages: msgs.map((m) => (m.id === rid ? { ...m, status: 'read', is_read: true } : m)),
    }
  }
  const real = transformChatMessage(payload as unknown as CsMessage)
  const isOwn = real.sender_type === mySenderType
  if (isOwn) {
    real.status = 'sent'
    const byId = msgs.findIndex((m) => m.id === real.id)
    if (byId >= 0) {
      const copy = msgs.slice()
      copy[byId] = real
      return { ...conv, messages: copy }
    }
    // 用乐观临时消息（id<0）替换为真实消息
    const tempIdx = msgs.findIndex((m) => m.id < 0 && m.sender_type === mySenderType)
    if (tempIdx >= 0) {
      const copy = msgs.slice()
      copy[tempIdx] = real
      return { ...conv, messages: copy }
    }
    return { ...conv, messages: [...msgs, real] }
  }
  const byId = msgs.findIndex((m) => m.id === real.id)
  if (byId >= 0) {
    const copy = msgs.slice()
    copy[byId] = real
    return { ...conv, messages: copy }
  }
  return { ...conv, messages: [...msgs, real] }
}

function transformSummary(c: CsConversation): ConversationSummary {
  const lm = c.last_message
  return {
    id: c.id,
    subject: c.subject || '',
    user: { id: c.user ?? 0, username: c.user_name || '' },
    admin: c.admin ? { id: c.admin, username: c.agent_name || '' } : null,
    group: c.group_id ?? null,
    status: (c.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
    user_msg_count: c.user_msg_count || 0,
    unread_count: c.unread_count || 0,
    spu_id: c.spu_id ?? null,
    spu_info: c.spu_info ?? null,
    handled_by: c.handled_by ?? null,
    handled_by_name: c.handled_by_name ?? null,
    can_reply: c.can_reply ?? true,
    last_message: lm
      ? { content: lm.content || '', sender: lm.sender_type || '', created_at: lm.created_at || '' }
      : null,
    created_at: c.created_at || '',
    updated_at: c.updated_at || '',
  }
}

function transformDetail(c: CsConversation): ConversationDetail {
  const base = transformSummary(c)
  return {
    ...base,
    messages: (c.messages || []).map(transformChatMessage),
    handled_by: c.handled_by ?? null,
    handled_by_name: c.handled_by_name ?? null,
    can_reply: c.can_reply ?? true,
    order_info: (c.order_info as OrderInfo[] | undefined) ?? undefined,
  }
}

function unwrap<T>(data: unknown): T {
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: T }).results as T
  }
  return data as T
}

// ── User API ──

export const chatAPI = {
  /** 获取用户对话列表 */
  getConversations: async (): Promise<ConversationSummary[]> => {
    const raw = await get<unknown>('/chat/conversations/')
    return unwrap<CsConversation[]>(raw).map(transformSummary)
  },

  /** 创建新对话 */
  createConversation: async (params: CreateConversationParams): Promise<ConversationDetail> => {
    const raw = await post<CsConversation>('/chat/conversations/', params)
    return transformDetail(raw)
  },

  /** 获取对话详情（含消息列表） */
  getMessages: async (convId: number): Promise<ConversationDetail> => {
    const raw = await get<CsConversation>(`/chat/conversations/${convId}/`)
    return transformDetail(raw)
  },

  /** 发送消息 */
  sendMessage: async (convId: number, params: SendMessageParams): Promise<ConversationDetail> => {
    const raw = await post<CsConversation>(`/chat/conversations/${convId}/messages/`, params)
    return transformDetail(raw)
  },

  /** 关闭对话 */
  closeConversation: async (convId: number): Promise<{ detail: string }> => {
    return post<{ detail: string }>(`/chat/conversations/${convId}/close/`, {})
  },

  /** 上传附件（图片/视频） */
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

  /** Admin 标记为已回复（无独立状态，PATCH 空体刷新详情即可） */
  markReplied: (convId: number) =>
    patch<ConversationDetail>(`/chat/conversations/${convId}/`, {}),

  /** Admin 强制接手：超管/主管可将被其他客服占用的会话接管为本人处理 */
  takeoverConversation: (convId: number) =>
    patch<ConversationDetail>(`/chat/conversations/${convId}/`, {}),

  /** Admin 关闭对话（走专用 close 端点，用户/客服均可） */
  closeConversation: (convId: number) =>
    post<{ detail: string }>(`/chat/conversations/${convId}/close/`, {}),

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
