/**
 * AdminDashboard — 工作台（P2）
 * ───────────────────────────────────────────────────
 * 运营后台最有价值的首页不是炫酷图表，而是告诉管理员"现在最需要处理什么"。
 * 结构：问候语 → 待办事项（优先）→ 业务状态 → 快捷入口。
 * 待办数字来自 useDashboardStats（best-effort，失败显示 0 不阻塞）。
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import PageHeader from '../../components/admin/common/PageHeader'
import { Button } from '../../components/admin/design-system'
import { Semantic } from '@/theme'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation } from '../../i18n'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;
`

const Card = styled.div`
  background: ${Semantic.surface.card};
  border: 1px solid ${Semantic.border.light};
  border-radius: 12px;
  padding: 20px;
`

const CardLabel = styled.div`
  font-size: 13px;
  color: ${Semantic.text.secondary};
  margin-bottom: 8px;
`

const CardValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${Semantic.text.heading};
  line-height: 1.2;
`

const PendingList = styled.div`
  margin-top: 24px;
`

const PendingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid ${Semantic.border.light};
  border-radius: 8px;
  margin-bottom: 8px;
  background: ${Semantic.surface.card};
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${Semantic.interactive.default};
  }
`

const PendingLabel = styled.span`
  font-size: 14px;
  color: ${Semantic.text.body};
`

const PendingRight = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${Semantic.interactive.default};
  font-weight: 500;
`

const Badge = styled.span<{ $hot?: boolean }>`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  background: ${({ $hot }) => ($hot ? Semantic.status.danger.bg : Semantic.surface.sunken)};
  color: ${({ $hot }) => ($hot ? Semantic.status.danger.fg : Semantic.text.secondary)};
`

const SectionTitle = styled.h3`
  margin: 28px 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: ${Semantic.text.heading};
`

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 12px;
`

const QuickItem = styled.button`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid ${Semantic.border.light};
  border-radius: 10px;
  background: ${Semantic.surface.card};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${Semantic.interactive.default};
    background: ${Semantic.status.info.bg};
  }
`

const QuickIcon = styled.span`
  font-size: 20px;
`

const QuickLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${Semantic.text.heading};
`

const Greeting = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${Semantic.text.heading};
`

const Sub = styled.div`
  font-size: 13px;
  color: ${Semantic.text.secondary};
  margin-top: 4px;
`

function timeGreeting(t: (k: string) => string): string {
  const h = new Date().getHours()
  if (h < 6) return t('admin.dashboard.greeting.night')
  if (h < 12) return t('admin.dashboard.greeting.morning')
  if (h < 18) return t('admin.dashboard.greeting.afternoon')
  return t('admin.dashboard.greeting.evening')
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const stats = useDashboardStats()
  const { adminUser } = useAdminAuth()
  const navigate = useNavigate()

  const today = useMemo(
    () => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    [],
  )

  const pendingItems = [
    { key: 'products', label: t('admin.dashboard.pending.products'), count: stats.pendingProducts, to: '/admin/products?status=pending' },
    { key: 'applications', label: t('admin.dashboard.pending.applications'), count: stats.pendingApplications, to: '/admin/applications' },
    { key: 'aftersales', label: t('admin.dashboard.pending.aftersales'), count: stats.pendingAfterSales, to: '/admin/orders?tab=aftersale&status=pending' },
    { key: 'notifications', label: t('admin.dashboard.pending.notifications'), count: stats.unreadNotifications, to: '/admin/notifications' },
  ]
  const pendingTotal = pendingItems.reduce((s, i) => s + i.count, 0)

  const statsCards = [
    { label: t('admin.dashboard.stats.products'), value: stats.productCount },
    { label: t('admin.dashboard.stats.orders'), value: stats.orderCount },
    { label: t('admin.dashboard.stats.runningTasks'), value: stats.runningTasks },
    { label: t('admin.dashboard.stats.todos'), value: pendingTotal, hot: pendingTotal > 0 },
  ]

  const quickActions = [
    { icon: '🛍️', label: t('admin.layout.action.newProduct'), to: '/admin/products/create' },
    { icon: '📦', label: t('admin.layout.action.viewOrders'), to: '/admin/orders' },
    { icon: '🎟️', label: t('admin.layout.action.createCoupon'), to: '/admin/coupons' },
    { icon: '💬', label: t('admin.layout.action.chatWorkbench'), to: '/admin/chat' },
    { icon: '🗑️', label: t('admin.layout.action.recycleBin'), to: '/admin/recycle-bin' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <PageHeader title={t('admin.dashboard.title')} breadcrumb={[{ label: t('admin.dashboard.console') }, { label: t('admin.dashboard.title') }]} />

      <Greeting>
        {timeGreeting(t)}, {adminUser?.username ?? 'Admin'} 👋
      </Greeting>
      <Sub>
        {today} · {t('admin.dashboard.todoSummary', { count: String(pendingTotal) })}
        <Button variant="text" size="sm" onClick={() => void stats.refresh()} style={{ marginLeft: 8 }}>
          {stats.loading ? t('admin.dashboard.refreshing') : t('admin.dashboard.refresh')}
        </Button>
      </Sub>

      {/* 待办事项（优先于统计） */}
      <SectionTitle>{t('admin.dashboard.section.todos')}</SectionTitle>
      <PendingList>
        {pendingItems.map((item) => (
          <PendingItem key={item.key} onClick={() => navigate(item.to)}>
            <PendingLabel>{item.label}</PendingLabel>
            <PendingRight>
              <Badge $hot={item.count > 0}>{item.count}</Badge>
              {t('admin.dashboard.view')} →
            </PendingRight>
          </PendingItem>
        ))}
      </PendingList>

      {/* 业务状态 */}
      <SectionTitle>{t('admin.dashboard.section.stats')}</SectionTitle>
      <Grid>
        {statsCards.map((c) => (
          <Card key={c.label}>
            <CardLabel>{c.label}</CardLabel>
            <CardValue>{stats.loading && c.value === 0 ? '…' : c.value.toLocaleString()}</CardValue>
          </Card>
        ))}
      </Grid>

      {/* 快捷入口 */}
      <SectionTitle>{t('admin.dashboard.section.quickActions')}</SectionTitle>
      <QuickGrid>
        {quickActions.map((q) => (
          <QuickItem key={q.to} onClick={() => navigate(q.to)}>
            <QuickIcon>{q.icon}</QuickIcon>
            <QuickLabel>{q.label}</QuickLabel>
          </QuickItem>
        ))}
      </QuickGrid>
    </div>
  )
}
