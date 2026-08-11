import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useUser } from '../../store/UserContext'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { ChatBubble, SystemBubbleMessage, TypingIndicator } from '../../components/business/ChatBubble'
import type { ProductSnapshot, ProductCardData, CartItem } from '../../components/business/ChatBubble'
import {
  chatAPI,
  type ConversationSummary,
  type ConversationDetail,
  type ChatMessage,
  mergeWsMessage,
} from '../../api/chat'
import { CONFIG } from '../../config/constants'

// ── WebSocket connection states ──

type WSStatus = 'connecting' | 'connected' | 'disconnected'

// ── Message filter types ──

type MsgFilter = 'all' | 'text' | 'image' | 'product_card'

const FILTER_TAB_KEYS: { key: MsgFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'store.chat.filterAll' },
  { key: 'text', labelKey: 'store.chat.filterText' },
  { key: 'image', labelKey: 'store.chat.filterImage' },
  { key: 'product_card', labelKey: 'store.chat.filterCard' },
]

// ── Styled Components ──

const Container = styled.div`
  min-height: 100vh;
  background: ${Color.bg.page};
  padding: 30px 5vw;
`

const Wrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
`

// ── Entry (no active conversation) ──

const EntryCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.card};
  padding: ${Spacing.xxxl}px;
  text-align: center;
  margin: auto;
  width: 100%;
  max-width: 420px;
`

const EntryTitle = styled.h2`
  font-size: ${FontSize.xl}px;
  font-weight: 600;
  margin: 0 0 ${Spacing.xs}px;
  color: ${Color.text.heading};
`

const EntrySub = styled.p`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
  margin: 0 0 ${Spacing.xxl}px;
`

const EntryField = styled.div`
  margin-bottom: ${Spacing.md}px;
  text-align: left;
`

const EntryLabel = styled.label`
  display: block;
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.secondary};
  margin-bottom: ${Spacing.xs}px;
`

const EntryInput = styled.input`
  width: 100%;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 10px 12px;
  font-size: ${FontSize.base}px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${Color.primary};
  }
`

const EntryTextarea = styled.textarea`
  width: 100%;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 10px 12px;
  font-size: ${FontSize.base}px;
  outline: none;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${Color.primary};
  }
`

const EntryBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.md}px;
  font-weight: 500;
  cursor: pointer;
  margin-top: ${Spacing.md}px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ── Chat ──

const ChatCard = styled.div`
  flex: 1;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ChatHeader = styled.div`
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ChatTitle = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`

const ChatStatus = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 400;
  color: ${props =>
    props.$status === 'pending' ? '#e65100'
      : props.$status === 'replied' ? '#059669'
        : '#999'};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props =>
      props.$status === 'pending' ? '#e65100'
        : props.$status === 'replied' ? '#059669'
          : '#999'};
  }
`

// ── WS connection indicator ──

const WSIndicator = styled.span<{ $status: WSStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 400;
  color: ${props =>
    props.$status === 'connected' ? '#059669'
      : props.$status === 'connecting' ? '#d97706'
        : '#dc2626'};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props =>
      props.$status === 'connected' ? '#059669'
        : props.$status === 'connecting' ? '#d97706'
          : '#dc2626'};
    animation: ${props => props.$status === 'connecting' ? 'pulse 1.5s infinite' : 'none'};

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  }
`

// ── Filter tabs ──

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  overflow-x: auto;

  &::-webkit-scrollbar { display: none; }
`

const FilterTab = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border-radius: ${Radius.full}px;
  border: 1px solid ${props => props.$active ? '#e74c3c' : Color.border.light};
  background: ${props => props.$active ? '#fef2f2' : 'transparent'};
  color: ${props => props.$active ? '#e74c3c' : '#666'};
  font-size: 12px;
  font-weight: ${props => props.$active ? 600 : 400};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${Transition.fast};

  &:hover {
    border-color: #e74c3c;
    color: ${props => props.$active ? '#e74c3c' : '#333'};
  }
`

// ── Messages area with Virtuoso ──

const MessageListContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

// ── Scroll-to-bottom FAB ──

const ScrollToBottomFab = styled.button<{ $visible: boolean }>`
  position: absolute;
  bottom: 140px;
  right: 32px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${Color.border.light};
  background: ${Color.bg.card};
  box-shadow: ${Shadow.dropdown};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: scale(${props => props.$visible ? 1 : 0.8});
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  transition: all ${Transition.fast};

  &:hover { background: #f5f5f5; }

  svg { width: 18px; height: 18px; color: #666; }
`

// ── Limit Warning ──

const LimitWarning = styled.div`
  padding: 8px ${Spacing.lg}px;
  background: #fff3e0;
  color: #e65100;
  font-size: 12px;
  text-align: center;
  border-top: 1px solid #ffe0b2;
`

// ── Input Area ──

const InputArea = styled.div`
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border-top: 1px solid ${Color.border.light};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`

const TextInput = styled.textarea`
  flex: 1;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 10px 12px;
  font-size: ${FontSize.base}px;
  resize: none;
  height: 44px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: ${Color.primary}; }

  &:disabled {
    background: #f5f5f5;
    color: #999;
    cursor: not-allowed;
  }
`

const ToolBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const ToolBtn = styled.button`
  background: none;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #f5f5f5;
    color: #333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg { width: 16px; height: 16px; }
`

const HiddenInput = styled.input`
  display: none;
`

const SendBtn = styled.button`
  background: ${Color.primaryHover};
  color: #fff;
  border: none;
  border-radius: ${Radius.sm}px;
  padding: 10px 20px;
  font-size: ${FontSize.base}px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PreviewRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PreviewItem = styled.div`
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid ${Color.border.medium};
`

const PreviewImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const PreviewRemove = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
`

// ── SVG Icons ──

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const MAX_CONSECUTIVE_USER_MSGS = CONFIG.CHAT_USER_MSG_LIMIT

// ── WebSocket hook ──

function useChatWebSocket(
  convId: number | null,
  onMessage: (data: Record<string, unknown>) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [wsStatus, setWsStatus] = useState<WSStatus>('disconnected')
  const reconnectAttemptRef = useRef(0)
  const maxReconnectAttempts = CONFIG.WS_MAX_RECONNECT_ATTEMPTS
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!convId) return

    setWsStatus('connecting')

    // WS 必须与页面同源（经 nginx / Cloudflare 代理到 daphne:8001）。
    // 不能硬编码 localhost:8000 —— 那是 gunicorn 的 REST(WSGI) 端口，不支持 WebSocket，
    // 否则经 docker nginx(localhost) 访问时 WS 会绕过 nginx 直连 gunicorn 而彻底失败，
    // 表现为「消息打不回去」。生产环境用 VITE_WS_URL 覆盖（如 wss://api.ziggner.com）。
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsBase = import.meta.env.VITE_WS_URL || `${scheme}://${window.location.host}`
    const wsUrl = `${wsBase}/ws/chat/${convId}/`

    try {
      const websocket = new WebSocket(wsUrl)
      wsRef.current = websocket

      websocket.onopen = () => {
        setWsStatus('connected')
        reconnectAttemptRef.current = 0
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle ping → pong
          if (data.type === 'ping') {
            websocket.send(JSON.stringify({ type: 'pong' }))
            return
          }

          onMessage(data)
        } catch {
          // ignore parse errors
        }
      }

      websocket.onclose = () => {
        setWsStatus('disconnected')
        wsRef.current = null

        // Exponential backoff reconnect
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(CONFIG.WS_RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current), CONFIG.WS_RECONNECT_MAX_DELAY)
          reconnectAttemptRef.current++
          timerRef.current = setTimeout(connect, delay)
        }
      }

      websocket.onerror = () => {
        // onclose will fire after this
      }
    } catch {
      setWsStatus('disconnected')
    }
  }, [convId, onMessage, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    reconnectAttemptRef.current = maxReconnectAttempts // prevent reconnects
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsStatus('disconnected')
  }, [maxReconnectAttempts])

  const sendAck = useCallback((msgId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ack', msg_id: msgId }))
    }
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { wsStatus, sendAck, disconnect }
}

// ── Component ──

export default function Chat() {
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const { t } = useTranslation()

  // Entry form state
  const [subject, setSubject] = useState('')
  const [entryContent, setEntryContent] = useState('')

  // Conversation state
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Message input
  const [inputText, setInputText] = useState('')
  const [inputAttachments, setInputAttachments] = useState<string[]>([])

  // Virtual scroll
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const atBottomRef = useRef(true)

  // Filter
  const [msgFilter, setMsgFilter] = useState<MsgFilter>('all')

  // Typing
  const [isTyping, setIsTyping] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Auth check (guard with !isLoading to avoid racing ahead of getMe) ──
  const { isLoading } = useUser()
  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      navigate('/auth?tab=login')
    }
  }, [isLoggedIn, isLoading, navigate])

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      const list = await chatAPI.getConversations()
      setConversations(list)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) loadConversations()
  }, [isLoggedIn, loadConversations])

  // Auto-select first conversation when list loads and none is active
  useEffect(() => {
    if (!activeId && conversations.length > 0 && conversations[0]) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  // Load conversation detail whenever activeId changes
  useEffect(() => {
    if (activeId) {
      loadConversation(activeId)
    }
  }, [activeId])

  // ── Load conversation detail ──
  const loadConversation = useCallback(async (convId: number) => {
    try {
      const detail = await chatAPI.getMessages(convId)
      setActiveConv(detail)
    } catch {
      // ignore
    }
  }, [])

  // ── WebSocket integration ──
  const handleWSMessage = useCallback((data: Record<string, unknown>) => {
    // Typing event
    if (data.type === 'typing') {
      setIsTyping(true)
      setTimeout(() => setIsTyping(false), CONFIG.TYPING_INDICATOR_TIMEOUT)
      return
    }

    // New message — 增量合并，不再整页重载（避免最新一条被旧数据覆盖的竞态）
    if (data.type === 'new_message' || data.type === 'message') {
      const payload = (data.payload ?? {}) as Record<string, unknown>
      const isOwn = payload.sender_type === 'user'
      setActiveConv((prev) => mergeWsMessage(prev, payload, 'user', 'message'))
      // 仅对「对方（客服）」的消息发 ACK，自己的回显不 ACK
      if (!isOwn && data.msg_id) {
        sendAckRef.current?.(data.msg_id as number)
      }
      return
    }

    // Read receipt
    if (data.type === 'read_receipt') {
      setActiveConv((prev) => mergeWsMessage(prev, data, 'user', 'read_receipt'))
      return
    }
  }, [setActiveConv])

  const sendAckRef = useRef<(msgId: number) => void>(() => {})

  const { wsStatus, sendAck } = useChatWebSocket(activeId, handleWSMessage)

  // Keep sendAckRef in sync
  useEffect(() => {
    sendAckRef.current = sendAck
  }, [sendAck])

  // 进入会话后，把「对方（客服）」的历史未读消息标记为已读（发 ACK，触发客服看到「已读」）
  const ackedRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!activeConv?.messages) return
    for (const m of activeConv.messages) {
      if (m.sender_type !== 'user' && !m.is_read && m.id > 0 && !ackedRef.current.has(m.id)) {
        ackedRef.current.add(m.id)
        sendAckRef.current?.(m.id)
      }
    }
  }, [activeConv?.messages])

  // ── 5-message limit check ──
  const consecutiveUserMsgs = (() => {
    if (!activeConv?.messages) return 0
    let count = 0
    for (let i = activeConv.messages.length - 1; i >= 0; i--) {
      if (activeConv.messages[i].sender === 'user') {
        count++
      } else {
        break
      }
    }
    return count
  })()

  const isInputDisabled =
    activeConv?.status === 'closed' ||
    ((activeConv as unknown as Record<string, string>)?.status === 'pending' && consecutiveUserMsgs >= MAX_CONSECUTIVE_USER_MSGS)

  // ── Create conversation ──
  const handleCreate = async () => {
    if (!entryContent.trim() && !inputAttachments.length) return
    try {
      setSending(true)
      const conv = await chatAPI.createConversation({
        subject: subject || t('store.chat.defaultSubject'),
        content: entryContent,
        attachments: inputAttachments,
      })
      setActiveId(conv.id)
      setActiveConv(conv)
      setSubject('')
      setEntryContent('')
      setInputAttachments([])
      await loadConversations()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  // ── Send message ──
  const handleSend = async () => {
    if (!activeId) return
    if (!inputText.trim() && inputAttachments.length === 0) return

    const text = inputText
    const atts = inputAttachments
    setInputText('')
    setInputAttachments([])

    // 乐观更新：立即插入本地，发送方无需等待 POST + 重拉即可看到自己消息
    const tempId = -Date.now()
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: 'optimistic',
      sender_type: 'user',
      sender_name: '',
      content: text,
      msg_type: 'text',
      file_url: null,
      card_data: null,
      is_read: true,
      read_at: null,
      created_at: new Date().toISOString(),
      status: 'sending',
    }
    setActiveConv((prev) => prev ? { ...prev, messages: [...(prev.messages || []), optimisticMsg] } : prev)

    try {
      setSending(true)
      const resp = await chatAPI.sendMessage(activeId, {
        content: text,
        attachments: atts,
      })
      // 用服务端返回的真实消息替换乐观临时消息（status=sent），不再整页重载
      setActiveConv((prev) => {
        if (!prev) return prev
        const real = (resp.messages || []).slice().reverse()
          .find((m) => m.sender_type === 'user' && m.id > 0)
        const msgs = prev.messages || []
        if (real) {
          const copy = msgs.slice()
          const idx = copy.findIndex((m) => m.id === tempId)
          if (idx >= 0) copy[idx] = { ...real, status: 'sent' }
          else if (!copy.some((m) => m.id === real.id)) copy.push({ ...real, status: 'sent' })
          return { ...prev, messages: copy }
        }
        return { ...prev, messages: msgs.map((m) => m.id === tempId ? { ...m, status: 'sent' } : m) }
      })
      await loadConversations()
    } catch {
      setActiveConv((prev) => prev ? { ...prev, messages: (prev.messages || []).filter(m => m.id !== tempId) } : prev)
      setInputText(text)
      setInputAttachments(atts)
    } finally {
      setSending(false)
    }
  }

  // ── Close conversation ──
  const handleClose = async () => {
    if (!activeId) return
    try {
      await chatAPI.closeConversation(activeId)
      await loadConversation(activeId)
      await loadConversations()
    } catch {
      // ignore
    }
  }

  // ── Upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      setUploading(true)
      for (const file of Array.from(files)) {
        const result = await chatAPI.uploadFile(file)
        setInputAttachments(prev => [...prev, result.url])
      }
    } catch {
      // ignore
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  // ── Keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEntryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
    }
  }

  // ── Map backend message to ChatBubble props ──
  const mapMessage = (msg: ChatMessage) => {
    const isMine: boolean = msg.sender_type === 'user'
    const type = (msg.msg_type || 'text') as 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share'
    const fileUrl: string | undefined = msg.file_url || undefined

    // 商品卡片 / 商品快照：customer_service 的 card_data 为引用 + 实时解析结果
    let productSnapshot: ProductSnapshot | null = null
    let productCardData: ProductCardData | null = null
    const card = msg.card_data as
      | { spu_id?: number; product_name?: string; main_image?: string; price?: string; order_status?: string; order_id?: number }
      | null
      | undefined
    if (card) {
      productSnapshot = {
        id: card.spu_id || 0,
        name: card.product_name || '',
        main_image: card.main_image || '',
        price: card.price || '0',
      }
      productCardData = {
        id: card.spu_id || 0,
        name: card.product_name || '',
        main_image: card.main_image || '',
        price: card.price || '0',
        order_status: (card.order_status as ProductCardData['order_status']) || undefined,
        order_id: card.order_id,
      }
    }

    // 发送状态回执：自己发的消息才显示（发送中 / 已送达 / 已读）
    let receipt: 'sending' | 'sent' | 'read' | undefined
    if (isMine) {
      if (msg.status) receipt = msg.status
      else if (msg.is_read) receipt = 'read'
      else receipt = 'sent'
    }

    return {
      id: msg.id,
      type,
      content: msg.content || '',
      isMine,
      timestamp: msg.created_at,
      fileUrl,
      productSnapshot,
      productCardData,
      cartItems: undefined,
      receipt,
    }
  }

  // ── Filtered & mapped messages ──
  const filteredMessages = useMemo(() => {
    if (!activeConv?.messages) return []
    return activeConv.messages
      .map(mapMessage)
      .filter(msg => {
        if (msgFilter === 'all') return true
        if ('isSystem' in msg) return false
        const m = msg as ReturnType<typeof mapMessage> & { type: string }
        if (msgFilter === 'text') return m.type === 'text'
        if (msgFilter === 'image') return m.type === 'image' || m.type === 'video'
        if (msgFilter === 'product_card') return m.type === 'product_card' || m.type === 'product_link'
        return true
      })
  }, [activeConv?.messages, msgFilter])

  const isOtherTyping = !isInputDisabled && isTyping

  // ── Status label ──
  const statusLabel = (status: string) => {
    if (status === 'pending') return t('store.chat.statusPending')
    if (status === 'replied') return t('store.chat.statusReplied')
    if (status === 'closed') return t('store.chat.statusClosed')
    return status
  }

  // ── Not logged in ──
  if (!isLoggedIn) return null

  // ── Entry view (no active conversation) ──
  if (!activeConv) {
    return (
      <PageLayout>
        <Container>
          <Wrapper>
            <EntryCard>
              <EntryTitle>{t('store.chat.contactTitle')}</EntryTitle>
              <EntrySub>
                {t('store.chat.contactDesc')}
              </EntrySub>

              <EntryField>
                <EntryLabel>{t('store.chat.subjectLabel')}</EntryLabel>
                <EntryInput
                  placeholder={t('store.chat.subjectPlaceholder')}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </EntryField>

              <EntryField>
                <EntryLabel>{t('store.chat.descriptionLabel')}</EntryLabel>
                <EntryTextarea
                  placeholder={t('store.chat.descriptionPlaceholder')}
                  value={entryContent}
                  onChange={e => setEntryContent(e.target.value)}
                  onKeyDown={handleEntryKeyDown}
                />
              </EntryField>

              {inputAttachments.length > 0 && (
                <EntryField>
                  <PreviewRow>
                    {inputAttachments.map((url, i) => (
                      <PreviewItem key={i}>
                        <PreviewImg src={url} alt="" />
                        <PreviewRemove onClick={() => setInputAttachments(prev => prev.filter((_, j) => j !== i))}>
                          ×
                        </PreviewRemove>
                      </PreviewItem>
                    ))}
                  </PreviewRow>
                </EntryField>
              )}

              <ToolBar style={{ marginBottom: 0 }}>
                <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <ImageIcon />
                  {uploading ? t('store.chat.uploading') : t('store.chat.addMedia')}
                </ToolBtn>
                <HiddenInput
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleUpload}
                />
              </ToolBar>

              <EntryBtn
                onClick={handleCreate}
                disabled={sending || (!entryContent.trim() && inputAttachments.length === 0)}
              >
                {sending ? t('store.chat.sending') : t('store.chat.startConsultation')}
              </EntryBtn>
            </EntryCard>
          </Wrapper>
        </Container>
      </PageLayout>
    )
  }

  // ── Scrolling helpers ──

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: filteredMessages.length - 1,
      behavior: 'smooth',
      align: 'end',
    })
  }

  const handleAtBottomStateChange = (atBottom: boolean) => {
    atBottomRef.current = atBottom
    setShowScrollFab(!atBottom && filteredMessages.length > CONFIG.SCROLL_FAB_THRESHOLD)
  }

  // ── Render individual Virtuoso item ──

  const renderMessageItem = (_index: number, item: ReturnType<typeof mapMessage>) => {
    if ('isSystem' in item && item.isSystem) {
      return <SystemBubbleMessage content={item.content} />
    }
    const bubble = item as {
      id: number; type: string; content: string; isMine: boolean; timestamp: string
      fileUrl?: string; productSnapshot?: ProductSnapshot | null
      productCardData?: ProductCardData | null; cartItems?: CartItem[]; receipt?: 'sending' | 'sent' | 'read'
    }
    return (
      <ChatBubble
        type={bubble.type as 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share'}
        content={bubble.content}
        isMine={bubble.isMine}
        timestamp={bubble.timestamp}
        fileUrl={bubble.fileUrl}
        productSnapshot={bubble.productSnapshot}
        productCardData={bubble.productCardData}
        cartItems={bubble.cartItems}
        receipt={bubble.receipt}
        onProductClick={(productId) => navigate(`/product/${productId}`)}
      />
    )
  }

  // ── Follow output: auto scroll when at bottom and new messages arrive ──
  const followOutput = () => {
    // Only auto-follow if user is at the bottom
    if (!atBottomRef.current) return 'smooth' as const
    return 'auto' as const
  }

  // ── Chat view ──
  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <ChatCard>
            <ChatHeader>
              <ChatTitle>
                {activeConv.subject || `${t('store.chat.supportPrefix')} #${activeConv.id}`}
                <ChatStatus $status={activeConv.status}>
                  {statusLabel(activeConv.status)}
                </ChatStatus>
                <WSIndicator $status={wsStatus}>
                  {wsStatus === 'connected' ? t('store.chat.live')
                    : wsStatus === 'connecting' ? t('store.chat.connecting')
                      : t('store.chat.offline')}
                </WSIndicator>
              </ChatTitle>
              <ChatActions>
                {activeConv.status !== 'closed' && (
                  <TextBtn onClick={handleClose}>
                    {t('store.chat.closeConversation')}
                  </TextBtn>
                )}
              </ChatActions>
            </ChatHeader>

            {/* Filter tabs */}
            <FilterTabs>
              {FILTER_TAB_KEYS.map(tab => (
                <FilterTab
                  key={tab.key}
                  $active={msgFilter === tab.key}
                  onClick={() => setMsgFilter(tab.key)}
                >
                  {t(tab.labelKey)}
                </FilterTab>
              ))}
            </FilterTabs>

            {/* Virtuoso message list */}
            <MessageListContainer style={{ position: 'relative' }}>
              <Virtuoso
                ref={virtuosoRef}
                data={filteredMessages}
                itemContent={renderMessageItem}
                followOutput={followOutput}
                atBottomStateChange={handleAtBottomStateChange}
                atBottomThreshold={CONFIG.AT_BOTTOM_THRESHOLD_PX}
                style={{ flex: 1 }}
                initialTopMostItemIndex={filteredMessages.length > 0 ? filteredMessages.length - 1 : 0}
                components={{
                  Header: () => loading ? (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '13px' }}>
                      {t('store.chat.loading')}
                    </div>
                  ) : null,
                  Footer: () => (
                    <>
                      {isOtherTyping && (
                        <TypingIndicator name={t('store.chat.agent')} />
                      )}
                      {activeConv.status === 'closed' && (
                        <SystemBubbleMessage content={t('store.chat.conversationClosed')} />
                      )}
                    </>
                  ),
                }}
              />

              {/* Scroll to bottom FAB */}
              <ScrollToBottomFab $visible={showScrollFab} onClick={scrollToBottom}>
                <ChevronDownIcon />
              </ScrollToBottomFab>
            </MessageListContainer>

            {/* 5-message limit warning */}
            {(activeConv as unknown as Record<string, string>).status === 'pending' && consecutiveUserMsgs >= MAX_CONSECUTIVE_USER_MSGS && (
              <LimitWarning>
                {t('store.chat.waitingReply')}
              </LimitWarning>
            )}

            {activeConv.status !== 'closed' && (
              <InputArea>
                {inputAttachments.length > 0 && (
                  <PreviewRow>
                    {inputAttachments.map((url, i) => (
                      <PreviewItem key={i}>
                        <PreviewImg src={url} alt="" />
                        <PreviewRemove onClick={() => setInputAttachments(prev => prev.filter((_, j) => j !== i))}>
                          ×
                        </PreviewRemove>
                      </PreviewItem>
                    ))}
                  </PreviewRow>
                )}
                <InputRow>
                  <TextInput
                    placeholder={
                      isInputDisabled
                        ? t('store.chat.waitingReply')
                        : t('store.chat.typeMessage')
                    }
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isInputDisabled}
                  />
                  <SendBtn
                    onClick={handleSend}
                    disabled={isInputDisabled || sending || (!inputText.trim() && inputAttachments.length === 0)}
                  >
                    {sending ? t('store.chat.sending') : <SendIcon />}
                  </SendBtn>
                </InputRow>
                <ToolBar>
                  <ToolBtn
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isInputDisabled || uploading}
                  >
                    <ImageIcon />
                    {uploading ? t('store.chat.uploading') : t('store.chat.mediaLabel')}
                  </ToolBtn>
                  <HiddenInput
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleUpload}
                  />
                </ToolBar>
              </InputArea>
            )}
          </ChatCard>
        </Wrapper>
      </Container>
    </PageLayout>
  )
}

const ChatActions = styled.div`
  display: flex;
  gap: 8px;
`

const TextBtn = styled.button`
  background: none;
  border: none;
  font-size: 13px;
  color: ${Color.text.secondary};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: ${Radius.xs}px;

  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`
