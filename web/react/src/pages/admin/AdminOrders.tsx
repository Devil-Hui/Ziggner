// TypeScript strict mode enabled
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, FontWeight, Transition, FluidSpace } from '../../theme/tokens'
import { Select, Input as SearchInput } from '../../components/admin/common/ui'
import ConfirmDialog from '../../components/admin/common/ConfirmDialog'
import PromptDialog from '../../components/admin/common/PromptDialog'
import Drawer from '../../components/admin/common/Drawer'
import Modal from '../../components/admin/common/Modal'
import { RefreshButton } from '../../components/admin/common'
import Tag from '../../components/admin/common/Tag'
import { useTranslation } from '../../i18n'
import { formatDateTime } from '../../utils/helpers'
import { orderAPI, type OrderSummary, type ChannelStatsItem } from '../../api/order'

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

/* ── 渠道色板（固定语义）：商城绿 / 代言人蓝 / 其他灰 ── */
const CHANNEL_COLOR: Record<string, string> = {
  mall: '#059669',
}
const CHANNEL_DEFAULT = '#6b7280'
function channelColor(channel?: string | null): string {
  if (!channel) return CHANNEL_COLOR.mall
  return CHANNEL_COLOR[channel] ?? '#1a56db'
}

/* ── 状态圆角标签色板 ── */
const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  pending_payment: { bg: '#fffbeb', color: '#b45309', label: '待支付' },
  paid: { bg: '#eff6ff', color: '#1e40af', label: '已支付' },
  shipped: { bg: '#eef2ff', color: '#4338ca', label: '已发货' },
  delivered: { bg: '#ecfdf5', color: '#047857', label: '已送达' },
  completed: { bg: '#f3f4f6', color: '#374151', label: '已完成' },
  cancelled: { bg: '#fef2f2', color: '#b91c1c', label: '已取消' },
  pending_review: { bg: '#fffbeb', color: '#b45309', label: '待审核' },
  approved: { bg: '#ecfdf5', color: '#047857', label: '已通过' },
  rejected: { bg: '#fef2f2', color: '#b91c1c', label: '已驳回' },
  processing: { bg: '#eff6ff', color: '#1e40af', label: '处理中' },
  refunding: { bg: '#fffbeb', color: '#b45309', label: '退款中' },
  refunded: { bg: '#f3f4f6', color: '#374151', label: '已退款' },
  unpaid: { bg: '#fffbeb', color: '#b45309', label: '未支付' },
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
`

const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' | 'ok' }>`
  padding: 6px 12px;
  border: 1px solid
    ${({ $variant }) => ($variant === 'danger' ? Color.status.error : $variant === 'primary' ? Color.primary : $variant === 'ok' ? Color.status.success : Color.border.medium)};
  background: ${({ $variant }) => ($variant === 'primary' ? Color.primary : $variant === 'ok' ? Color.status.success : '#fff')};
  color: ${({ $variant }) =>
    $variant === 'primary' || $variant === 'ok' ? '#fff' : $variant === 'danger' ? Color.status.error : Color.text.secondary};
  border-radius: ${Radius.sm}px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid rgba(26, 23, 18, 0.10);
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
`

const Th = styled.th`
  padding: 12px 18px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #8a8175;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(26, 23, 18, 0.10);
  background: rgba(26, 23, 18, 0.03);
  white-space: nowrap;
`

const Td = styled.td`
  padding: 22px 18px; /* 22*2 + 内容 ≈ 64px 行高（min-height 在 tr 上无效，用 td 撑起） */
  font-size: 0.875rem;
  color: #1a1712;
  border-bottom: 1px solid rgba(26, 23, 18, 0.10);
  vertical-align: middle;
`

const Tr = styled.tr`
  transition: background ${Transition.fast};

  &:hover { background: rgba(26, 86, 219, 0.04); }
  &:last-child td { border-bottom: none; }
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

const Actions = styled.div`
  display: flex;
  gap: 8px;
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

const PaginationBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
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

function statusPill(status: string) {
  return STATUS_PILL[status] ?? { bg: '#f3f4f6', color: '#374151', label: status }
}

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

export default function AdminOrders() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabKey>('orders')

  const [items, setItems] = useState<OrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [channel, setChannel] = useState('')
  const [channelStats, setChannelStats] = useState<ChannelStatsItem[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, any> | null>(null)
  /** 订单商品参数预览（点击商品名弹出，不跳转前台） */
  const [itemPreview, setItemPreview] = useState<Record<string, any> | null>(null)

  const [afterSales, setAfterSales] = useState<AfterSaleRow[]>([])
  const [asTotal, setAsTotal] = useState(0)
  const [asPage, setAsPage] = useState(1)
  const [asStatus, setAsStatus] = useState('')
  const [asType, setAsType] = useState('')
  const [asSearch, setAsSearch] = useState('')

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

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderAPI.adminList({
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        search: search || undefined,
        channel: channel || undefined,
        page,
        size: 20,
      })
      const { results, count } = normalizeList<OrderSummary>(data)
      setItems(results)
      setTotal(count)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [status, paymentStatus, search, channel, page, t])

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
        page: asPage,
        size: 20,
      })
      const { results, count } = normalizeList<AfterSaleRow>(data)
      setAfterSales(results)
      setAsTotal(count)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.aftersaleLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [asStatus, asType, asSearch, asPage, t])

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

  const totalPages = Math.max(1, Math.ceil(total / 20))
  const asTotalPages = Math.max(1, Math.ceil(asTotal / 20))

  // 状态时间线（取消/其他状态不渲染步骤）
  const stepIndex = selected ? ORDER_STEPS.indexOf(String(selected.status)) : -1

  return (
    <div>
      <PageHeader>
        <Title>{t('admin.orders.title')}</Title>
        <Button $variant="ghost" onClick={() => (tab === 'orders' ? loadOrders() : loadAfterSales())} disabled={loading}>
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
            <Select value={status} onChange={e => { setPage(1); setStatus(e.target.value) }}>
              <option value="">{t('admin.orders.allStatus')}</option>
              <option value="pending_payment">{t('admin.orders.statusPendingPayment')}</option>
              <option value="paid">{t('admin.orders.statusPaid')}</option>
              <option value="shipped">{t('admin.orders.statusShipped')}</option>
              <option value="delivered">{t('admin.orders.statusDelivered')}</option>
              <option value="completed">{t('admin.orders.statusCompleted')}</option>
              <option value="cancelled">{t('admin.orders.statusCancelled')}</option>
            </Select>
            <Select value={paymentStatus} onChange={e => { setPage(1); setPaymentStatus(e.target.value) }}>
              <option value="">{t('admin.orders.allPayment')}</option>
              <option value="unpaid">{t('admin.orders.paymentUnpaid')}</option>
              <option value="paid">{t('admin.orders.paymentPaid')}</option>
              <option value="refunding">{t('admin.orders.paymentRefunding')}</option>
              <option value="refunded">{t('admin.orders.paymentRefunded')}</option>
            </Select>
            <Select value={channel} onChange={e => { setPage(1); setChannel(e.target.value) }}>
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { setPage(1); loadOrders() }
              }}
            />
            <Button $variant="primary" onClick={() => { setPage(1); loadOrders() }}>{t('common.search')}</Button>
        <span style={{ flex: 1 }} />
        <RefreshButton onRefresh={loadOrders} />
          </FilterBar>

          {items.length === 0 && !loading ? (
            <Empty>{t('admin.orders.empty')}</Empty>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('admin.orders.colOrderNo')}</Th>
                    <Th>{t('admin.orders.colChannel')}</Th>
                    <Th>{t('admin.orders.colStatus')}</Th>
                    <Th>{t('admin.orders.colPayment')}</Th>
                    <Th style={{ textAlign: 'right' }}>{t('admin.orders.colAmount')}</Th>
                    <Th>{t('admin.orders.colItems')}</Th>
                    <Th>{t('admin.orders.colCreated')}</Th>
                    <Th>{t('common.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const pill = statusPill(item.status)
                    return (
                      <Tr key={item.order_no}>
                        <Td style={{ fontFamily: 'monospace' }}>{item.order_no}</Td>
                        <Td>
                          <ChannelDot $color={channelColor(item.channel_code)}>
                            {item.channel_name || t('admin.orders.channelMall')}
                          </ChannelDot>
                        </Td>
                        <Td><Tag tone={pill.bg === '#fef2f2' ? 'error' : pill.bg === '#ecfdf5' ? 'success' : pill.bg === '#fffbeb' ? 'warning' : pill.bg === '#eff6ff' ? 'info' : 'neutral'}>{pill.label}</Tag></Td>
                        <Td>
                          {(() => {
                            const payPill = statusPill(item.payment_status)
                            return (
                              <Tag tone={payPill.bg === '#fef2f2' ? 'error' : payPill.bg === '#ecfdf5' ? 'success' : payPill.bg === '#fffbeb' ? 'warning' : payPill.bg === '#eff6ff' ? 'info' : 'neutral'}>
                                {payPill.label}
                              </Tag>
                            )
                          })()}
                        </Td>
                        <Td style={{ textAlign: 'right' }}><Amount>{money(item.actual_amount)}</Amount></Td>
                        <Td>{item.item_count ?? '-'}</Td>
                        <Td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.created_at)}</Td>
                        <Td>
                          <Actions>
                            <Button onClick={() => openDetail(item.order_no)}>{t('admin.orders.detail')}</Button>
                            {item.status === 'paid' && (
                              <Button $variant="primary" disabled={busyNo === item.order_no} onClick={() => setTrackingTarget(item.order_no)}>
                                {t('admin.orders.ship')}
                              </Button>
                            )}
                            {(item.status === 'pending_payment' || item.status === 'paid') && (
                              <Button $variant="danger" disabled={busyNo === item.order_no} onClick={() => setCancelTarget(item.order_no)}>
                                {t('admin.orders.cancel')}
                              </Button>
                            )}
                          </Actions>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableScroll>
          )}

          <PaginationBar>
            <Button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('common.previous')}</Button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: '#666' }}>{page} / {totalPages}</span>
            <Button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
          </PaginationBar>
        </>
      )}

      {tab === 'aftersales' && (
        <>
          <FilterBar>
            <Select value={asStatus} onChange={e => { setAsPage(1); setAsStatus(e.target.value) }}>
              <option value="">{t('admin.orders.allStatus')}</option>
              <option value="pending_review">{t('admin.orders.asPendingReview')}</option>
              <option value="approved">{t('admin.orders.asApproved')}</option>
              <option value="rejected">{t('admin.orders.asRejected')}</option>
              <option value="processing">{t('admin.orders.asProcessing')}</option>
              <option value="completed">{t('admin.orders.asCompleted')}</option>
            </Select>
            <Select value={asType} onChange={e => { setAsPage(1); setAsType(e.target.value) }}>
              <option value="">{t('admin.orders.allTypes')}</option>
              <option value="return">{t('admin.orders.typeReturn')}</option>
              <option value="exchange">{t('admin.orders.typeExchange')}</option>
              <option value="reship">{t('admin.orders.typeReship')}</option>
            </Select>
            <SearchInput
              placeholder={t('admin.orders.aftersaleSearchPlaceholder')}
              value={asSearch}
              onChange={e => setAsSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setAsPage(1); loadAfterSales() } }}
            />
            <Button $variant="primary" onClick={() => { setAsPage(1); loadAfterSales() }}>{t('common.search')}</Button>
          </FilterBar>

          {afterSales.length === 0 && !loading ? (
            <Empty>{t('admin.orders.aftersaleEmpty')}</Empty>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('admin.orders.colAfterSaleNo')}</Th>
                    <Th>{t('admin.orders.colOrderNo')}</Th>
                    <Th>{t('admin.orders.colType')}</Th>
                    <Th>{t('admin.orders.colStatus')}</Th>
                    <Th style={{ textAlign: 'right' }}>{t('admin.orders.colAmount')}</Th>
                    <Th>{t('admin.orders.colReason')}</Th>
                    <Th>{t('common.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {afterSales.map(row => {
                    const pill = statusPill(row.status)
                    return (
                      <Tr key={row.after_sale_no}>
                        <Td style={{ fontFamily: 'monospace' }}>{row.after_sale_no}</Td>
                        <Td style={{ fontFamily: 'monospace' }}>{orderNoFromAfterSale(row)}</Td>
                        <Td>{row.type}</Td>
                        <Td><Tag tone={pill.bg === '#fef2f2' ? 'error' : pill.bg === '#ecfdf5' ? 'success' : pill.bg === '#fffbeb' ? 'warning' : 'neutral'}>{pill.label}</Tag></Td>
                        <Td style={{ textAlign: 'right' }}><Amount>{money(row.amount)}</Amount></Td>
                        <Td style={{ maxWidth: 240 }}>{row.reason}</Td>
                        <Td>
                          <Actions>
                            {row.status === 'pending_review' && (
                              <>
                                <Button $variant="ok" disabled={busyNo === row.after_sale_no} onClick={() => setRemarkTarget({ afterSaleNo: row.after_sale_no, action: 'approve' })}>
                                  {t('admin.orders.approve')}
                                </Button>
                                <Button $variant="danger" disabled={busyNo === row.after_sale_no} onClick={() => setRemarkTarget({ afterSaleNo: row.after_sale_no, action: 'reject' })}>
                                  {t('admin.orders.reject')}
                                </Button>
                              </>
                            )}
                            {row.status === 'approved' && (
                              <Button $variant="primary" disabled={busyNo === row.after_sale_no} onClick={() => setRefundTarget(row.after_sale_no)}>
                                {t('admin.orders.completeRefund')}
                              </Button>
                            )}
                          </Actions>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableScroll>
          )}

          <PaginationBar>
            <Button disabled={asPage <= 1} onClick={() => setAsPage(p => Math.max(1, p - 1))}>{t('common.previous')}</Button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: '#666' }}>{asPage} / {asTotalPages}</span>
            <Button disabled={asPage >= asTotalPages} onClick={() => setAsPage(p => p + 1)}>{t('common.next')}</Button>
          </PaginationBar>
        </>
      )}

      {/* 订单详情 Drawer（右侧滑入，不遮挡列表） */}
      <Drawer
        open={!!selected}
        title={selected ? `${t('admin.orders.detailTitle')} — ${String(selected.order_no || '')}` : ''}
        width="480px"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            {stepIndex >= 0 && (
              <Timeline>
                {ORDER_STEPS.map((s, i) => (
                  <Step key={s} $state={i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'}>
                    <span className="dot">{i < stepIndex ? '✓' : i + 1}</span>
                    {STATUS_PILL[s]?.label ?? s}
                    {i < ORDER_STEPS.length - 1 && <span className="line" />}
                  </Step>
                ))}
              </Timeline>
            )}

            <Grid>
              <Field><strong>{t('admin.orders.colStatus')}</strong>{statusPill(String(selected.status)).label}</Field>
              <Field><strong>{t('admin.orders.colPayment')}</strong>{String(selected.payment_status || '-')}</Field>
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
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.orders.itemName')}</Th>
                  <Th>SKU</Th>
                  <Th style={{ textAlign: 'right' }}>{t('admin.orders.itemPrice')}</Th>
                  <Th style={{ textAlign: 'right' }}>{t('admin.orders.itemQty')}</Th>
                  <Th style={{ textAlign: 'right' }}>{t('admin.orders.itemSubtotal')}</Th>
                </tr>
              </thead>
              <tbody>
                {(selected.items || []).map((it: any) => (
                  <Tr key={it.id || it.sku_code}>
                    <Td>
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
                    </Td>
                    <Td style={{ fontFamily: 'monospace' }}>{it.sku_code}</Td>
                    <Td><Amount>{money(it.price)}</Amount></Td>
                    <Td style={{ textAlign: 'right' }}>{it.quantity}</Td>
                    <Td><Amount>{money(it.subtotal)}</Amount></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {(selected.after_sales || []).length > 0 && (
              <>
                <SectionTitle>{t('admin.orders.afterSalesOnOrder')}</SectionTitle>
                <Table>
                  <thead>
                    <tr>
                      <Th>{t('admin.orders.colAfterSaleNo')}</Th>
                      <Th>{t('admin.orders.colType')}</Th>
                      <Th>{t('admin.orders.colStatus')}</Th>
                      <Th style={{ textAlign: 'right' }}>{t('admin.orders.colAmount')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.after_sales || []).map((as: any) => (
                      <Tr key={as.after_sale_no || as.id}>
                        <Td style={{ fontFamily: 'monospace' }}>{as.after_sale_no}</Td>
                        <Td>{as.type}</Td>
                        <Td>{statusPill(String(as.status)).label}</Td>
                        <Td><Amount>{money(as.amount)}</Amount></Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </>
        )}
      </Drawer>

      {/* 商品参数预览（点击订单商品名弹出，不跳转前台） */}
      <Modal
        open={!!itemPreview}
        title={t('admin.orders.itemPreviewTitle') || '商品参数'}
        onClose={() => setItemPreview(null)}
        footer={
          <button
            type="button"
            onClick={() => setItemPreview(null)}
            style={{ padding: '6px 18px', borderRadius: 4, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            {t('common.close') || '关闭'}
          </button>
        }
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
      </Modal>

      {cancelTarget !== null && (
        <ConfirmDialog
          title={t('admin.orders.title')}
          message={t('admin.orders.confirmCancel')}
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={() => { const no = cancelTarget; setCancelTarget(null); handleCancel(no) }}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      {refundTarget !== null && (
        <ConfirmDialog
          title={t('admin.orders.title')}
          message={t('admin.orders.confirmCompleteRefund')}
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          danger
          onConfirm={() => { const no = refundTarget; setRefundTarget(null); handleAfterSaleReview(no, 'complete_refund') }}
          onCancel={() => setRefundTarget(null)}
        />
      )}

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
