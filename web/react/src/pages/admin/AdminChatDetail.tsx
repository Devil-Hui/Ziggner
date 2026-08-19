import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
// 消息列表采用原生滚动容器，需要支持滚动容器高度测量与切换会话后重新定位
// 保留 ReactNode 类型以支持 renderMessageItem 返回任意 React 节点
import type { ReactNode } from 'react'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { PrimaryBtn as SendBtn } from '../../components/admin/common/ui'
import { StatusBadge } from '../../components/admin/common'
import HorizontalScroll from '../../components/common/HorizontalScroll'
import { Icon } from '../../components/admin/common/Icon'
import { useTranslation } from '../../i18n'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { ChatBubble, SystemBubbleMessage, TypingIndicator } from '../../components/business/ChatBubble'
import type { ProductSnapshot, CartItem, ProductCardData } from '../../components/business/ChatBubble'
import {
  chatAPI,
  adminChatAPI,
  type ConversationSummary,
  type ConversationDetail,
  type ChatMessage,
  type ProductSearchResult,
  mergeWsMessage,
  resolveMediaUrl,
} from '../../api/chat'
import { compressImage } from '../../utils/imageCompression'
import { useDebounce } from '../../hooks/useDebounce'
import { CONFIG } from '../../config/constants'

// ── Types ──

type MsgFilter = 'all' | 'text' | 'image' | 'product_card'

const FILTER_TABS: { key: MsgFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'store.chatDetail.filterAll' },
  { key: 'text', labelKey: 'store.chatDetail.filterText' },
  { key: 'image', labelKey: 'store.chatDetail.filterImage' },
  { key: 'product_card', labelKey: 'store.chatDetail.filterCard' },
]

// 订单状态 → 徽标配色（与后端 Order.status 对齐）
const ORDER_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending_payment: { bg: '#fff7ed', color: '#f59e0b' },
  paid: { bg: '#eff6ff', color: '#2563eb' },
  shipped: { bg: '#ecfdf5', color: '#059669' },
  delivered: { bg: '#ecfeff', color: '#0891b2' },
  completed: { bg: '#ecfdf5', color: '#047857' },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af' },
  refunding: { bg: '#fef2f2', color: '#e74c3c' },
}

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

// ── Right: Orders Panel（可收起） ──

const OrdersPanel = styled.div`
  width: 300px;
  min-width: 300px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* 窄窗口：面板脱离文档流，浮动覆盖在聊天区右侧，
     避免与左侧会话列表(300px)合计挤压聊天区，导致消息列表塌缩成极窄列 */
  @media (max-width: 1180px) {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    height: auto;
    z-index: 60;
    border-radius: 0;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
  }
`

const OrdersHeader = styled.div`
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  font-size: ${FontSize.md}px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const CollapseBtn = styled.button`
  border: none;
  background: ${Color.bg.page};
  color: ${Color.text.muted};
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background ${Transition.fast};

  &:hover { background: #e9e9e9; }
`

const OrdersBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${Spacing.md}px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const OrderCard = styled.div<{ $active: boolean }>`
  border: 1px solid ${props => props.$active ? '#07c160' : Color.border.light};
  background: ${props => props.$active ? '#f0fdf4' : '#ffffff'};
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};

  &:hover {
    border-color: #07c160;
    box-shadow: 0 2px 6px rgba(7,193,96,0.12);
  }
`

const OrderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  & + & { margin-top: 6px; }
`

const OrderNo = styled.div`
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`

const OrderMeta = styled.div`
  font-size: 11px;
  color: #999;
`

const OrderStatusTag = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
`

const OrdersEmpty = styled.div`
  padding: ${Spacing.xl}px;
  text-align: center;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
`

// 收起后的按钮（横排），点击展开
const OrdersCollapsedBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  cursor: pointer;

  &:hover { background: #f7f7f7; }

  span {
    font-size: ${FontSize.xs}px;
    color: ${Color.text.muted};
  }
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
  /* 关键修复：CJK 文本无断开点，flex 子项默认 min-width:auto 会塌缩到
     最小内容宽度（单字宽），导致标题竖排成多行、撑高头部、挤占消息列表高度。
     这里让标题占满剩余宽度并可收缩，配合内部 ellipsis 单行显示。 */
  flex: 1;
  min-width: 0;
`

const DetailSubject = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DetailUser = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${Color.text.secondary};
`

const ProductChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #e74c3c;
  background: #fef2f2;
  border: 1px solid #fde2e2;
  border-radius: 10px;
  padding: 1px 8px;
  cursor: pointer;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover { background: #fde2e2; }
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

// ── 顶部上下文上悬窗：用户 + 当前咨询商品 + 关联订单（参考京东/拼多多客服工作台）──
// 常驻于对话区顶部，对话滚动时不丢失，替代原先只在右侧/标题里的零散信息
const ContextBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px ${Spacing.lg}px;
  background: linear-gradient(180deg, #fcfcfc, ${Color.bg.card});
  border-bottom: 1px solid ${Color.border.light};
`

const CtxUser = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border-right: 1px solid ${Color.border.light};
`

const CtxAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${Color.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
`

const CtxUserName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${Color.text.heading};
`

const CtxLabel = styled.span`
  font-size: 11px;
  color: ${Color.text.muted};
  display: block;
  line-height: 1.3;
`

const CtxProduct = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: #f7f7f8;
  transition: background ${Transition.fast};

  &:hover { background: #f0f0f1; }
`

const CtxProductImg = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: #eee;
`

const CtxProductName = styled.div`
  font-size: 13px;
  color: #333;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CtxProductPrice = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #e74c3c;
`

const CtxOrder = styled.button`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid ${Color.border.light};
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};
  text-align: left;

  &:hover {
    border-color: #07c160;
    box-shadow: 0 2px 6px rgba(7,193,96,0.12);
  }
`

const CtxOrderMeta = styled.div`
  font-size: 12px;
  color: #333;
`

const CtxOrderSub = styled.div`
  font-size: 11px;
  color: #999;
  margin-top: 2px;
`

// ── Filter tabs ──

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
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
  flex-shrink: 0;
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`

const MessageItemWrapper = styled.div`
  padding: 4px 0;
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

const SendErrorBar = styled.div`
  padding: 8px ${Spacing.lg}px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 12px;
  text-align: center;
  border-top: 1px solid #fecaca;
`

const LoadOlderBtn = styled.button`
  border: 1px solid ${Color.border.light};
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  font-size: 12px;
  border-radius: 14px;
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
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
  if (msgDay.getTime() === today.getTime()) return `${t('store.chatDetail.today')} ${time}`
  if (msgDay.getTime() === yesterday.getTime()) return `${t('store.chatDetail.yesterday')} ${time}`
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

function statusBadgeType(status: string) {
  if (status === 'open') return 'submitted'
  return 'off_sale'
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'open') return t('store.chatDetail.statusOpen')
  if (status === 'closed') return t('store.chatDetail.statusClosed')
  return status
}

// ── Component ──

export default function AdminChatDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { adminUser, isSuperAdmin, isGroupLeader } = useAdminAuth()

  // Conversations list
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [listLoading, setListLoading] = useState(false)

  // Active conversation
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null)
  const [convLoading, setConvLoading] = useState(false)

  // WS 引用与已 ACK 集合（用于把对方历史未读消息标记为已读）
  const wsRef = useRef<WebSocket | null>(null)
  const ackedRef = useRef<Set<number>>(new Set())

  // Input
  const [inputText, setInputText] = useState('')
  const [inputAttachments, setInputAttachments] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sendError, setSendError] = useState('')

  // 原生滚动容器（替代 Virtuoso）
  const scrollRef = useRef<HTMLDivElement>(null)
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
  // 左侧会话列表防抖刷新：收到 WS 新消息 / 标记已读后刷新 last_message·unread·updated_at
  const listRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 右侧订单面板：默认展开，可收起以让出更多对话空间
  const [ordersCollapsed, setOrdersCollapsed] = useState(false)
  const hasOrders = !!(activeConv?.order_info && activeConv.order_info.length > 0)

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

  useEffect(() => {
    loadConversations()
    // 清理未触发的列表防抖定时器，防止组件卸载后回调对已卸载组件 setState / 发起游离请求
    return () => {
      if (listRefreshTimer.current) clearTimeout(listRefreshTimer.current)
    }
  }, [loadConversations])

  // 防抖刷新左侧会话列表（合并短时间内多次触发，避免轮询式频繁请求）
  const scheduleListRefresh = useCallback(() => {
    if (listRefreshTimer.current) clearTimeout(listRefreshTimer.current)
    listRefreshTimer.current = setTimeout(() => { loadConversations() }, 600)
  }, [loadConversations])

  // ── Load active conversation ──
  const loadDetail = useCallback(async (convId: number, opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    try {
      if (!silent) setConvLoading(true)
      const detail = await adminChatAPI.getConversation(convId)
      setActiveConv(detail)
    } catch {
      // ignore
    } finally {
      if (!silent) setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadDetail(parseInt(id))
    }
  }, [id, loadDetail])

  // ── Poll active conversation ──
  // 轮询静默刷新（不触发顶部 loading 闪烁），仅用于兜底对齐服务端状态；
  // 实时增量仍由 WebSocket 合并驱动，避免「间歇性 loading」。
  useEffect(() => {
    if (id) {
      pollRef.current = setInterval(() => loadDetail(parseInt(id!), { silent: true }), CONFIG.ADMIN_CHAT_POLL_INTERVAL)
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [id, loadDetail])

  // ── 实时 WebSocket：接收买家新消息即时刷新（客服侧实时推送）──
  useEffect(() => {
    if (!id) return
    const convId = parseInt(id)
    // WS 必须走 API 域名：Cloudflare Pages 静态托管不代理 WebSocket（同源 /ws 返回 200 HTML）。
    // 使用 VITE_WS_URL（=wss://api.ziggner.com，经 nginx /ws → daphne:8001），缺失时回退同源（本地 dev）。
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const configured = (import.meta.env.VITE_WS_URL || '').replace(/\/+$/, '')
    const wsBase = configured || `${scheme}://${window.location.host}`
    let ws: WebSocket | null = null
    let closedByUs = false
    let retry = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    try {
      ws = new WebSocket(`${wsBase}/ws/chat/${convId}/`)
      wsRef.current = ws
        ws.onopen = () => { retry = 0 }
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data.type === 'ping') { ws?.send(JSON.stringify({ type: 'pong' })); return }
            if (data.type === 'message' || data.type === 'new_message') {
              // 增量合并，不再整页重载（避免最新一条被旧数据覆盖的竞态）
              const isOwn = data.payload?.sender_type === 'admin'
              setActiveConv((prev) => mergeWsMessage(prev, data.payload ?? {}, 'admin', 'message'))
              // 仅对「对方」的消息发 ACK（自己发的回显不 ACK，否则会自己标记自己已读）
              if (!isOwn && data.msg_id) {
                ws?.send(JSON.stringify({ type: 'ack', msg_id: String(data.msg_id) }))
              }
              // 收到新消息 → 刷新左侧会话列表（last_message / unread / updated_at），
              // 消除「需刷新才能看到最新对话」的列表滞后
              scheduleListRefresh()
            } else if (data.type === 'read_receipt') {
              setActiveConv((prev) => mergeWsMessage(prev, data, 'admin', 'read_receipt'))
            }
          } catch { /* ignore */ }
        }
    ws.onclose = () => {
      wsRef.current = null
      if (closedByUs || retry >= CONFIG.WS_MAX_RECONNECT_ATTEMPTS) return
      const delay = Math.min(
        CONFIG.WS_RECONNECT_BASE_DELAY * Math.pow(2, retry),
        CONFIG.WS_RECONNECT_MAX_DELAY,
      )
      retry++
      retryTimer = setTimeout(connect, delay)
    }
        ws.onerror = () => { /* onclose 随后触发 */ }
      } catch { /* ignore */ }
    }
    connect()
    return () => {
      closedByUs = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    }
  }, [id, loadDetail, scheduleListRefresh])

  // 进入会话后，把「对方」的历史未读消息标记为已读：
  // - WS 连通时发 ACK（实时让对方看到「已读」回执）
  // - 同时走 HTTP 兜底标记已读，确保即使 WebSocket 未连接，左侧红点也会消失
  useEffect(() => {
    if (!activeConv?.messages || !id) return
    let hasUnread = false
    for (const m of activeConv.messages) {
      if (m.sender_type !== 'admin' && !m.is_read && m.id > 0 && !ackedRef.current.has(m.id)) {
        ackedRef.current.add(m.id)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ack', msg_id: String(m.id) }))
        }
        hasUnread = true
      }
    }
    if (hasUnread) {
      adminChatAPI.markConversationRead(parseInt(id)).catch(() => {})
      scheduleListRefresh()
    }
  }, [activeConv?.messages, id, scheduleListRefresh])

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
    const text = inputText.trim()
    const atts = inputAttachments
    if (!text && atts.length === 0) return
    const convId = parseInt(id)
    setInputText('')
    setInputAttachments([])
    setSendError('')

    // 构造待发送队列：文本一条 + 每个附件一条（带推导出的 msg_type / file_url）。
    // 修复点：此前把附件塞进 attachments[] 且漏传 msg_type，后端虽存了附件消息，
    // 但既不返回也不广播，导致「图片/视频无法显示 / 需刷新才出现」(T10)。
    // 现改为逐条发送，每条都带明确 msg_type + file_url，后端单条存储并实时广播。
    type PendingSend = {
      tempId: number
      params: { content?: string; msg_type?: 'text' | 'image' | 'video'; file_url?: string }
    }
    const pending: PendingSend[] = []
    if (text) {
      pending.push({ tempId: -Date.now(), params: { content: text, msg_type: 'text' } })
    }
    for (const url of atts) {
      const isVideo = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(url)
      pending.push({
        tempId: -(Date.now() + pending.length + 1),
        params: { content: '', msg_type: isVideo ? 'video' : 'image', file_url: url },
      })
    }

    // 乐观插入所有待发送消息，消除「发送后等待」的卡顿感
    const optimisticMsgs: ChatMessage[] = pending.map((p) => ({
      id: p.tempId,
      sender: 'optimistic',
      sender_type: 'admin',
      sender_name: '',
      content: p.params.content || '',
      msg_type: (p.params.msg_type || 'text') as ChatMessage['msg_type'],
      file_url: p.params.file_url || null,
      card_data: null,
      is_read: true,
      read_at: null,
      created_at: new Date().toISOString(),
      status: 'sending',
    }))
    setActiveConv((prev) => prev ? { ...prev, messages: [...(prev.messages || []), ...optimisticMsgs] } : prev)

    try {
      setSending(true)
      for (const p of pending) {
        try {
          const resp = await adminChatAPI.sendMessage(convId, p.params)
          // 用服务端返回的真实消息替换乐观临时消息（status=sent），不再整页重载
          setActiveConv((prev) => {
            if (!prev) return prev
            const copy = (prev.messages || []).slice()
            const idx = copy.findIndex((m) => m.id === p.tempId)
            if (idx >= 0) copy[idx] = { ...resp, status: 'sent' }
            else if (!copy.some((m) => m.id === resp.id)) copy.push({ ...resp, status: 'sent' })
            return { ...prev, messages: copy }
          })
        } catch {
          // 单条失败回滚该条乐观消息
          setActiveConv((prev) => prev ? { ...prev, messages: (prev.messages || []).filter(m => m.id !== p.tempId) } : prev)
          setSendError(t('store.chat.sendFailed'))
        }
      }
      await loadConversations()
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
      setSendError(t('store.chat.sendFailed'))
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

  // ── 加载更早的历史消息（分页向上翻）──
  const handleLoadOlder = async () => {
    const conv = activeConv
    if (!conv || loadingOlder) return
    const oldestId = conv.messages.length ? conv.messages[0].id : undefined
    if (oldestId == null) return
    setLoadingOlder(true)
    try {
      const { results, has_more_older } = await chatAPI.getOlderMessages(conv.id, oldestId)
      setActiveConv((prev) => {
        if (!prev || prev.id !== conv.id) return prev
        const existingIds = new Set(prev.messages.map((m) => m.id))
        const older = results.filter((m) => !existingIds.has(m.id))
        return { ...prev, messages: [...older, ...prev.messages], has_more_older }
      })
    } catch {
      // 加载失败保持现状，按钮可重试
    } finally {
      setLoadingOlder(false)
    }
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

  // ── Force takeover (superadmin / leader) ──
  const handleForceTakeover = async () => {
    if (!id) return
    try {
      await adminChatAPI.takeoverConversation(parseInt(id))
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
        // 聊天图片压缩（>200KB 触发，聊天场景不需要超高画质）
        const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, initialQuality: 0.8 })
        const result = await adminChatAPI.uploadFile(compressed)
        // 后端 LocalStorage 返回的是回环地址（http://127.0.0.1/media/...），
        // 公网 HTTPS 页会被 Mixed Content 拦截且连不上。必须用 resolveMediaUrl
        // 改写为 API 域名（https://api.ziggner.com/media/...），否则预览/发送都失败。
        setInputAttachments(prev => [...prev, resolveMediaUrl(result.url) ?? result.url])
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
    // 注意：后端 sender 是用户主键（数字），不能用来判断身份；必须用 sender_type。
    // 此前写成 msg.sender === 'admin' 永远为 false，导致管理端所有消息都渲染成「对方」。
    const isMine: boolean = msg.sender_type === 'admin'
    const type = (msg.msg_type || 'text') as 'text' | 'image' | 'video' | 'product_link' | 'product_card' | 'cart_share'
    let fileUrl: string | undefined
    if ((type === 'image' || type === 'video') && msg.file_url) {
      fileUrl = resolveMediaUrl(msg.file_url) || undefined
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
        order_no: msg.card_data.order_no,
      } : undefined,
      cartItems: undefined,
      receipt,
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

  const isHandledByOther = activeConv?.handled_by != null && activeConv.handled_by !== adminUser?.id
  const canForceTakeover = (isSuperAdmin || isGroupLeader) && isHandledByOther
  // 占线只读：被他人占用且当前管理员无权强制接手（can_reply 已含超时自动释放判定）
  const isLockedReadOnly = isHandledByOther && !canForceTakeover
  // 以服务端 can_reply 为准：买家/超管/未占用/本人/超时释放 → 可发；否则禁用
  const isInputDisabled = activeConv?.status === 'closed' || !activeConv?.can_reply

  // ── Scrolling（原生滚动容器）──
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el && filteredMessages.length > 0) {
      el.scrollTop = el.scrollHeight
    }
  }, [filteredMessages.length])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < CONFIG.AT_BOTTOM_THRESHOLD_PX
    atBottomRef.current = atBottom
    setShowScrollFab(!atBottom && filteredMessages.length > CONFIG.SCROLL_FAB_THRESHOLD)
  }, [filteredMessages.length])

  // ── 初始定位：会话及其消息加载完成后滚动到底部 ──
  // lastScrolledConvIdRef 记录已定位的会话，避免重复滚动。
  const lastScrolledConvIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (!activeConv || !id) return
    if (lastScrolledConvIdRef.current === activeConv.id) return
    if (filteredMessages.length === 0) return
    lastScrolledConvIdRef.current = activeConv.id
    const t = setTimeout(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv, id, filteredMessages.length])

  // ── Render Virtuoso item ──
  const renderMessageItem = useCallback((_index: number, item: ReturnType<typeof mapMessage>) => {
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
  }, [navigate])

  return (
    <Layout>
      {/* Left: Conversation List */}
      <Sidebar>
        <SidebarHeader>
          <span>{t('store.chatDetail.conversationList')}</span>
          <SidebarCount>{conversations.length}</SidebarCount>
        </SidebarHeader>
        <ConvList>
          {listLoading && conversations.length === 0 && (
            <LoadingMore>{t('store.chatDetail.loading')}</LoadingMore>
          )}
          {conversations.map(conv => (
            <ConvItem
              key={conv.id}
              $active={String(conv.id) === id}
              onClick={() => navigate(`/admin/chat/${conv.id}`)}
            >
              <ConvTop>
                <ConvUser>{conv.user?.username}</ConvUser>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {conv.handled_by_name && (
                    <span style={{ fontSize: 11, color: '#c2410c', whiteSpace: 'nowrap' }}>
                      🙋 {conv.handled_by_name}
                    </span>
                  )}
                  <StatusBadge
                    status={statusBadgeType(conv.status) as 'submitted' | 'approved' | 'off_sale'}
                    label={statusLabel(conv.status, t)}
                  />
                </div>
              </ConvTop>
              <ConvSubject>{conv.subject || `${t('store.chatDetail.support')} #${conv.id}`}</ConvSubject>
              <ConvBottom>
                <ConvLastMsg>
                  {conv.last_message?.content?.slice(0, 30) || t('store.chatDetail.noMessages')}
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
                <DetailSubject>{activeConv.subject || `${t('store.chatDetail.support')} #${activeConv.id}`}</DetailSubject>
                <DetailUser>{activeConv.user?.username}</DetailUser>
                {activeConv.spu_info && (
                  <ProductChip onClick={() => navigate(`/product/${activeConv.spu_info!.id}`)}>
                    🛍️ {activeConv.spu_info.name}
                  </ProductChip>
                )}
                <StatusBadge
                  status={statusBadgeType(activeConv.status) as 'submitted' | 'approved' | 'off_sale'}
                  label={statusLabel(activeConv.status, t)}
                />
              </DetailTitle>
              <DetailActions>
                {activeConv.status === 'open' && (
                  <ActionBtn $variant="primary" onClick={handleMarkReplied}>
                    {t('store.chatDetail.markReplied')}
                  </ActionBtn>
                )}
                {activeConv.status !== 'closed' && (
                  <ActionBtn $variant="danger" onClick={handleClose}>
                    {t('store.chatDetail.closeConversation')}
                  </ActionBtn>
                )}
              </DetailActions>
            </DetailHeader>

            {/* 顶部上下文上悬窗：咨询客户 + 当前咨询商品 + 关联订单 */}
            <ContextBar>
              <CtxUser>
                <CtxAvatar>{(activeConv.user?.username || '?').slice(0, 1)}</CtxAvatar>
                <div>
                  <CtxLabel>咨询客户</CtxLabel>
                  <CtxUserName>{activeConv.user?.username}</CtxUserName>
                </div>
              </CtxUser>

              {activeConv.spu_info && (
                <CtxProduct onClick={() => navigate(`/product/${activeConv.spu_info!.id}`)}>
                  <CtxProductImg
                    src={resolveMediaUrl(activeConv.spu_info.main_image) || activeConv.spu_info.main_image || undefined}
                    alt={activeConv.spu_info.name}
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                  />
                  <div>
                    <CtxLabel>咨询商品</CtxLabel>
                    <CtxProductName>{activeConv.spu_info.name}</CtxProductName>
                  </div>
                  <CtxProductPrice>¥{activeConv.spu_info.price}</CtxProductPrice>
                </CtxProduct>
              )}

              {activeConv.order_info && activeConv.order_info.length > 0 && (() => {
                const o = activeConv.order_info![0]
                const st = ORDER_STATUS_STYLE[o.status] || { bg: '#f3f4f6', color: '#666' }
                return (
                  <CtxOrder onClick={() => navigate(`/order/${o.order_no}`)}>
                    <div>
                      <CtxOrderMeta>{o.order_no}</CtxOrderMeta>
                      <CtxOrderSub>
                        {o.sku_name ? `${o.sku_name} ×${o.quantity} · ` : ''}¥{o.total_amount}
                      </CtxOrderSub>
                    </div>
                    <OrderStatusTag style={{ background: st.bg, color: st.color }}>{o.status_label}</OrderStatusTag>
                  </CtxOrder>
                )
              })()}
            </ContextBar>

            {isHandledByOther && (
              <LockBanner>
                <Icon name="lock" size={16} />
                {t('store.chatDetail.lockBanner').replace('{handler}', activeConv.handled_by_name || t('store.chatDetail.otherAdmin'))}
                {canForceTakeover && (
                  <ActionBtn
                    $variant="primary"
                    onClick={handleForceTakeover}
                    style={{ marginLeft: 'auto' }}
                  >
                    {t('store.chatDetail.forceTakeover')}
                  </ActionBtn>
                )}
              </LockBanner>
            )}

            {/* Filter tabs */}
            <HorizontalScroll>
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
            </HorizontalScroll>

            {/* 消息列表（原生滚动容器，替代 Virtuoso） */}
            <MessageListContainer>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}
                data-testid="message-list-container"
              >
                {convLoading ? (
                  <LoadingMore>{t('store.chatDetail.loading')}</LoadingMore>
                ) : (
                  <>
                    {activeConv.has_more_older && activeConv.messages.length > 0 && (
                      <LoadingMore>
                        <LoadOlderBtn onClick={handleLoadOlder} disabled={loadingOlder}>
                          {loadingOlder ? t('store.chatDetail.loading') : '加载更早消息'}
                        </LoadOlderBtn>
                      </LoadingMore>
                    )}
                    {filteredMessages.map((item, index) => (
                      <MessageItemWrapper key={item.id}>
                        {renderMessageItem(index, item)}
                      </MessageItemWrapper>
                    ))}
                    {isTyping && (
                      <TypingIndicator name={activeConv.user?.username ?? ''} />
                    )}
                    {activeConv.status === 'closed' && (
                      <SystemBubbleMessage content={t('store.chatDetail.conversationClosed')} />
                    )}
                  </>
                )}
              </div>

              <ScrollToBottomFab $visible={showScrollFab} onClick={scrollToBottom}>
                <Icon name="chevron-down" />
              </ScrollToBottomFab>
            </MessageListContainer>

            {/* 发送失败提示 */}
            {sendError && <SendErrorBar>{sendError}</SendErrorBar>}

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
                    title={t('store.chatDetail.sendProductCard')}
                  >
                    <Icon name="cart" />
                  </ToolBtn>

                  <TextInput
                    placeholder={t('store.chatDetail.inputPlaceholder')}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isInputDisabled}
                  />
                  <SendBtn
                    onClick={handleSend}
                    disabled={isInputDisabled || sending || (!inputText.trim() && inputAttachments.length === 0)}
                  >
                    {sending ? t('store.chatDetail.sending') : <Icon name="send" />}
                  </SendBtn>
                </InputRow>
                <ToolBar>
                  <ToolBtn onClick={() => fileInputRef.current?.click()} disabled={isInputDisabled || uploading}>
                    <Icon name="image" />
                    {uploading ? t('store.chatDetail.uploading') : t('store.chatDetail.mediaLabel')}
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
            {t('store.chatDetail.selectConversationHint')}
          </EmptyDetail>
        )}
      </DetailArea>

      {/* Right: Orders Panel（可收起 / 点击订单查看详情） */}
      {hasOrders && !ordersCollapsed && (
        <OrdersPanel>
          <OrdersHeader>
            <span>订单信息（{activeConv!.order_info!.length}）</span>
            <CollapseBtn onClick={() => setOrdersCollapsed(true)} title="收起订单面板">»</CollapseBtn>
          </OrdersHeader>
          <OrdersBody>
            {activeConv!.order_info!.map((o) => {
              const st = ORDER_STATUS_STYLE[o.status] || { bg: '#f3f4f6', color: '#666' }
              return (
                <OrderCard
                  key={o.order_id}
                  $active={false}
                  onClick={() => navigate(`/order/${o.order_no}`)}
                >
                  <OrderRow>
                    <OrderNo>{o.order_no}</OrderNo>
                    <OrderStatusTag style={{ background: st.bg, color: st.color }}>
                      {o.status_label}
                    </OrderStatusTag>
                  </OrderRow>
                  <OrderMeta>
                    {o.sku_name ? `${o.sku_name} ×${o.quantity} · ` : ''}¥{o.total_amount}
                  </OrderMeta>
                </OrderCard>
              )
            })}
          </OrdersBody>
        </OrdersPanel>
      )}

      {/* 收起后的按钮：点击展开订单面板 */}
      {hasOrders && ordersCollapsed && (
        <OrdersCollapsedBar onClick={() => setOrdersCollapsed(false)} title="展开订单面板">
          <CollapseBtn as="div">«</CollapseBtn>
          <span>订单</span>
        </OrdersCollapsedBar>
      )}

      {/* Product Search Popup */}
      {showProductSearch && (
        <ProductSearchOverlay onClick={() => setShowProductSearch(false)}>
          <ProductSearchPopover onClick={(e) => e.stopPropagation()}>
            <ProductSearchHeader>
              <span>🛒 {t('store.chatDetail.selectProduct')}</span>
              <ProductSearchClose onClick={() => setShowProductSearch(false)}>×</ProductSearchClose>
            </ProductSearchHeader>

            <ProductSearchInput
              ref={productSearchInputRef}
              placeholder={t('store.chatDetail.searchProductPlaceholder')}
              value={productSearchQuery}
              onChange={e => setProductSearchQuery(e.target.value)}
            />

            <ProductList>
              {productSearching && (
                <LoadingMore>{t('store.chatDetail.searching')}</LoadingMore>
              )}
              {!productSearching && productResults.length === 0 && debouncedQuery && (
                <ProductSearchEmpty>
                  {t('store.chatDetail.noProductsFound')}
                </ProductSearchEmpty>
              )}
              {!productSearching && !debouncedQuery && (
                <ProductSearchEmpty>
                  {t('store.chatDetail.searchHint')}
                </ProductSearchEmpty>
              )}
              {productResults.map(product => (
                <ProductItem key={product.id}>
                  <ProductItemImg
                    src={resolveMediaUrl(product.main_image) || product.main_image}
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
                    {t('store.chatDetail.sendCard')}
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
