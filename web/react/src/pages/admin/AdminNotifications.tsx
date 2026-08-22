// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { PrimaryBtn, SecondaryBtn } from '../../components/admin/common/ui'
import PageHeader from '../../components/admin/common/PageHeader'
import DataTable from '../../components/admin/common/DataTable'
import Pagination from '../../components/admin/common/Pagination'
import type { Column } from '../../components/admin/common/DataTable'
import { adminAPI } from '../../api/admin'
import type { NotificationItem } from '../../api/admin'
import { useTranslation } from '../../i18n'
import { formatDateTime } from '../../utils/helpers'

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

const Badge = styled.span<{ $type: string }>`
  display: inline-block;
  padding: 2px 8px;
  font-size: ${FontSize.xs}px;
  border-radius: 2px;
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

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [notifPage, setNotifPage] = useState(1)
  const [notifTotal, setNotifTotal] = useState(0)

  const pageSize = 20

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    setNotifError(null)
    try {
      const params: Record<string, unknown> = { page: notifPage, per_page: pageSize }
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
  }, [notifPage, activeTab, lang])

  // ── Fetch based on active tab ──
  useEffect(() => {
    fetchNotifications()
  }, [activeTab, fetchNotifications])

  // Reset page when tab changes
  useEffect(() => {
    setNotifPage(1)
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
    setNotifPage(page)
  }

  // ── Active page for current tab ──
  const currentPage = notifPage
  const currentTotal = notifTotal

  // ── Columns for notifications ──
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      system: t('admin.notifications.tabSystem'),
      operation: t('admin.notifications.tabOperation'),
      notification: t('admin.notifications.tabNotification'),
      security: t('admin.notifications.tabSecurity'),
      error: t('admin.notifications.tabError'),
      cs_new_message: '客服',
      cs_new_conversation: '客服',
    }
    return labels[type] || type
  }

  const notifColumns: Column<NotificationItem>[] = [
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
      render: (val: unknown) => <Badge $type={String(val ?? '')}>{getTypeLabel(String(val ?? ''))}</Badge>,
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
      render: (val: unknown) => (
        val
          ? <span style={{ color: '#27ae60' }}>{t('admin.notifications.statusRead')}</span>
          : <span style={{ color: Color.status.error }}>{t('admin.notifications.statusUnread')}</span>
      ),
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
          <PrimaryBtn onClick={() => handleMarkRead(record.id)} style={{ padding: '4px 12px', fontSize: '12px' }}>
            {t('admin.notifications.markRead')}
          </PrimaryBtn>
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

      <DataTable<NotificationItem>
            columns={notifColumns}
            data={notifications}
            loading={notifLoading}
            error={notifError}
            onRetry={fetchNotifications}
            emptyTitle={t('admin.notifications.emptyTitle')}
            emptyIcon="notifications"
            rowKey="id"
          />
          <Pagination
            current={notifPage}
            total={notifTotal}
            pageSize={pageSize}
            onChange={(page) => setNotifPage(page)}
          />
    </PageContainer>
  )
}
