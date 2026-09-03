// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, Transition } from '../../theme/tokens'
import { PrimaryBtn, SecondaryBtn } from '../../components/admin/common/ui'
import PageHeader from '../../components/admin/common/PageHeader'
import { SmartDataTable, Pagination, Button, StatusBadge } from '../../components/admin/design-system'
import type { SmartColumn } from '../../components/admin/design-system'
import { adminAPI } from '../../api/admin'
import type { NotificationItem } from '../../api/admin'
import { useTranslation } from '../../i18n'
import { formatDateTime } from '../../utils/helpers'
import { useUrlState } from '../../hooks/useUrlState'

// ── Types ──

type TabKey = 'all' | 'unread' | 'expired' | 'system' | 'operation'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'admin.notifications.tabAll' },
  { key: 'unread', labelKey: 'admin.notifications.tabUnread' },
  { key: 'expired', labelKey: 'admin.notifications.tabExpired' },
  { key: 'system', labelKey: 'admin.notifications.tabSystem' },
  { key: 'operation', labelKey: 'admin.notifications.tabOperation' },
]

// ── Styled Components ──

const PageContainer = styled.div`
  padding: 0;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${Spacing.lg}px;
`

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled.button<{ $active: boolean }>`
  padding: 6px 16px;
  border: 1px solid ${({ $active }) => ($active ? Color.primary : Color.border.light)};
  background: ${({ $active }) => ($active ? '#eff6ff' : Color.bg.card)};
  color: ${({ $active }) => ($active ? Color.primary : Color.text.secondary)};
  font-size: ${FontSize.sm}px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  white-space: nowrap;
  transition: all ${Transition.fast};

  &:hover {
    border-color: ${Color.primary};
    color: ${({ $active }) => ($active ? Color.primary : Color.text.body)};
  }
`

const ActionsRow = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
`

const MonoText = styled.span`
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
`

const DateTime = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  white-space: nowrap;
`

// ── Helpers ──

// ── Component ──

export default function AdminNotifications() {
  const { t, lang } = useTranslation()

  // Tab state（URL 同步）
  const [activeTab, setActiveTab] = useUrlState<TabKey>('tab', 'all')

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [notifPage, setNotifPage] = useUrlState<string>('page', '1')
  const notifPageNum = Number(notifPage) || 1
  const [notifTotal, setNotifTotal] = useState(0)

  const pageSize = 20

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    setNotifError(null)
    try {
      const params: Record<string, unknown> = { page: notifPageNum, per_page: pageSize }
      if (activeTab === 'unread') {
        params.unread = '1'
      } else if (activeTab === 'expired') {
        params.expired = 'true'
      } else if (activeTab === 'system') {
        params.type = 'system'
      } else if (activeTab === 'operation') {
        params.type = 'operation'
      }
      const response = await adminAPI.getNotifications(params as { page?: number; per_page?: number })
      const data = response as { results?: NotificationItem[]; items?: NotificationItem[]; total: number }
      setNotifications(data.results || data.items || [])
      setNotifTotal(data.total || 0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('admin.notifications.loadFailed')
      setNotifError(message)
    }
    setNotifLoading(false)
  }, [notifPageNum, activeTab, lang])

  // ── Fetch based on active tab ──
  useEffect(() => {
    fetchNotifications()
  }, [activeTab, fetchNotifications])

  // Reset page when tab changes
  useEffect(() => {
    setNotifPage('1')
  }, [activeTab])

  // ── Mark single notification as read ──
  const handleMarkRead = async (id: number) => {
    try {
      await adminAPI.markRead(id)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n)),
      )
    } catch {
      // ignore
    }
  }

  // ── Mark all as read ──
  const handleMarkAllRead = async () => {
    try {
      await adminAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {
      // ignore
    }
  }

  // ── Pagination handler ──
  const handlePageChange = (page: number) => {
    setNotifPage(String(page))
  }

  // ── Columns for notifications ──
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      system: t('admin.notifications.tabSystem'),
      operation: t('admin.notifications.tabOperation'),
      notification: t('admin.notifications.tabNotification'),
      security: t('admin.notifications.tabSecurity'),
      error: t('admin.notifications.tabError'),
      cs_new_message: t('admin.notifications.typeCs'),
      cs_new_conversation: t('admin.notifications.typeCs'),
    }
    return labels[type] || type
  }

  const notifColumns: SmartColumn<NotificationItem>[] = [
    {
      key: 'id',
      title: 'ID',
      width: '60px',
      render: (val: unknown) => <MonoText>{String(val ?? '')}</MonoText>,
    },
    {
      key: 'type',
      title: t('admin.notifications.columnType'),
      width: '100px',
      render: (val: unknown) => {
        const tp = String(val ?? '')
        const tone = tp === 'system' ? 'success' : tp === 'operation' ? 'warning' : tp === 'error' ? 'danger' : tp === 'security' ? 'danger' : 'info'
        return <StatusBadge tone={tone as 'success' | 'warning' | 'danger' | 'info'}>{getTypeLabel(tp)}</StatusBadge>
      },
    },
    {
      key: 'title',
      title: t('admin.notifications.columnTitle'),
      width: '200px',
    },
    {
      key: 'content',
      title: t('admin.notifications.columnContent'),
      width: '300px',
    },
    {
      key: 'is_read',
      title: t('admin.notifications.columnStatus'),
      width: '80px',
      render: (val: unknown) =>
        val
          ? <StatusBadge tone="success">{t('admin.notifications.statusRead')}</StatusBadge>
          : <StatusBadge tone="neutral">{t('admin.notifications.statusUnread')}</StatusBadge>,
    },
    {
      key: 'created_at',
      title: t('admin.notifications.columnTime'),
      width: '170px',
      render: (val: unknown) => <DateTime>{formatDateTime(String(val ?? ''))}</DateTime>,
    },
    {
      key: 'actions',
      title: t('admin.notifications.columnActions'),
      width: '100px',
      render: (_val: unknown, record?: NotificationItem) => {
        if (!record || record.is_read) return <span style={{ color: '#ccc' }}>—</span>
        return (
          <Button size="sm" variant="ghost" onClick={() => handleMarkRead(record.id)}>
            {t('admin.notifications.markRead')}
          </Button>
        )
      },
    },
  ]

  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.notifications.title')}
        breadcrumb={[{ label: t('admin.notifications.subtitle') }, { label: t('admin.notifications.title') }]}
      />

      <Toolbar>
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

        <ActionsRow>
          <SecondaryBtn onClick={fetchNotifications}>
            {t('admin.notifications.refresh')}
          </SecondaryBtn>
          {hasUnread && (
            <PrimaryBtn onClick={handleMarkAllRead}>
              {t('admin.notifications.markAllRead')}
            </PrimaryBtn>
          )}
        </ActionsRow>
      </Toolbar>

      <SmartDataTable<NotificationItem>
        columns={notifColumns}
        data={notifications}
        loading={notifLoading}
        error={notifError}
        onRetry={fetchNotifications}
        emptyTitle={t('admin.notifications.emptyTitle')}
        rowKey="id"
        stickyHeader
      />
      <Pagination
        page={notifPageNum}
        pageCount={Math.max(1, Math.ceil(notifTotal / pageSize))}
        total={notifTotal}
        pageSize={pageSize}
        onChange={handlePageChange}
      />
    </PageContainer>
  )
}
