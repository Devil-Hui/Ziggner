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

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminDashboard() {
  const stats = useDashboardStats()
  const { adminUser } = useAdminAuth()
  const navigate = useNavigate()

  const today = useMemo(
    () => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    [],
  )

  const pendingItems = [
    { key: 'products', label: '待审核商品', count: stats.pendingProducts, to: '/admin/products?status=pending' },
    { key: 'applications', label: '待审核申请', count: stats.pendingApplications, to: '/admin/applications' },
    { key: 'aftersales', label: '待处理售后', count: stats.pendingAfterSales, to: '/admin/orders?tab=aftersale&status=pending' },
    { key: 'notifications', label: '未读通知', count: stats.unreadNotifications, to: '/admin/notifications' },
  ]
  const pendingTotal = pendingItems.reduce((s, i) => s + i.count, 0)

  const statsCards = [
    { label: '商品总数', value: stats.productCount },
    { label: '订单总数', value: stats.orderCount },
    { label: '进行中任务', value: stats.runningTasks },
    { label: '待办事项', value: pendingTotal, hot: pendingTotal > 0 },
  ]

  const quickActions = [
    { icon: '🛍️', label: '新建商品', to: '/admin/products/create' },
    { icon: '📦', label: '查看订单', to: '/admin/orders' },
    { icon: '🎟️', label: '创建优惠券', to: '/admin/coupons' },
    { icon: '💬', label: '客服工作台', to: '/admin/chat' },
    { icon: '🗑️', label: '回收站', to: '/admin/recycle-bin' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <PageHeader title="工作台" breadcrumb={[{ label: '控制台' }, { label: '工作台' }]} />

      <Greeting>
        {timeGreeting()}, {adminUser?.username ?? 'Admin'} 👋
      </Greeting>
      <Sub>
        {today} · 共 {pendingTotal} 项待办
        <Button variant="text" size="sm" onClick={() => void stats.refresh()} style={{ marginLeft: 8 }}>
          {stats.loading ? '刷新中…' : '刷新'}
        </Button>
      </Sub>

      {/* 待办事项（优先于统计） */}
      <SectionTitle>待办事项</SectionTitle>
      <PendingList>
        {pendingItems.map((item) => (
          <PendingItem key={item.key} onClick={() => navigate(item.to)}>
            <PendingLabel>{item.label}</PendingLabel>
            <PendingRight>
              <Badge $hot={item.count > 0}>{item.count}</Badge>
              查看 →
            </PendingRight>
          </PendingItem>
        ))}
      </PendingList>

      {/* 业务状态 */}
      <SectionTitle>业务状态</SectionTitle>
      <Grid>
        {statsCards.map((c) => (
          <Card key={c.label}>
            <CardLabel>{c.label}</CardLabel>
            <CardValue>{stats.loading && c.value === 0 ? '…' : c.value.toLocaleString()}</CardValue>
          </Card>
        ))}
      </Grid>

      {/* 快捷入口 */}
      <SectionTitle>快捷入口</SectionTitle>
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
