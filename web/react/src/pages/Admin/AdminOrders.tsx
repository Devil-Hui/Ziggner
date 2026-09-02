// TypeScript strict mode enabled
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, FontWeight, Transition } from '../../theme/tokens'
import { Select, Input as SearchInput } from '../../components/admin/common/ui'
import PromptDialog from '../../components/admin/common/PromptDialog'
import { RefreshButton } from '../../components/admin/common'
import { useTranslation } from '../../i18n'
import { formatDateTime } from '../../utils/helpers'
import { orderAPI, type OrderSummary, type ChannelStatsItem } from '../../api/order'
import {
  SmartDataTable,
  StatusBadge,
  Button,
  Pagination,
  Dialog,
  DetailDrawer,
  ConfirmDialog,
} from '../../components/admin/design-system'
import type { SmartColumn } from '../../components/admin/design-system'
import { orderTone, type OrderStatus } from '../../theme/business'
import type { StatusTone } from '../../theme'
import { useUrlState } from '../../hooks/useUrlState'

type TabKey = 'orders' | 'aftersales'

interface AfterSaleRow {
  id: number
  after_sale_no: string
  type: string
  reason: string
  amount: string | number
  status: string
  admin_remark?: string
  created_at?: string
  order?: number | { order_no?: string }
  order_no?: string
}

/* ── 支付 / 售后状态 → semantic tone（业务只声明 tone，颜色由 Semantic 解析） ── */
const PAYMENT_TONE: Record<string, StatusTone> = {
  unpaid: 'warning',
  paid: 'success',
  refunding: 'warning',
  refunded: 'danger',
}
const AFTERSALE_TONE: Record<string, StatusTone> = {
  pending_review: 'warning',
  approved: 'info',
  rejected: 'danger',
  processing: 'info',
  completed: 'success',
}

/* ── 渠道色板（固定语义）：商城绿 / 代言人蓝 / 其他灰 ── */
const CHANNEL_COLOR: Record<string, string> = {
  mall: '#059669',
}
const CHANNEL_DEFAULT = '#6b7280'
function channelColor(channel?: string | null): string {
  if (!channel) return CHANNEL_COLOR.mall
  return CHANNEL_COLOR[channel] ?? '#1a56db'
}

/* ── 订单状态时间线 ── */
const ORDER_STEPS = ['pending_payment', 'paid', 'shipped', 'delivered', 'completed']

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
`

const Title = styled.h2`
  font-size: 1.25rem;
  color: ${Color.text.heading};
  font-weight: 600;
`

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`

const TabBtn = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  border: 1px solid ${({ $active }) => ($active ? Color.primary : Color.border.medium)};
  background: ${({ $active }) => ($active ? Color.primary : Color.bg.card)};
  color: ${({ $active }) => ($active ? '#fff' : Color.text.secondary)};
  border-radius: ${Radius.sm}px;
  font-size: 0.813rem;
  cursor: pointer;
  transition: all ${Transition.fast};
`

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
`

const MonoText = styled.span`
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.813rem;
  color: ${Color.text.body};
  white-space: nowrap;
`

const Amount = styled.span`
  display: inline-block;
  text-align: right;
  font-weight: ${FontWeight.semibold};
  font-variant-numeric: tabular-nums;
  color: ${Color.text.body};
`

const ChannelDot = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    flex-shrink: 0;
  }
`

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#ecfdf5' : '#fef2f2')};
  color: ${({ $type }) => ($type === 'success' ? '#047857' : '#b91c1c')};
  border: 1px solid ${({ $type }) => ($type === 'success' ? '#a7f3d0' : '#fecaca')};
`

const Empty = styled.div`
  padding: ${Spacing.xxl}px;
  text-align: center;
  color: ${Color.text.muted};
`

const RowActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`

const Field = styled.div`
  font-size: 0.813rem;
  color: #555;

  strong {
    display: block;
    color: #888;
    font-weight: 500;
    margin-bottom: 4px;
  }
`

const SectionTitle = styled.h4`
  margin: 16px 0 8px;
  font-size: 0.9rem;
  color: ${Color.text.heading};
`

const ItemNameLink = styled.a`
  color: ${Color.primary};
  cursor: pointer;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  /* 作为按钮（商品参数弹窗入口）时继承字体 */
  font: inherit;
  text-align: left;
`

/* ── 订单详情内嵌只读小表（商品明细 / 售后列表） ── */
const DetailTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid rgba(26, 23, 18, 0.10);
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  font-size: 12px;

  th, td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(26, 23, 18, 0.08);
  }
  th {
    font-weight: 600;
    color: #8a8175;
    background: rgba(26, 23, 18, 0.03);
    white-space: nowrap;
  }
  tr:last-child td { border-bottom: none; }
`

/* ── 状态时间线 ── */
const Timeline = styled.div`
  display: flex;
  align-items: center;
  margin: 8px 0 16px;
  flex-wrap: wrap;
`

const Step = styled.div<{ $state: 'done' | 'current' | 'todo' }>`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${({ $state }) => ($state === 'done' ? '#047857' : $state === 'current' ? Color.primary : Color.text.muted)};
  font-weight: ${({ $state }) => ($state === 'current' ? 600 : 400)};

  .dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    background: ${({ $state }) =>
      $state === 'done' ? Color.status.success : $state === 'current' ? Color.primary : Color.border.medium};
    color: #fff;
    margin-right: 6px;
  }

  .line {
    width: 24px;
    height: 2px;
    background: ${({ $state }) => ($state === 'done' ? Color.status.success : Color.border.light)};
    margin: 0 8px;
  }
`

function normalizeList<T>(data: unknown): { results: T[]; count: number } {
  if (Array.isArray(data)) return { results: data as T[], count: data.length }
  const obj = (data || {}) as Record<string, unknown>
  const results = (obj.results || obj.items || []) as T[]
  const count = Number(obj.count ?? obj.total ?? results.length)
  return { results, count }
}

function money(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'
}

function orderNoFromAfterSale(row: AfterSaleRow): string {
  if (row.order_no) return row.order_no
  if (row.order && typeof row.order === 'object') return row.order.order_no || '-'
  return '-'
}

const STEP_LABEL: Record<string, string> = {
  pending_payment: '待支付',
  paid: '已支付',
  shipped: '已发货',
  delivered: '已签收',
  completed: '已完成',
}

const PAGE_SIZE = 20

export default function AdminOrders() {
  const { t } = useTranslation()

  /* URL State：Tab / 订单筛选 / 售后筛选 / 分页（刷新不丢、可分享、Back 有效） */
  const [tab, setTab] = useUrlState<TabKey>('tab', 'orders')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [paymentStatus, setPaymentStatus] = useUrlState<string>('payment', '')
  const [channel, setChannel] = useUrlState<string>('channel', '')
  const [search, setSearch] = useUrlState<string>('q', '')
  const [page, setPage] = useUrlState<string>('page', '1')
  const pageNum = Math.max(1, Number(page) || 1)

  const [asStatus, setAsStatus] = useUrlState<string>('asStatus', '')
  const [asType, setAsType] = useUrlState<string>('asType', '')
  const [asSearch, setAsSearch] = useUrlState<string>('asQ', '')
  const [asPage, setAsPage] = useUrlState<string>('asPage', '1')
  const asPageNum = Math.max(1, Number(asPage) || 1)

  const [searchInput, setSearchInput] = useState(search)
  const [asSearchInput, setAsSearchInput] = useState(asSearch)

  const [items, setItems] = useState<OrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [channelStats, setChannelStats] = useState<ChannelStatsItem[]>([])
  const [selected, setSelected] = useState<Record<string, any> | null>(null)
  /** 订单商品参数预览（点击商品名弹出，不跳转前台） */
  const [itemPreview, setItemPreview] = useState<Record<string, any> | null>(null)

  const [afterSales, setAfterSales] = useState<AfterSaleRow[]>([])
  const [asTotal, setAsTotal] = useState(0)

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [busyNo, setBusyNo] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [refundTarget, setRefundTarget] = useState<string | null>(null)
  const [trackingTarget, setTrackingTarget] = useState<string | null>(null)
  const [remarkTarget, setRemarkTarget] = useState<{ afterSaleNo: string; action: 'approve' | 'reject' } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  /* 状态文案（i18n） */
  const orderStatusLabel = (s: string): string => {
    const m: Record<string, string> = {
      pending_payment: t('admin.orders.statusPendingPayment'),
      paid: t('admin.orders.statusPaid'),
      shipped: t('admin.orders.statusShipped'),
      delivered: t('admin.orders.statusDelivered'),
      completed: t('admin.orders.statusCompleted'),
      cancelled: t('admin.orders.statusCancelled'),
    }
    return m[s] ?? s
  }
  const paymentStatusLabel = (s: string): string => {
    const m: Record<string, string> = {
      unpaid: t('admin.orders.paymentUnpaid'),
      paid: t('admin.orders.paymentPaid'),
      refunding: t('admin.orders.paymentRefunding'),
      refunded: t('admin.orders.paymentRefunded'),
    }
    return m[s] ?? s
  }
  const asStatusLabel = (s: string): string => {
    const m: Record<string, string> = {
      pending_review: t('admin.orders.asPendingReview'),
      approved: t('admin.orders.asApproved'),
      rejected: t('admin.orders.asRejected'),
      processing: t('admin.orders.asProcessing'),
      completed: t('admin.orders.asCompleted'),
    }
    return m[s] ?? s
  }

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderAPI.adminList({
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        search: search || undefined,
        channel: channel || undefined,
        page: pageNum,
        size: PAGE_SIZE,
      })
      const { results, count } = normalizeList<OrderSummary>(data)
      setItems(results)
      setTotal(count)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [status, paymentStatus, search, channel, pageNum, t])

  const loadChannelStats = useCallback(async () => {
    try {
      const data = await orderAPI.adminChannelStats()
      setChannelStats(data?.items || [])
    } catch {
      // 统计加载失败不影响主列表
    }
  }, [])

  const loadAfterSales = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderAPI.adminAfterSaleList({
        status: asStatus || undefined,
        type: asType || undefined,
        search: asSearch || undefined,
        page: asPageNum,
        size: PAGE_SIZE,
      })
      const { results, count } = normalizeList<AfterSaleRow>(data)
      setAfterSales(results)
      setAsTotal(count)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.aftersaleLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [asStatus, asType, asSearch, asPageNum, t])

  useEffect(() => {
    if (tab === 'orders') {
      loadOrders()
      loadChannelStats()
    } else loadAfterSales()
  }, [tab, loadOrders, loadAfterSales, loadChannelStats])

  const openDetail = async (orderNo: string) => {
    try {
      const data = await orderAPI.adminDetail(orderNo)
      setSelected(data as Record<string, any>)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.detailFailed'))
    }
  }

  const handleShip = async (orderNo: string, tracking: string) => {
    if (!tracking.trim()) {
      showToast('error', t('admin.orders.trackingRequired'))
      return
    }
    setBusyNo(orderNo)
    try {
      await orderAPI.adminShip(orderNo, tracking.trim())
      showToast('success', t('admin.orders.shipSuccess'))
      await loadOrders()
      if (selected?.order_no === orderNo) await openDetail(orderNo)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.shipFailed'))
    } finally {
      setBusyNo(null)
    }
  }

  const handleCancel = async (orderNo: string) => {
    setBusyNo(orderNo)
    try {
      await orderAPI.adminCancel(orderNo, 'Cancelled by admin')
      showToast('success', t('admin.orders.cancelSuccess'))
      await loadOrders()
      if (selected?.order_no === orderNo) await openDetail(orderNo)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.cancelFailed'))
    } finally {
      setBusyNo(null)
    }
  }

  const handleAfterSaleReview = async (
    afterSaleNo: string,
    action: 'approve' | 'reject' | 'complete_refund',
    admin_remark = '',
  ) => {
    setBusyNo(afterSaleNo)
    try {
      await orderAPI.adminAfterSaleReview(afterSaleNo, { action, admin_remark })
      showToast('success', t('admin.orders.reviewSuccess'))
      await loadAfterSales()
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.reviewFailed'))
    } finally {
      setBusyNo(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const asTotalPages = Math.max(1, Math.ceil(asTotal / PAGE_SIZE))

  // 状态时间线（取消/其他状态不渲染步骤）
  const stepIndex = selected ? ORDER_STEPS.indexOf(String(selected.status)) : -1

  /* ── 订单列表列定义（排序为客户端排序：当前页内 asc/desc） ── */
  const orderColumns: SmartColumn<OrderSummary>[] = [
    {
      key: 'order_no',
      title: t('admin.orders.colOrderNo'),
      sortable: true,
      width: '180px',
      render: (v: unknown) => <MonoText>{String(v)}</MonoText>,
    },
    {
      key: 'channel_code',
      title: t('admin.orders.colChannel'),
      width: '120px',
      render: (_: unknown, r: OrderSummary) => (
        <ChannelDot $color={channelColor(r.channel_code)}>
          {r.channel_name || t('admin.orders.channelMall')}
        </ChannelDot>
      ),
    },
    {
      key: 'status',
      title: t('admin.orders.colStatus'),
      width: '110px',
      render: (_: unknown, r: OrderSummary) => (
        <StatusBadge tone={orderTone(r.status as OrderStatus)} dot>{orderStatusLabel(r.status)}</StatusBadge>
      ),
    },
    {
      key: 'payment_status',
      title: t('admin.orders.colPayment'),
      width: '110px',
      render: (_: unknown, r: OrderSummary) => (
        <StatusBadge tone={PAYMENT_TONE[r.payment_status] ?? 'neutral'}>{paymentStatusLabel(r.payment_status)}</StatusBadge>
      ),
    },
    {
      key: 'actual_amount',
      title: t('admin.orders.colAmount'),
      sortable: true,
      align: 'right',
      width: '120px',
      render: (v: unknown) => <Amount>{money(v)}</Amount>,
    },
    {
      key: 'item_count',
      title: t('admin.orders.colItems'),
      align: 'center',
      width: '80px',
      render: (v: unknown) => String(v ?? '-'),
    },
    {
      key: 'created_at',
      title: t('admin.orders.colCreated'),
      sortable: true,
      width: '160px',
      render: (v: unknown) => formatDateTime(v as string),
    },
    {
      key: 'actions',
      title: t('common.actions'),
      width: '260px',
      hideable: false,
      render: (_: unknown, r: OrderSummary) => (
        <RowActions onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => openDetail(r.order_no)}>{t('admin.orders.detail')}</Button>
          {r.status === 'paid' && (
            <Button size="sm" variant="primary" disabled={busyNo === r.order_no} onClick={() => setTrackingTarget(r.order_no)}>
              {t('admin.orders.ship')}
            </Button>
          )}
          {(r.status === 'pending_payment' || r.status === 'paid') && (
            <Button size="sm" variant="danger" disabled={busyNo === r.order_no} onClick={() => setCancelTarget(r.order_no)}>
              {t('admin.orders.cancel')}
            </Button>
          )}
        </RowActions>
      ),
    },
  ]

  /* ── 售后列表列定义 ── */
  const asColumns: SmartColumn<AfterSaleRow>[] = [
    {
      key: 'after_sale_no',
      title: t('admin.orders.colAfterSaleNo'),
      sortable: true,
      width: '160px',
      render: (v: unknown) => <MonoText>{String(v)}</MonoText>,
    },
    {
      key: 'order_no',
      title: t('admin.orders.colOrderNo'),
      width: '180px',
      render: (_: unknown, r: AfterSaleRow) => <MonoText>{orderNoFromAfterSale(r)}</MonoText>,
    },
    { key: 'type', title: t('admin.orders.colType'), width: '100px' },
    {
      key: 'status',
      title: t('admin.orders.colStatus'),
      width: '110px',
      render: (_: unknown, r: AfterSaleRow) => (
        <StatusBadge tone={AFTERSALE_TONE[r.status] ?? 'neutral'} dot>{asStatusLabel(r.status)}</StatusBadge>
      ),
    },
    {
      key: 'amount',
      title: t('admin.orders.colAmount'),
      align: 'right',
      width: '120px',
      render: (v: unknown) => <Amount>{money(v)}</Amount>,
    },
    {
      key: 'reason',
      title: t('admin.orders.colReason'),
      render: (v: unknown) => <div style={{ maxWidth: 240 }}>{String(v ?? '-')}</div>,
    },
    {
      key: 'actions',
      title: t('common.actions'),
      width: '220px',
      hideable: false,
      render: (_: unknown, r: AfterSaleRow) => (
        <RowActions onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending_review' && (
            <>
              <Button size="sm" variant="primary" disabled={busyNo === r.after_sale_no} onClick={() => setRemarkTarget({ afterSaleNo: r.after_sale_no, action: 'approve' })}>
                {t('admin.orders.approve')}
              </Button>
              <Button size="sm" variant="danger" disabled={busyNo === r.after_sale_no} onClick={() => setRemarkTarget({ afterSaleNo: r.after_sale_no, action: 'reject' })}>
                {t('admin.orders.reject')}
              </Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button size="sm" variant="primary" disabled={busyNo === r.after_sale_no} onClick={() => setRefundTarget(r.after_sale_no)}>
              {t('admin.orders.completeRefund')}
            </Button>
          )}
        </RowActions>
      ),
    },
  ]

  return (
    <div>
      <PageHeader>
        <Title>{t('admin.orders.title')}</Title>
        <Button variant="ghost" onClick={() => (tab === 'orders' ? loadOrders() : loadAfterSales())} disabled={loading}>
          {loading ? t('common.loading') : t('admin.orders.refresh')}
        </Button>
      </PageHeader>

      <Tabs>
        <TabBtn $active={tab === 'orders'} onClick={() => setTab('orders')}>{t('admin.orders.tabOrders')}</TabBtn>
        <TabBtn $active={tab === 'aftersales'} onClick={() => setTab('aftersales')}>{t('admin.orders.tabAfterSales')}</TabBtn>
      </Tabs>

      {toast && <Toast $type={toast.type}>{toast.message}</Toast>}

      {tab === 'orders' && (
        <>
          <FilterBar>
            <Select value={status} onChange={e => { setStatus(e.target.value); setPage('1') }}>
              <option value="">{t('admin.orders.allStatus')}</option>
              <option value="pending_payment">{t('admin.orders.statusPendingPayment')}</option>
              <option value="paid">{t('admin.orders.statusPaid')}</option>
              <option value="shipped">{t('admin.orders.statusShipped')}</option>
              <option value="delivered">{t('admin.orders.statusDelivered')}</option>
              <option value="completed">{t('admin.orders.statusCompleted')}</option>
              <option value="cancelled">{t('admin.orders.statusCancelled')}</option>
            </Select>
            <Select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value); setPage('1') }}>
              <option value="">{t('admin.orders.allPayment')}</option>
              <option value="unpaid">{t('admin.orders.paymentUnpaid')}</option>
              <option value="paid">{t('admin.orders.paymentPaid')}</option>
              <option value="refunding">{t('admin.orders.paymentRefunding')}</option>
              <option value="refunded">{t('admin.orders.paymentRefunded')}</option>
            </Select>
            <Select value={channel} onChange={e => { setChannel(e.target.value); setPage('1') }}>
              <option value="">
                {t('admin.orders.allChannel')} ({channelStats.reduce((s, c) => s + (c.order_count || 0), 0)})
              </option>
              <option value="mall">
                {t('admin.orders.channelMall')} ({channelStats.find(c => c.channel === 'mall')?.order_count ?? 0})
              </option>
              {channelStats.filter(c => c.channel !== 'mall').map(c => (
                <option key={c.channel} value={c.channel}>
                  {c.name} ({c.order_count})
                </option>
              ))}
            </Select>
            <SearchInput
              placeholder={t('admin.orders.searchPlaceholder')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { setSearch(searchInput.trim()); setPage('1') }
              }}
            />
            <Button variant="primary" onClick={() => { setSearch(searchInput.trim()); setPage('1') }}>{t('common.search')}</Button>
            <span style={{ flex: 1 }} />
            <RefreshButton onRefresh={loadOrders} />
          </FilterBar>

          {items.length === 0 && !loading ? (
            <Empty>{t('admin.orders.empty')}</Empty>
          ) : (
            <SmartDataTable
              columns={orderColumns}
              dataSource={items}
              rowKey="order_no"
              loading={loading}
              error={null}
              onRowClick={(r) => openDetail(r.order_no)}
              emptyTitle={t('admin.orders.empty')}
              stickyHeader
            />
          )}

          <div style={{ marginTop: 20 }}>
            <Pagination page={pageNum} pageCount={totalPages} total={total} pageSize={PAGE_SIZE} onChange={(p) => setPage(String(p))} />
          </div>
        </>
      )}

      {tab === 'aftersales' && (
        <>
          <FilterBar>
            <Select value={asStatus} onChange={e => { setAsStatus(e.target.value); setAsPage('1') }}>
              <option value="">{t('admin.orders.allStatus')}</option>
              <option value="pending_review">{t('admin.orders.asPendingReview')}</option>
              <option value="approved">{t('admin.orders.asApproved')}</option>
              <option value="rejected">{t('admin.orders.asRejected')}</option>
              <option value="processing">{t('admin.orders.asProcessing')}</option>
              <option value="completed">{t('admin.orders.asCompleted')}</option>
            </Select>
            <Select value={asType} onChange={e => { setAsType(e.target.value); setAsPage('1') }}>
              <option value="">{t('admin.orders.allTypes')}</option>
              <option value="return">{t('admin.orders.typeReturn')}</option>
              <option value="exchange">{t('admin.orders.typeExchange')}</option>
              <option value="reship">{t('admin.orders.typeReship')}</option>
            </Select>
            <SearchInput
              placeholder={t('admin.orders.aftersaleSearchPlaceholder')}
              value={asSearchInput}
              onChange={e => setAsSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setAsSearch(asSearchInput.trim()); setAsPage('1') } }}
            />
            <Button variant="primary" onClick={() => { setAsSearch(asSearchInput.trim()); setAsPage('1') }}>{t('common.search')}</Button>
          </FilterBar>

          {afterSales.length === 0 && !loading ? (
            <Empty>{t('admin.orders.aftersaleEmpty')}</Empty>
          ) : (
            <SmartDataTable
              columns={asColumns}
              dataSource={afterSales}
              rowKey="after_sale_no"
              loading={loading}
              error={null}
              emptyTitle={t('admin.orders.aftersaleEmpty')}
              stickyHeader
            />
          )}

          <div style={{ marginTop: 20 }}>
            <Pagination page={asPageNum} pageCount={asTotalPages} total={asTotal} pageSize={PAGE_SIZE} onChange={(p) => setAsPage(String(p))} />
          </div>
        </>
      )}

      {/* 订单详情 Drawer（右侧滑入，不遮挡列表） */}
      <DetailDrawer
        open={!!selected}
        size="lg"
        title={selected ? `${t('admin.orders.detailTitle')} — ${String(selected.order_no || '')}` : ''}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            {stepIndex >= 0 && (
              <Timeline>
                {ORDER_STEPS.map((s, i) => (
                  <Step key={s} $state={i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'}>
                    <span className="dot">{i < stepIndex ? '✓' : i + 1}</span>
                    {STEP_LABEL[s] ?? s}
                    {i < ORDER_STEPS.length - 1 && <span className="line" />}
                  </Step>
                ))}
              </Timeline>
            )}

            <Grid>
              <Field><strong>{t('admin.orders.colStatus')}</strong>{orderStatusLabel(String(selected.status))}</Field>
              <Field><strong>{t('admin.orders.colPayment')}</strong>{paymentStatusLabel(String(selected.payment_status || '-'))}</Field>
              <Field><strong>{t('admin.orders.colAmount')}</strong>{money(selected.actual_amount)}</Field>
              <Field><strong>{t('admin.orders.paymentMethod')}</strong>{String(selected.payment_method || '-')}</Field>
              <Field><strong>{t('admin.orders.shippingName')}</strong>{String(selected.shipping_name || '-')}</Field>
              <Field><strong>{t('admin.orders.shippingPhone')}</strong>{String(selected.shipping_phone || '-')}</Field>
              <Field><strong>{t('admin.orders.trackingNo')}</strong>{String(selected.tracking_no || '-')}</Field>
              <Field><strong>{t('admin.orders.username')}</strong>{String(selected.username || selected.user_id || '-')}</Field>
            </Grid>

            <Field>
              <strong>{t('admin.orders.shippingAddress')}</strong>
              <div>{typeof selected.shipping_address === 'object'
                ? JSON.stringify(selected.shipping_address)
                : String(selected.shipping_address || '-')}</div>
            </Field>

            <SectionTitle>{t('admin.orders.items')}</SectionTitle>
            <DetailTable>
              <thead>
                <tr>
                  <th>{t('admin.orders.itemName')}</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.orders.itemPrice')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.orders.itemQty')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.orders.itemSubtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {(selected.items || []).map((it: any) => (
                  <tr key={it.id || it.sku_code}>
                    <td>
                      {it.spu_id ? (
                        <ItemNameLink
                          as="button"
                          type="button"
                          onClick={() => setItemPreview(it)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                        >
                          {it.spu_name}
                        </ItemNameLink>
                      ) : (
                        it.spu_name
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{it.sku_code}</td>
                    <td style={{ textAlign: 'right' }}><Amount>{money(it.price)}</Amount></td>
                    <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right' }}><Amount>{money(it.subtotal)}</Amount></td>
                  </tr>
                ))}
              </tbody>
            </DetailTable>

            {(selected.after_sales || []).length > 0 && (
              <>
                <SectionTitle>{t('admin.orders.afterSalesOnOrder')}</SectionTitle>
                <DetailTable>
                  <thead>
                    <tr>
                      <th>{t('admin.orders.colAfterSaleNo')}</th>
                      <th>{t('admin.orders.colType')}</th>
                      <th>{t('admin.orders.colStatus')}</th>
                      <th style={{ textAlign: 'right' }}>{t('admin.orders.colAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.after_sales || []).map((as: any) => (
                      <tr key={as.after_sale_no || as.id}>
                        <td style={{ fontFamily: 'monospace' }}>{as.after_sale_no}</td>
                        <td>{as.type}</td>
                        <td>{asStatusLabel(String(as.status))}</td>
                        <td style={{ textAlign: 'right' }}><Amount>{money(as.amount)}</Amount></td>
                      </tr>
                    ))}
                  </tbody>
                </DetailTable>
              </>
            )}
          </>
        )}
      </DetailDrawer>

      {/* 商品参数预览（点击订单商品名弹出，不跳转前台） */}
      <Dialog
        open={!!itemPreview}
        title={t('admin.orders.itemPreviewTitle') || '商品参数'}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setItemPreview(null)}>{t('common.close') || '关闭'}</Button>
        }
        onClose={() => setItemPreview(null)}
      >
        {itemPreview && (
          <div style={{ display: 'flex', gap: 16 }}>
            {itemPreview.image ? (
              <img
                src={itemPreview.image}
                alt={itemPreview.spu_name}
                style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee', background: '#fafafa' }}
              />
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{itemPreview.spu_name}</div>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '96px 1fr', gap: '6px 12px', fontSize: 13 }}>
                {[
                  ['SKU', itemPreview.sku_code],
                  ['单价', money(itemPreview.price)],
                  ['数量', itemPreview.quantity],
                  ['小计', money(itemPreview.subtotal)],
                  ...(itemPreview.specs && Array.isArray(itemPreview.specs) && itemPreview.specs.length
                    ? itemPreview.specs.map((s: any) => [String(s.name || ''), Array.isArray(s.values) ? s.values.join(' / ') : ''])
                    : []),
                ].filter(([, v]) => v !== '' && v != null).map(([k, v]) => (
                  <div key={String(k)} style={{ display: 'contents' }}>
                    <dt style={{ color: '#888', margin: 0 }}>{k}</dt>
                    <dd style={{ margin: 0, color: '#222' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={cancelTarget !== null}
        title={t('admin.orders.title')}
        message={t('admin.orders.confirmCancel')}
        tone="warning"
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { const no = cancelTarget; setCancelTarget(null); if (no) handleCancel(no) }}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={refundTarget !== null}
        title={t('admin.orders.title')}
        message={t('admin.orders.confirmCompleteRefund')}
        tone="warning"
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { const no = refundTarget; setRefundTarget(null); if (no) handleAfterSaleReview(no, 'complete_refund') }}
        onCancel={() => setRefundTarget(null)}
      />

      {trackingTarget !== null && (
        <PromptDialog
          title={t('admin.orders.shipTitle')}
          message={t('admin.orders.trackingPrompt')}
          placeholder={t('admin.orders.trackingPrompt')}
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={(v) => { const no = trackingTarget; setTrackingTarget(null); handleShip(no, v) }}
          onCancel={() => setTrackingTarget(null)}
        />
      )}

      {remarkTarget !== null && (
        <PromptDialog
          title={t('admin.orders.reviewTitle')}
          message={t('admin.orders.reviewRemarkPrompt')}
          placeholder={t('admin.orders.reviewRemarkPrompt')}
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={(v) => { const tgt = remarkTarget; setRemarkTarget(null); handleAfterSaleReview(tgt.afterSaleNo, tgt.action, v) }}
          onCancel={() => setRemarkTarget(null)}
        />
      )}
    </div>
  )
}
