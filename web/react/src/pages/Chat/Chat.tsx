import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useUser } from '../../store/UserContext'
import { getUserAccessToken } from '../../api/request'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { ChatBubble, SystemBubbleMessage, TypingIndicator } from '../../components/business/ChatBubble'
import type { ProductSnapshot, CartItem, ProductCardData } from '../../components/business/ChatBubble'
import {
  chatAPI,
  type ConversationSummary,
  type ConversationDetail,
  type ChatMessage,
} from '../../api/chat'
import { CONFIG } from '../../config/constants'

// ── WebSocket connection states ──

type WSStatus = 'connecting' | 'connected' | 'disconnected'

// ── Message filter types ──

type MsgFilter = 'all' | 'text' | 'image' | 'product_card'

const FILTER_TABS: { key: MsgFilter; labelZh: string; labelEn: string }[] = [
  { key: 'all', labelZh: '全部', labelEn: 'All' },
  { key: 'text', labelZh: '文本', labelEn: 'Text' },
  { key: 'image', labelZh: '图片', labelEn: 'Image' },
  { key: 'product_card', labelZh: '商品卡片', labelEn: 'Card' },
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
    const token = getUserAccessToken()
    if (!token) return

    setWsStatus('connecting')

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host
    const wsUrl = `${protocol}://${host}/ws/chat/${convId}/?token=${encodeURIComponent(token)}`

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
  }, [convId, onMessage])

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
  }, [])

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
  const { t, lang } = useTranslation()
  const isZh = lang === 'zh-CN'

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

  // ── Auth check ──
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth?tab=login')
    }
  }, [isLoggedIn, navigate])

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

    // New message — reload conversation
    if (data.type === 'new_message' || data.type === 'message') {
      if (activeId) {
        loadConversation(activeId)
        // Send ACK
        if (data.msg_id) {
          sendAckRef.current?.(data.msg_id as number)
        }
      }
      return
    }

    // Read receipt
    if (data.type === 'read_receipt') {
      if (activeId) loadConversation(activeId)
      return
    }
  }, [activeId, loadConversation])

  const sendAckRef = useRef<(msgId: number) => void>(() => {})

  const { wsStatus, sendAck } = useChatWebSocket(activeId, handleWSMessage)

  // Keep sendAckRef in sync
  useEffect(() => {
    sendAckRef.current = sendAck
  }, [sendAck])

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
        subject: subject || (isZh ? '客服咨询' : 'Customer Support'),
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

    try {
      setSending(true)
      await chatAPI.sendMessage(activeId, {
        content: text,
        attachments: atts,
      })
      await loadConversation(activeId)
      await loadConversations()
    } catch {
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
    const oldMsg = msg as unknown as Record<string, unknown>
    if (oldMsg.is_system) {
      return { isSystem: true, content: msg.content || '', id: msg.id }
    }

    const isMine: boolean = msg.sender === 'user'
    const type = (msg.msg_type || 'text') as 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share'
    let fileUrl: string | undefined
    const attachments = oldMsg.attachments as string[] | undefined

    if (type === 'image' && attachments?.length) {
      fileUrl = attachments[0]
    }
    if (type === 'video' && attachments?.length) {
      fileUrl = attachments[0]
    }

    return {
      id: msg.id,
      type,
      content: msg.content || '',
      isMine,
      timestamp: msg.created_at,
      fileUrl,
      productSnapshot: oldMsg.product_snapshot as ProductSnapshot | null | undefined,
      productCardData: oldMsg.product_card as ProductCardData | null | undefined,
      cartItems: oldMsg.cart_items as CartItem[] | undefined,
      isRead: msg.is_read === true,
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
    if (status === 'pending') return isZh ? '待处理' : 'Pending'
    if (status === 'replied') return isZh ? '已回复' : 'Replied'
    if (status === 'closed') return isZh ? '已关闭' : 'Closed'
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
              <EntryTitle>{isZh ? '联系客服' : 'Contact Support'}</EntryTitle>
              <EntrySub>
                {isZh ? '描述您遇到的问题，客服将尽快回复您' : 'Describe your issue, we will respond shortly'}
              </EntrySub>

              <EntryField>
                <EntryLabel>{isZh ? '会话主题' : 'Subject'}</EntryLabel>
                <EntryInput
                  placeholder={isZh ? '例：订单咨询、退货申请...' : 'e.g. Order inquiry, return request...'}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </EntryField>

              <EntryField>
                <EntryLabel>{isZh ? '问题描述' : 'Description'}</EntryLabel>
                <EntryTextarea
                  placeholder={isZh ? '请详细描述您遇到的问题...' : 'Please describe your issue in detail...'}
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
                  {uploading ? (isZh ? '上传中...' : 'Uploading...') : (isZh ? '添加图片/视频' : 'Add Image/Video')}
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
                {sending ? (isZh ? '发送中...' : 'Sending...') : (isZh ? '发起咨询' : 'Start Consultation')}
              </EntryBtn>
            </EntryCard>
          </Wrapper>
        </Container>
      </PageLayout>
    )
  }

  // ── Scrolling helpers ──

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: filteredMessages.length - 1,
      behavior: 'smooth',
      align: 'end',
    })
  }, [filteredMessages.length])

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    atBottomRef.current = atBottom
    setShowScrollFab(!atBottom && filteredMessages.length > CONFIG.SCROLL_FAB_THRESHOLD)
  }, [filteredMessages.length])

  // ── Render individual Virtuoso item ──

  const renderMessageItem = useCallback((_index: number, item: ReturnType<typeof mapMessage>) => {
    if ('isSystem' in item && item.isSystem) {
      return <SystemBubbleMessage content={item.content} />
    }
    const bubble = item as {
      id: number; type: string; content: string; isMine: boolean; timestamp: string
      fileUrl?: string; productSnapshot?: ProductSnapshot | null
      productCardData?: ProductCardData | null; cartItems?: CartItem[]; isRead?: boolean
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
        isRead={bubble.isRead}
        onProductClick={(productId) => navigate(`/product/${productId}`)}
      />
    )
  }, [navigate])

  // ── Follow output: auto scroll when at bottom and new messages arrive ──
  const followOutput = useCallback(() => {
    // Only auto-follow if user is at the bottom
    if (!atBottomRef.current) return 'smooth' as const
    return 'auto' as const
  }, [])

  // ── Chat view ──
  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <ChatCard>
            <ChatHeader>
              <ChatTitle>
                {activeConv.subject || `${isZh ? '客服咨询' : 'Support'} #${activeConv.id}`}
                <ChatStatus $status={activeConv.status}>
                  {statusLabel(activeConv.status)}
                </ChatStatus>
                <WSIndicator $status={wsStatus}>
                  {wsStatus === 'connected' ? (isZh ? '实时' : 'Live')
                    : wsStatus === 'connecting' ? (isZh ? '连接中' : 'Connecting')
                      : (isZh ? '离线' : 'Offline')}
                </WSIndicator>
              </ChatTitle>
              <ChatActions>
                {activeConv.status !== 'closed' && (
                  <TextBtn onClick={handleClose}>
                    {isZh ? '关闭对话' : 'Close'}
                  </TextBtn>
                )}
              </ChatActions>
            </ChatHeader>

            {/* Filter tabs */}
            <FilterTabs>
              {FILTER_TABS.map(tab => (
                <FilterTab
                  key={tab.key}
                  $active={msgFilter === tab.key}
                  onClick={() => setMsgFilter(tab.key)}
                >
                  {isZh ? tab.labelZh : tab.labelEn}
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
                      {isZh ? '加载中...' : 'Loading...'}
                    </div>
                  ) : null,
                  Footer: () => (
                    <>
                      {isOtherTyping && (
                        <TypingIndicator name={isZh ? '客服' : 'Agent'} />
                      )}
                      {activeConv.status === 'closed' && (
                        <SystemBubbleMessage content={isZh ? '对话已关闭' : 'Conversation closed'} />
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
                {isZh
                  ? '客服尚未回复，请耐心等待'
                  : 'Agent has not replied yet, please wait patiently'}
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
                        ? (isZh ? '客服尚未回复，请耐心等待' : 'Waiting for agent reply...')
                        : (isZh ? '输入消息...' : 'Type a message...')
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
                    {sending ? (isZh ? '发送中...' : 'Sending...') : <SendIcon />}
                  </SendBtn>
                </InputRow>
                <ToolBar>
                  <ToolBtn
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isInputDisabled || uploading}
                  >
                    <ImageIcon />
                    {uploading ? (isZh ? '上传中...' : 'Uploading...') : (isZh ? '图片/视频' : 'Image/Video')}
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
