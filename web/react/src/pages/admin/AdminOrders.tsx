// TypeScript strict mode enabled
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, Transition } from '../../theme/tokens'
import { useTranslation } from '../../i18n'
import { orderAPI, type OrderSummary } from '../../api/order'

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
  border: 1px solid ${({ $active }) => ($active ? '#e74c3c' : Color.border.medium)};
  background: ${({ $active }) => ($active ? '#e74c3c' : Color.bg.card)};
  color: ${({ $active }) => ($active ? '#fff' : Color.primaryHover)};
  border-radius: 6px;
  font-size: 0.813rem;
  cursor: pointer;
`

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  font-size: 0.813rem;
  background: ${Color.bg.card};
  color: ${Color.primaryHover};
`

const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  font-size: 0.813rem;
  background: ${Color.bg.card};
  color: ${Color.primaryHover};
  min-width: 220px;
`

const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' | 'ok' }>`
  padding: 6px 12px;
  border: 1px solid ${({ $variant }) => {
    if ($variant === 'danger') return '#e74c3c'
    if ($variant === 'primary') return '#e74c3c'
    if ($variant === 'ok') return '#2e7d32'
    return '#ddd'
  }};
  background: ${({ $variant }) => {
    if ($variant === 'primary') return '#e74c3c'
    if ($variant === 'ok') return '#2e7d32'
    return '#fff'
  }};
  color: ${({ $variant }) => {
    if ($variant === 'primary' || $variant === 'ok') return '#fff'
    if ($variant === 'danger') return '#e74c3c'
    return '#333'
  }};
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
`

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${Color.text.muted};
  text-transform: uppercase;
  border-bottom: 1px solid ${Color.border.light};
  background: ${Color.primaryLight};
`

const Td = styled.td`
  padding: 12px 16px;
  font-size: 0.875rem;
  color: ${Color.primaryHover};
  border-bottom: 1px solid ${Color.border.light};
  vertical-align: top;
`

const StatusBadge = styled.span<{ $tone: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: ${({ $tone }) => $tone};
  color: #333;
`

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: 2px;
  font-size: ${FontSize.sm}px;
  background: ${({ $type }) => ($type === 'success' ? '#e8f5e9' : '#fde8e8')};
  color: ${({ $type }) => ($type === 'success' ? '#2e7d32' : '#c62828')};
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

const DetailPanel = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
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

const STATUS_TONE: Record<string, string> = {
  pending_payment: '#fff3cd',
  paid: '#d1ecf1',
  shipped: '#cce5ff',
  delivered: '#d4edda',
  completed: '#e2e3e5',
  cancelled: '#f8d7da',
  pending_review: '#fff3cd',
  approved: '#d4edda',
  rejected: '#f8d7da',
  processing: '#cce5ff',
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
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '-'
}

function orderNoFromAfterSale(row: AfterSaleRow): string {
  if (row.order_no) return row.order_no
  if (row.order && typeof row.order === 'object') return row.order.order_no || '-'
  return '-'
}

export default function AdminOrders() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabKey>('orders')

  // orders state
  const [items, setItems] = useState<OrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, any> | null>(null)

  // aftersale state
  const [afterSales, setAfterSales] = useState<AfterSaleRow[]>([])
  const [asTotal, setAsTotal] = useState(0)
  const [asPage, setAsPage] = useState(1)
  const [asStatus, setAsStatus] = useState('')
  const [asType, setAsType] = useState('')
  const [asSearch, setAsSearch] = useState('')

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [busyNo, setBusyNo] = useState<string | null>(null)

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
  }, [status, paymentStatus, search, page, t])

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
    if (tab === 'orders') loadOrders()
    else loadAfterSales()
  }, [tab, loadOrders, loadAfterSales])

  const openDetail = async (orderNo: string) => {
    try {
      const data = await orderAPI.adminDetail(orderNo)
      setSelected(data as Record<string, any>)
    } catch (err: any) {
      showToast('error', err?.message || t('admin.orders.detailFailed'))
    }
  }

  const handleShip = async (orderNo: string) => {
    const tracking = window.prompt(t('admin.orders.trackingPrompt'), '')
    if (tracking == null) return
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
    if (!window.confirm(t('admin.orders.confirmCancel'))) return
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
  ) => {
    let admin_remark = ''
    if (action !== 'complete_refund') {
      const remark = window.prompt(t('admin.orders.reviewRemarkPrompt'), '')
      if (remark == null) return
      admin_remark = remark
    } else if (!window.confirm(t('admin.orders.confirmCompleteRefund'))) {
      return
    }
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

  return (
    <div>
      <PageHeader>
        <Title>{t('admin.orders.title')}</Title>
        <Button
          $variant="ghost"
          onClick={() => (tab === 'orders' ? loadOrders() : loadAfterSales())}
          disabled={loading}
        >
          {loading ? t('common.loading') : t('admin.orders.refresh')}
        </Button>
      </PageHeader>

      <Tabs>
        <TabBtn $active={tab === 'orders'} onClick={() => setTab('orders')}>
          {t('admin.orders.tabOrders')}
        </TabBtn>
        <TabBtn $active={tab === 'aftersales'} onClick={() => setTab('aftersales')}>
          {t('admin.orders.tabAfterSales')}
        </TabBtn>
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
            <SearchInput
              placeholder={t('admin.orders.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setPage(1)
                  loadOrders()
                }
              }}
            />
            <Button $variant="primary" onClick={() => { setPage(1); loadOrders() }}>
              {t('common.search')}
            </Button>
          </FilterBar>

          {items.length === 0 && !loading ? (
            <Empty>{t('admin.orders.empty')}</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.orders.colOrderNo')}</Th>
                  <Th>{t('admin.orders.colStatus')}</Th>
                  <Th>{t('admin.orders.colPayment')}</Th>
                  <Th>{t('admin.orders.colAmount')}</Th>
                  <Th>{t('admin.orders.colItems')}</Th>
                  <Th>{t('admin.orders.colCreated')}</Th>
                  <Th>{t('common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.order_no}>
                    <Td>{item.order_no}</Td>
                    <Td>
                      <StatusBadge $tone={STATUS_TONE[item.status] || '#eee'}>
                        {item.status}
                      </StatusBadge>
                    </Td>
                    <Td>{item.payment_status}</Td>
                    <Td>{money(item.actual_amount)}</Td>
                    <Td>{item.item_count ?? '-'}</Td>
                    <Td>{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</Td>
                    <Td>
                      <Actions>
                        <Button onClick={() => openDetail(item.order_no)}>{t('admin.orders.detail')}</Button>
                        {item.status === 'paid' && (
                          <Button
                            $variant="primary"
                            disabled={busyNo === item.order_no}
                            onClick={() => handleShip(item.order_no)}
                          >
                            {t('admin.orders.ship')}
                          </Button>
                        )}
                        {(item.status === 'pending_payment' || item.status === 'paid') && (
                          <Button
                            $variant="danger"
                            disabled={busyNo === item.order_no}
                            onClick={() => handleCancel(item.order_no)}
                          >
                            {t('admin.orders.cancel')}
                          </Button>
                        )}
                      </Actions>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <PaginationBar>
            <Button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              {t('common.previous')}
            </Button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: '#666' }}>
              {page} / {totalPages}
            </span>
            <Button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              {t('common.next')}
            </Button>
          </PaginationBar>

          {selected && (
            <DetailPanel>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <strong>{t('admin.orders.detailTitle')} — {String(selected.order_no || '')}</strong>
                <Button onClick={() => setSelected(null)}>{t('common.back')}</Button>
              </div>

              <Grid>
                <Field><strong>{t('admin.orders.colStatus')}</strong>{String(selected.status || '-')}</Field>
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
                    <Th>{t('admin.orders.itemPrice')}</Th>
                    <Th>{t('admin.orders.itemQty')}</Th>
                    <Th>{t('admin.orders.itemSubtotal')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((it: any) => (
                    <tr key={it.id || it.sku_code}>
                      <Td>{it.spu_name}</Td>
                      <Td>{it.sku_code}</Td>
                      <Td>{money(it.price)}</Td>
                      <Td>{it.quantity}</Td>
                      <Td>{money(it.subtotal)}</Td>
                    </tr>
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
                        <Th>{t('admin.orders.colAmount')}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.after_sales || []).map((as: any) => (
                        <tr key={as.after_sale_no || as.id}>
                          <Td>{as.after_sale_no}</Td>
                          <Td>{as.type}</Td>
                          <Td>
                            <StatusBadge $tone={STATUS_TONE[as.status] || '#eee'}>{as.status}</StatusBadge>
                          </Td>
                          <Td>{money(as.amount)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </DetailPanel>
          )}
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
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setAsPage(1)
                  loadAfterSales()
                }
              }}
            />
            <Button $variant="primary" onClick={() => { setAsPage(1); loadAfterSales() }}>
              {t('common.search')}
            </Button>
          </FilterBar>

          {afterSales.length === 0 && !loading ? (
            <Empty>{t('admin.orders.aftersaleEmpty')}</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.orders.colAfterSaleNo')}</Th>
                  <Th>{t('admin.orders.colOrderNo')}</Th>
                  <Th>{t('admin.orders.colType')}</Th>
                  <Th>{t('admin.orders.colStatus')}</Th>
                  <Th>{t('admin.orders.colAmount')}</Th>
                  <Th>{t('admin.orders.colReason')}</Th>
                  <Th>{t('common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {afterSales.map(row => (
                  <tr key={row.after_sale_no}>
                    <Td>{row.after_sale_no}</Td>
                    <Td>{orderNoFromAfterSale(row)}</Td>
                    <Td>{row.type}</Td>
                    <Td>
                      <StatusBadge $tone={STATUS_TONE[row.status] || '#eee'}>{row.status}</StatusBadge>
                    </Td>
                    <Td>{money(row.amount)}</Td>
                    <Td style={{ maxWidth: 240 }}>{row.reason}</Td>
                    <Td>
                      <Actions>
                        {row.status === 'pending_review' && (
                          <>
                            <Button
                              $variant="ok"
                              disabled={busyNo === row.after_sale_no}
                              onClick={() => handleAfterSaleReview(row.after_sale_no, 'approve')}
                            >
                              {t('admin.orders.approve')}
                            </Button>
                            <Button
                              $variant="danger"
                              disabled={busyNo === row.after_sale_no}
                              onClick={() => handleAfterSaleReview(row.after_sale_no, 'reject')}
                            >
                              {t('admin.orders.reject')}
                            </Button>
                          </>
                        )}
                        {row.status === 'approved' && (
                          <Button
                            $variant="primary"
                            disabled={busyNo === row.after_sale_no}
                            onClick={() => handleAfterSaleReview(row.after_sale_no, 'complete_refund')}
                          >
                            {t('admin.orders.completeRefund')}
                          </Button>
                        )}
                      </Actions>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <PaginationBar>
            <Button disabled={asPage <= 1} onClick={() => setAsPage(p => Math.max(1, p - 1))}>
              {t('common.previous')}
            </Button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: '#666' }}>
              {asPage} / {asTotalPages}
            </span>
            <Button disabled={asPage >= asTotalPages} onClick={() => setAsPage(p => p + 1)}>
              {t('common.next')}
            </Button>
          </PaginationBar>
        </>
      )}
    </div>
  )
}
