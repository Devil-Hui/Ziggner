import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { StatusBadge } from '../../components/admin/common'
import { Icon } from '../../components/admin/common/Icon'
import { useTranslation } from '../../i18n'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { ChatBubble, SystemBubbleMessage, TypingIndicator } from '../../components/business/ChatBubble'
import type { ProductSnapshot, CartItem, ProductCardData } from '../../components/business/ChatBubble'
import {
  adminChatAPI,
  type ConversationSummary,
  type ConversationDetail,
  type ChatMessage,
  type ProductSearchResult,
} from '../../api/chat'
import { useDebounce } from '../../hooks/useDebounce'
import { CONFIG } from '../../config/constants'

// ── Types ──

type MsgFilter = 'all' | 'text' | 'image' | 'product_card'

const FILTER_TABS: { key: MsgFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'admin.chatDetail.filterAll' },
  { key: 'text', labelKey: 'admin.chatDetail.filterText' },
  { key: 'image', labelKey: 'admin.chatDetail.filterImage' },
  { key: 'product_card', labelKey: 'admin.chatDetail.filterCard' },
]

// ── Styled Components ──

const Layout = styled.div`
  display: flex;
  gap: ${Spacing.xxl}px;
  height: calc(100vh - 56px - ${Spacing.xxl * 2}px);
`

// ── Left: Conversation List ──

const Sidebar = styled.div`
  width: 300px;
  min-width: 300px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const SidebarHeader = styled.div`
  padding: ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  font-size: ${FontSize.md}px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SidebarCount = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  font-weight: 400;
`

const ConvList = styled.div`
  flex: 1;
  overflow-y: auto;
`

const ConvItem = styled.div<{ $active: boolean }>`
  padding: 12px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  cursor: pointer;
  background: ${props => props.$active ? '#f5f5f5' : 'transparent'};
  transition: background ${Transition.fast};

  &:hover { background: #f9f9f9; }
`

const ConvTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`

const ConvUser = styled.span`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.heading};
`

const ConvSubject = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
`

const ConvTime = styled.span`
  font-size: 11px;
  color: ${Color.text.muted};
  white-space: nowrap;
`

const ConvBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
`

const ConvLastMsg = styled.span`
  font-size: 12px;
  color: ${Color.text.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #e74c3c;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
`

// ── Right: Chat Detail ──

const DetailArea = styled.div`
  flex: 1;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`

const DetailHeader = styled.div`
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const DetailTitle = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`

const DetailUser = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${Color.text.secondary};
`

const DetailActions = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
`

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 6px 14px;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${Transition.fast};
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};

  &:hover:not(:disabled) {
    background: #f5f5f5;
    color: #333;
  }

  ${props => props.$variant === 'primary' && `
    background: #059669;
    color: #fff;
    border-color: #059669;
    &:hover:not(:disabled) { background: #047857; }
  `}

  ${props => props.$variant === 'danger' && `
    border-color: #dc2626;
    color: #dc2626;
    &:hover:not(:disabled) { background: #fef2f2; }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

// ── Messages area ──

const MessageListContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`

// ── Scroll-to-bottom FAB ──

const ScrollToBottomFab = styled.button<{ $visible: boolean }>`
  position: absolute;
  bottom: 16px;
  right: 24px;
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

  &:hover:not(:disabled) { background: #f5f5f5; color: #333; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

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

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
  top: 2px; right: 2px;
  width: 18px; height: 18px;
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

const EmptyDetail = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: ${FontSize.md}px;
`

const LockBanner = styled.div`
  background: #fff7ed;
  border-bottom: 1px solid #fed7aa;
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  font-size: ${FontSize.sm}px;
  color: #c2410c;
  display: flex;
  align-items: center;
  gap: ${Spacing.sm}px;
`

const LoadingMore = styled.div`
  text-align: center;
  padding: 12px;
  color: #999;
  font-size: 13px;
`

// ── Product Search Popup ──

const ProductSearchOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ProductSearchPopover = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.modal};
  width: 420px;
  max-height: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ProductSearchHeader = styled.div`
  padding: ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  font-size: ${FontSize.md}px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ProductSearchClose = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  border-radius: ${Radius.xs}px;

  &:hover { background: #f0f0f0; color: #333; }
`

const ProductSearchInput = styled.input`
  width: 100%;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 10px 12px;
  font-size: ${FontSize.base}px;
  outline: none;
  margin: ${Spacing.md}px ${Spacing.lg}px;
  box-sizing: border-box;

  &:focus { border-color: ${Color.primary}; }
`

const ProductList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${Spacing.lg}px ${Spacing.md}px;
`

const ProductItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #f9f9f9; }
`

const ProductItemImg = styled.img`
  width: 48px;
  height: 48px;
  border-radius: ${Radius.xs}px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f5f5f5;
`

const ProductItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const ProductItemName = styled.div`
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ProductItemPrice = styled.div`
  font-size: 14px;
  color: #e74c3c;
  font-weight: 600;
  margin-top: 2px;
`

const ProductSearchEmpty = styled.div`
  text-align: center;
  padding: 32px 0;
  color: #999;
  font-size: 13px;
`

// ── Helpers ──

function formatTime(ts: string, t: (key: string) => string): string {
  if (!ts) return '-'
  const date = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (msgDay.getTime() === today.getTime()) return `${t('admin.chatDetail.today')} ${time}`
  if (msgDay.getTime() === yesterday.getTime()) return `${t('admin.chatDetail.yesterday')} ${time}`
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

function statusBadgeType(status: string) {
  if (status === 'open') return 'submitted'
  return 'off_sale'
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'open') return t('admin.chatDetail.statusOpen')
  if (status === 'closed') return t('admin.chatDetail.statusClosed')
  return status
}

// ── Component ──

export default function AdminChatDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { adminUser } = useAdminAuth()

  // Conversations list
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [listLoading, setListLoading] = useState(false)

  // Active conversation
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null)
  const [convLoading, setConvLoading] = useState(false)

  // Input
  const [inputText, setInputText] = useState('')
  const [inputAttachments, setInputAttachments] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Virtual scroll
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const atBottomRef = useRef(true)

  // Filter
  const [msgFilter, setMsgFilter] = useState<MsgFilter>('all')

  // Typing
  const [isTyping, setIsTyping] = useState(false)

  // Product search
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const productSearchInputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(productSearchQuery, CONFIG.ADMIN_CHAT_DEBOUNCE_MS)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load conversations list ──
  const loadConversations = useCallback(async () => {
    try {
      setListLoading(true)
      const result = await adminChatAPI.getConversations({ page_size: CONFIG.ADMIN_CHAT_LIST_PAGE_SIZE })
      const list = result.results || (result as unknown as ConversationSummary[])
      setConversations(Array.isArray(list) ? list : [])
    } catch {
      // ignore
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Load active conversation ──
  const loadDetail = useCallback(async (convId: number) => {
    try {
      setConvLoading(true)
      const detail = await adminChatAPI.getConversation(convId)
      setActiveConv(detail)
    } catch {
      // ignore
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadDetail(parseInt(id))
    }
  }, [id, loadDetail])

  // ── Poll active conversation ──
  useEffect(() => {
    if (id) {
      pollRef.current = setInterval(() => loadDetail(parseInt(id!)), CONFIG.ADMIN_CHAT_POLL_INTERVAL)
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [id, loadDetail])

  // ── Product search ──
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setProductResults([])
      return
    }
    let cancelled = false
    const doSearch = async () => {
      try {
        setProductSearching(true)
        const results = await adminChatAPI.searchProducts(debouncedQuery)
        if (!cancelled) setProductResults(results)
      } catch {
        if (!cancelled) setProductResults([])
      } finally {
        if (!cancelled) setProductSearching(false)
      }
    }
    doSearch()
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Focus search input when popup opens
  useEffect(() => {
    if (showProductSearch) {
      setTimeout(() => productSearchInputRef.current?.focus(), CONFIG.ADMIN_CHAT_FOCUS_DELAY)
    }
  }, [showProductSearch])

  // ── Send message ──
  const handleSend = async () => {
    if (!id) return
    if (!inputText.trim() && inputAttachments.length === 0) return
    const convId = parseInt(id)
    const text = inputText
    const atts = inputAttachments
    setInputText('')
    setInputAttachments([])
    try {
      setSending(true)
      await adminChatAPI.sendMessage(convId, { content: text, attachments: atts })
      await loadDetail(convId)
      await loadConversations()
    } catch {
      setInputText(text)
      setInputAttachments(atts)
    } finally {
      setSending(false)
    }
  }

  // ── Send product card ──
  const handleSendProductCard = async (product: ProductSearchResult) => {
    if (!id) return
    const convId = parseInt(id)
    try {
      setSending(true)
      await adminChatAPI.sendMessage(convId, {
        content: '',
        msg_type: 'product_card',
        product_card: {
          id: product.id,
          name: product.name,
          main_image: product.main_image,
          price: product.price,
        },
      })
      await loadDetail(convId)
      await loadConversations()
      setShowProductSearch(false)
      setProductSearchQuery('')
      setProductResults([])
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  // ── Mark replied ──
  const handleMarkReplied = async () => {
    if (!id || !activeConv) return
    try {
      await adminChatAPI.markReplied(parseInt(id))
      await loadDetail(parseInt(id))
      await loadConversations()
    } catch { /* ignore */ }
  }

  // ── Close ──
  const handleClose = async () => {
    if (!id) return
    try {
      await adminChatAPI.closeConversation(parseInt(id))
      await loadDetail(parseInt(id))
      await loadConversations()
    } catch { /* ignore */ }
  }

  // ── Upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      setUploading(true)
      for (const file of Array.from(files)) {
        const result = await adminChatAPI.uploadFile(file)
        setInputAttachments(prev => [...prev, result.url])
      }
    } catch { /* ignore */ } finally {
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

  // ── Map message ──
  const mapMessage = (msg: ChatMessage) => {
    const isMine: boolean = msg.sender === 'admin'
    const type = (msg.msg_type || 'text') as 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share'
    let fileUrl: string | undefined
    if ((type === 'image' || type === 'video') && msg.file_url) {
      fileUrl = msg.file_url
    }
    return {
      id: msg.id,
      type,
      content: msg.content || '',
      isMine,
      timestamp: msg.created_at,
      fileUrl,
      productSnapshot: msg.card_data ? {
        id: msg.card_data.id ?? 0,
        name: msg.card_data.title ?? '',
        main_image: msg.card_data.image ?? '',
        price: msg.card_data.price ?? '',
      } : undefined,
      productCardData: msg.card_data ? {
        id: msg.card_data.id ?? 0,
        name: msg.card_data.title ?? '',
        main_image: msg.card_data.image ?? '',
        price: msg.card_data.price ?? '',
        order_status: msg.card_data.order_status,
        order_id: msg.card_data.order_id,
      } : undefined,
      cartItems: undefined,
      isRead: msg.is_read === true,
    }
  }

  // ── Filtered messages ──
  const filteredMessages = useMemo(() => {
    if (!activeConv?.messages) return []
    return activeConv.messages
      .map(mapMessage)
      .filter(msg => {
        if (msgFilter === 'all') return true
        const m = msg as { type: string }
        if (msgFilter === 'text') return m.type === 'text'
        if (msgFilter === 'image') return m.type === 'image' || m.type === 'video'
        if (msgFilter === 'product_card') return m.type === 'product_card' || m.type === 'product_link'
        return true
      })
  }, [activeConv?.messages, msgFilter])

  const isLockedByOther = activeConv?.handled_by != null && activeConv.handled_by !== adminUser?.id
  const isInputDisabled = activeConv?.status === 'closed' || isLockedByOther

  // ── Scrolling ──
  const scrollToBottom = useCallback(() => {
    if (filteredMessages.length > 0) {
      virtuosoRef.current?.scrollToIndex({
        index: filteredMessages.length - 1,
        behavior: 'smooth',
        align: 'end',
      })
    }
  }, [filteredMessages.length])

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    atBottomRef.current = atBottom
    setShowScrollFab(!atBottom && filteredMessages.length > CONFIG.SCROLL_FAB_THRESHOLD)
  }, [filteredMessages.length])

  const followOutput = useCallback(() => {
    if (!atBottomRef.current) return 'smooth' as const
    return 'auto' as const
  }, [])

  // ── Render Virtuoso item ──
  const renderMessageItem = useCallback((_index: number, item: ReturnType<typeof mapMessage>) => {
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

  return (
    <Layout>
      {/* Left: Conversation List */}
      <Sidebar>
        <SidebarHeader>
          <span>{t('admin.chatDetail.conversationList')}</span>
          <SidebarCount>{conversations.length}</SidebarCount>
        </SidebarHeader>
        <ConvList>
          {listLoading && conversations.length === 0 && (
            <LoadingMore>{t('admin.chatDetail.loading')}</LoadingMore>
          )}
          {conversations.map(conv => (
            <ConvItem
              key={conv.id}
              $active={String(conv.id) === id}
              onClick={() => navigate(`/admin/chat/${conv.id}`)}
            >
              <ConvTop>
                <ConvUser>{conv.user?.username}</ConvUser>
                <StatusBadge
                  status={statusBadgeType(conv.status) as 'submitted' | 'approved' | 'off_sale'}
                  label={statusLabel(conv.status, t)}
                />
              </ConvTop>
              <ConvSubject>{conv.subject || `${t('admin.chatDetail.support')} #${conv.id}`}</ConvSubject>
              <ConvBottom>
                <ConvLastMsg>
                  {conv.last_message?.content?.slice(0, 30) || t('admin.chatDetail.noMessages')}
                </ConvLastMsg>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ConvTime>{formatTime(conv.updated_at, t)}</ConvTime>
                  {conv.unread_count > 0 && <UnreadBadge>{conv.unread_count}</UnreadBadge>}
                </div>
              </ConvBottom>
            </ConvItem>
          ))}
        </ConvList>
      </Sidebar>

      {/* Right: Chat Detail */}
      <DetailArea>
        {activeConv && id ? (
          <>
            <DetailHeader>
              <DetailTitle>
                {activeConv.subject || `${t('admin.chatDetail.support')} #${activeConv.id}`}
                <DetailUser>{activeConv.user?.username}</DetailUser>
                <StatusBadge
                  status={statusBadgeType(activeConv.status) as 'submitted' | 'approved' | 'off_sale'}
                  label={statusLabel(activeConv.status, t)}
                />
              </DetailTitle>
              <DetailActions>
                {activeConv.status === 'open' && (
                  <ActionBtn $variant="primary" onClick={handleMarkReplied}>
                    {t('admin.chatDetail.markReplied')}
                  </ActionBtn>
                )}
                {activeConv.status !== 'closed' && (
                  <ActionBtn $variant="danger" onClick={handleClose}>
                    {t('admin.chatDetail.closeConversation')}
                  </ActionBtn>
                )}
              </DetailActions>
            </DetailHeader>

            {isLockedByOther && (
              <LockBanner>
                <Icon name="lock" size={16} />
                {t('admin.chatDetail.lockBanner').replace('{handler}', activeConv.handled_by_name || t('admin.chatDetail.otherAdmin'))}
              </LockBanner>
            )}

            {/* Filter tabs */}
            <FilterTabs>
              {FILTER_TABS.map(tab => (
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
            <MessageListContainer>
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
                  Header: () => convLoading ? (
                    <LoadingMore>{t('admin.chatDetail.loading')}</LoadingMore>
                  ) : null,
                  Footer: () => (
                    <>
                      {isTyping && (
                        <TypingIndicator name={activeConv.user?.username ?? ''} />
                      )}
                      {activeConv.status === 'closed' && (
                        <SystemBubbleMessage content={t('admin.chatDetail.conversationClosed')} />
                      )}
                    </>
                  ),
                }}
              />

              <ScrollToBottomFab $visible={showScrollFab} onClick={scrollToBottom}>
                <Icon name="chevron-down" />
              </ScrollToBottomFab>
            </MessageListContainer>

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
                  {/* 🛒 Product search button */}
                  <ToolBtn
                    onClick={() => setShowProductSearch(true)}
                    disabled={isInputDisabled}
                    title={t('admin.chatDetail.sendProductCard')}
                  >
                    <Icon name="cart" />
                  </ToolBtn>

                  <TextInput
                    placeholder={t('admin.chatDetail.inputPlaceholder')}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isInputDisabled}
                  />
                  <SendBtn
                    onClick={handleSend}
                    disabled={isInputDisabled || sending || (!inputText.trim() && inputAttachments.length === 0)}
                  >
                    {sending ? t('admin.chatDetail.sending') : <Icon name="send" />}
                  </SendBtn>
                </InputRow>
                <ToolBar>
                  <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={isInputDisabled || uploading}>
                    <Icon name="image" />
                    {uploading ? t('admin.chatDetail.uploading') : t('admin.chatDetail.mediaLabel')}
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
          </>
        ) : (
          <EmptyDetail>
            {t('admin.chatDetail.selectConversationHint')}
          </EmptyDetail>
        )}
      </DetailArea>

      {/* Product Search Popup */}
      {showProductSearch && (
        <ProductSearchOverlay onClick={() => setShowProductSearch(false)}>
          <ProductSearchPopover onClick={(e) => e.stopPropagation()}>
            <ProductSearchHeader>
              <span>🛒 {t('admin.chatDetail.selectProduct')}</span>
              <ProductSearchClose onClick={() => setShowProductSearch(false)}>×</ProductSearchClose>
            </ProductSearchHeader>

            <ProductSearchInput
              ref={productSearchInputRef}
              placeholder={t('admin.chatDetail.searchProductPlaceholder')}
              value={productSearchQuery}
              onChange={e => setProductSearchQuery(e.target.value)}
            />

            <ProductList>
              {productSearching && (
                <LoadingMore>{t('admin.chatDetail.searching')}</LoadingMore>
              )}
              {!productSearching && productResults.length === 0 && debouncedQuery && (
                <ProductSearchEmpty>
                  {t('admin.chatDetail.noProductsFound')}
                </ProductSearchEmpty>
              )}
              {!productSearching && !debouncedQuery && (
                <ProductSearchEmpty>
                  {t('admin.chatDetail.searchHint')}
                </ProductSearchEmpty>
              )}
              {productResults.map(product => (
                <ProductItem key={product.id}>
                  <ProductItemImg
                    src={product.main_image}
                    alt={product.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <ProductItemInfo>
                    <ProductItemName>{product.name}</ProductItemName>
                    <ProductItemPrice>¥{product.price}</ProductItemPrice>
                  </ProductItemInfo>
                  <ActionBtn
                    $variant="primary"
                    onClick={() => handleSendProductCard(product)}
                    style={{ flexShrink: 0 }}
                  >
                    {t('admin.chatDetail.sendCard')}
                  </ActionBtn>
                </ProductItem>
              ))}
            </ProductList>
          </ProductSearchPopover>
        </ProductSearchOverlay>
      )}
    </Layout>
  )
}
