import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { useTranslation } from '../../i18n'
import { adminAPI } from '../../api/admin'
import { CONFIG } from '../../config/constants'
import { Icon } from './common/Icon'

// ── Types ──

interface Notification {
  id: number
  type: string
  title: string
  content: string
  is_read: boolean
  created_at: string
  read_at?: string | null
}

type TabKey = 'all' | 'system' | 'operation' | 'notification' | 'security' | 'error'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'admin.notifications.tabAll' },
  { key: 'system', labelKey: 'admin.notifications.tabSystem' },
  { key: 'operation', labelKey: 'admin.notifications.tabOperation' },
  { key: 'notification', labelKey: 'admin.notifications.tabNotification' },
  { key: 'security', labelKey: 'admin.notifications.tabSecurity' },
  { key: 'error', labelKey: 'admin.notifications.tabError' },
]

// ── Styled Components ──

const BellWrapper = styled.div`
  position: relative;
  display: inline-flex;
  z-index: 100;
`

const BellButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
  color: ${Color.text.secondary};
  padding: ${Spacing.xs}px;
  display: flex;
  align-items: center;

  &:hover {
    color: #e74c3c;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const Badge = styled.span`
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #e74c3c;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`

const CardWrapper = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 400px;
  max-height: 520px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.dropdown};
  border: 1px solid ${Color.border.light};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
  animation: slideDown 0.15s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Arrow pointing up */
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 18px;
    width: 10px;
    height: 10px;
    background: ${Color.bg.card};
    border-left: 1px solid ${Color.border.light};
    border-top: 1px solid ${Color.border.light};
    transform: rotate(45deg);
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
`

const CardTitle = styled.span`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.heading};
`

const MarkAllLink = styled.button`
  background: none;
  border: none;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.link};
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`

const TabBar = styled.div`
  display: flex;
  gap: 2px;
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  padding: 4px 10px;
  border: none;
  border-radius: ${Radius.sm}px;
  background: ${({ $active }) => ($active ? Color.primaryLight : 'transparent')};
  color: ${({ $active }) => ($active ? Color.primary : Color.text.secondary)};
  font-size: ${FontSize.xs}px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: all ${Transition.fast};
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => ($active ? Color.primaryLight : '#f3f4f6')};
    color: ${({ $active }) => ($active ? Color.primary : Color.text.body)};
  }
`

const NotificationList = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`

const NotificationItem = styled.div<{ $unread: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${Spacing.sm}px;
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border-bottom: 1px solid ${Color.border.light};
  cursor: pointer;
  transition: background ${Transition.fast};
  background: ${({ $unread }) => ($unread ? '#fef2f2' : 'transparent')};

  &:hover {
    background: ${({ $unread }) => ($unread ? '#fde8e8' : '#f9fafb')};
  }
`

const UnreadDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  margin-top: 6px;
  flex-shrink: 0;
`

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemTitle = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.heading};
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemBody = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const ItemTime = styled.div`
  font-size: 11px;
  color: ${Color.text.muted};
  margin-top: 4px;
`

const DismissBtn = styled.button`
  background: none;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  color: ${Color.text.muted};
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  border-radius: ${Radius.xs}px;

  &:hover {
    background: #f3f4f6;
    color: ${Color.text.body};
  }
`

const CardFooter = styled.div`
  border-top: 1px solid ${Color.border.light};
  padding: ${Spacing.sm}px ${Spacing.lg}px;
  text-align: center;
`

const ViewAllLink = styled.a`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.link};
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const EmptyState = styled.div`
  padding: ${Spacing.xxxl}px ${Spacing.lg}px;
  text-align: center;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
`

const TypeBadge = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 2px;
  margin-bottom: 3px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'system': return '#e8f5e9'
      case 'operation': return '#fff3e0'
      case 'notification': return '#e3f2fd'
      case 'security': return '#fce4ec'
      case 'error': return '#ffebee'
      default: return '#f5f5f5'
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'system': return '#2e7d32'
      case 'operation': return '#e65100'
      case 'notification': return '#1565c0'
      case 'security': return '#c62828'
      case 'error': return '#b71c1c'
      default: return '#666'
    }
  }};
`

// ── Helper ──

function timeAgo(dateStr: string, isZh: boolean): string {
  try {
    const now = Date.now()
    const date = new Date(dateStr).getTime()
    const diff = now - date
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return isZh ? '刚刚' : 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return isZh ? `${minutes}分钟前` : `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return isZh ? `${hours}小时前` : `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return isZh ? `${days}天前` : `${days}d ago`
    return new Date(dateStr).toLocaleDateString(isZh ? 'zh-CN' : 'en-US')
  } catch {
    return dateStr
  }
}

// ── Component ──

export default function NotificationBell() {
  const navigate = useNavigate()
  const { t, lang } = useTranslation()
  const isZh = lang === 'zh-CN'
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    try {
      const res = await adminAPI.getUnreadCount()
      const data = res as { unread_count: number }
      setUnreadCount(data.unread_count || 0)
    } catch {
      // ignore
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getNotifications({ page: 1, per_page: 20 })
      const data = res as { results?: Notification[]; items?: Notification[]; total: number }
      setNotifications(data.results || data.items || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  // Periodic polling for unread count（30s，比原 60s 更及时；客服新消息经 signal 写入后角标尽快亮起）
  useEffect(() => {
    const interval = setInterval(fetchUnread, CONFIG.NOTIF_FLOAT_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchUnread])

  // Toggle card
  const handleToggle = async () => {
    const next = !open
    setOpen(next)
    if (next) {
      await fetchNotifications()
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Mark one as read
  const handleDismiss = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    try {
      await adminAPI.markRead(id)
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // ignore
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await adminAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  // Navigate to detail
  const handleItemClick = (id: number) => {
    navigate(`/admin/notifications`)
    setOpen(false)
  }

  // Filter notifications by tab（客服通知 cs_* 归入「通知」tab）
  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter(n =>
        activeTab === 'notification'
          ? n.type === 'notification' || n.type.startsWith('cs_')
          : n.type === activeTab,
      )

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      system: isZh ? '系统' : 'System',
      operation: isZh ? '操作' : 'Operation',
      notification: isZh ? '通知' : 'Notification',
      security: isZh ? '安全' : 'Security',
      error: isZh ? '错误' : 'Error',
      cs_new_message: isZh ? '客服' : 'CS',
      cs_new_conversation: isZh ? '客服' : 'CS',
    }
    return labels[type] || type
  }

  return (
    <BellWrapper ref={wrapperRef}>
      <BellButton onClick={handleToggle} aria-label={isZh ? '通知' : 'Notifications'}>
        <Icon name="bell" size={18} />
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      </BellButton>

      {open && (
        <CardWrapper>
          <CardHeader>
            <CardTitle>{isZh ? '通知' : 'Notifications'}</CardTitle>
            {unreadCount > 0 && (
              <MarkAllLink onClick={handleMarkAllRead}>
                {isZh ? '全部标记已读' : 'Mark all as read'}
              </MarkAllLink>
            )}
          </CardHeader>

          <TabBar>
            {TABS.map(tab => (
              <TabButton
                key={tab.key}
                $active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {t(tab.labelKey)}
              </TabButton>
            ))}
          </TabBar>

          <NotificationList>
            {loading && notifications.length === 0 && (
              <EmptyState>{isZh ? '加载中...' : 'Loading...'}</EmptyState>
            )}
            {!loading && filteredNotifications.length === 0 && (
              <EmptyState>{isZh ? '暂无通知' : 'No notifications'}</EmptyState>
            )}
            {filteredNotifications.map(item => (
              <NotificationItem
                key={item.id}
                $unread={!item.is_read}
                onClick={() => handleItemClick(item.id)}
              >
                {!item.is_read && <UnreadDot />}
                <ItemContent>
                  <TypeBadge $type={item.type}>
                    {getTypeLabel(item.type)}
                  </TypeBadge>
                  <ItemTitle>{item.title}</ItemTitle>
                  <ItemBody>{item.content}</ItemBody>
                  <ItemTime>{timeAgo(item.created_at, isZh)}</ItemTime>
                </ItemContent>
                {!item.is_read && (
                  <DismissBtn onClick={(e) => handleDismiss(e, item.id)}>
                    ✕
                  </DismissBtn>
                )}
              </NotificationItem>
            ))}
          </NotificationList>

          <CardFooter>
            <ViewAllLink onClick={() => { navigate('/admin/notifications'); setOpen(false) }}>
              {isZh ? '查看全部通知 →' : 'View all →'}
            </ViewAllLink>
          </CardFooter>
        </CardWrapper>
      )}
    </BellWrapper>
  )
}
