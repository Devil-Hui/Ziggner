// TypeScript strict mode enabled
import { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, FontWeight, Transition } from '../../theme/tokens'
import { Select, Input as SearchInput } from '../../components/admin/common/ui'
import { Skeleton, Empty, RefreshButton } from '../../components/admin/common'
import { adminAPI } from '../../api/admin'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation } from '../../i18n'
import ChatLink from '../../components/admin/ChatLink'
import ChatFloatWidget from '../../components/admin/common/ChatFloatWidget'
import {
  SmartDataTable,
  StatusBadge,
  Button,
  Pagination,
  BulkActionBar,
  ConfirmDialog,
} from '../../components/admin/design-system'
import type { SmartColumn, BulkAction } from '../../components/admin/design-system'
import { productTone, type ProductStatus } from '../../theme/business'
import { useUrlState } from '../../hooks/useUrlState'
import { formatDateTime } from '../../utils/helpers'

/* ── 布局 ── */
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

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

/* 视图切换（卡片 / 列表） */
const ViewToggle = styled.div`
  display: inline-flex;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`

const ViewBtn = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border: none;
  background: ${({ $active }) => ($active ? Color.primary : Color.bg.card)};
  color: ${({ $active }) => ($active ? '#fff' : Color.text.secondary)};
  font-size: 0.813rem;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover:not([data-active]) {
    background: ${({ $active }) => ($active ? Color.primary : Color.primaryLight)};
    color: ${({ $active }) => ($active ? '#fff' : Color.primary)};
  }
`

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
`

/* ── 卡片行（商品列表：非表格） ── */
const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Card = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid ${({ $selected }) => ($selected ? Color.primary : 'rgba(26,23,18,0.08)')};
  border-radius: ${Radius.md}px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 767.98px) {
    gap: 10px;
    flex-wrap: wrap;
  }
`

/* 缩略图：100px，1:1 等比，hover 放大 1.05 + 阴影 */
const Thumb = styled.div`
  width: 100px;
  height: 100px;
  border-radius: ${Radius.md}px;
  background: #fff;
  border: 1px solid ${Color.border.light};
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  img {
    width: 100%;
    height: 100%;
    /* contain：忠实展示上传时的裁切比例（如 4:5），避免被 1:1 容器裁剪失真 */
    object-fit: contain;
    background: #f7f7f8;
  }

  .ph {
    color: ${Color.text.muted};
    font-size: 24px;
  }

  @media (max-width: 767.98px) {
    width: 72px;
    height: 72px;
  }
`

const CardMain = styled.div`
  flex: 1;
  min-width: 0;
`

const CardName = styled.div`
  font-size: 16px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardMeta = styled.div`
  font-size: 12px;
  color: ${Color.text.muted};
  margin-top: 4px;
`

const CardBadges = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
`

const CardRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;

  @media (max-width: 767.98px) {
    align-items: flex-start;
    width: 100%;
  }
`

const CardPrice = styled.div`
  font-size: 16px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.status.error};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const ActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid ${({ $danger }) => ($danger ? Color.status.error : Color.border.medium)};
  background: ${Color.bg.card};
  color: ${({ $danger }) => ($danger ? Color.status.error : Color.text.secondary)};
  border-radius: ${Radius.sm}px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover {
    background: ${({ $danger }) => ($danger ? Color.status.error : Color.primary)};
    color: #fff;
    border-color: ${({ $danger }) => ($danger ? Color.status.error : Color.primary)};
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin: 0;
  width: 16px;
  height: 16px;
  accent-color: ${Color.primary};
  cursor: pointer;
  flex-shrink: 0;
`

const ErrorLine = styled.div`
  color: ${Color.status.error};
  margin-bottom: 12px;
  font-size: 0.875rem;
`

/* 列表视图：商品名单元格（缩略图 + 名称） */
const ProductCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
`

const CellThumb = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid ${Color.border.light};
  overflow: hidden;
  background: #f7f7f8;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  img { width: 100%; height: 100%; object-fit: cover; }
  span { font-size: 16px; }
`

const CellName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${Color.text.heading};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RowActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

// ── Component ──

interface SPUItem {
  id: number
  name: string
  brand_name: string
  status: string
  status_display: string
  price_range: { min: string; max: string } | null
  category_path: string
  sku_count: number
  main_image?: string
  created_at: string
}

const PAGE_SIZE = 20
const fmtPrice = (v: string) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })

export default function AdminProducts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = useAdminAuth()
  const canSubmit = hasPermission('product.create')
  const canEdit = hasPermission('product.edit')
  const canAudit = hasPermission('product.audit')
  const canDelete = hasPermission('product.delete')
  const canPublish = hasPermission('product.publish')

  /* URL State：视图 / 筛选 / 搜索 / 分页（刷新不丢、可分享、Back 有效） */
  const [view, setView] = useUrlState<'card' | 'list'>('view', 'card')
  const [status, setStatus] = useUrlState<string>('status', '')
  const [search, setSearch] = useUrlState<string>('q', '')
  const [page, setPage] = useUrlState<string>('page', '1')
  const pageNum = Math.max(1, Number(page) || 1)

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  const [items, setItems] = useState<SPUItem[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<(string | number)[]>([])
  const [loading, setLoading] = useState(true)
  const [shelfingIds, setShelfingIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [shelfError, setShelfError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  // 上架中商品不允许直接删除：给出「请先下架」提示（统一删除规则）
  const [saleDeleteHint, setSaleDeleteHint] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, unknown> = { page: pageNum, page_size: PAGE_SIZE }
      if (status) params.status = status
      if (search) params.q = search
      const response = await adminAPI.getSPUs(params)
      setItems(response.items || [])
      setTotal(response.total || 0)
    } catch {
      setError(t('admin.products.loadFailed'))
    }
    setLoading(false)
  }, [pageNum, status, search, t])

  const doShelfAction = useCallback(async (id: number, action: string) => {
    setShelfingIds(prev => new Set(prev).add(id))
    setShelfError('')
    try {
      await adminAPI.shelfSPU(id, { action })
    } catch (e: any) {
      setShelfError(e?.message || t('admin.products.shelfFailed'))
    }
    await fetchProducts()
    setShelfingIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }, [fetchProducts, t])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const onEdit = useCallback((id: number) => navigate(`/admin/products/${id}`), [navigate])
  const onReview = useCallback((id: number) => navigate(`/admin/products/${id}/audit`), [navigate])
  const onChat = useCallback((id: number) => navigate(`/admin/chat?product_id=${id}`), [navigate])
  const onDelete = useCallback((id: number) => {
    // 统一删除规则：上架中（on_sale）商品必须先下架才能删除
    const item = items.find((it) => it.id === id)
    if (item && item.status === 'on_sale') {
      setSaleDeleteHint(true)
      return
    }
    setDeleteTarget(id)
  }, [items])
  const onSubmitAudit = useCallback((id: number) => {
    adminAPI.submitAudit(id).then(fetchProducts).catch(() => setError(t('admin.products.submitFailed')))
  }, [fetchProducts, t])

  /* 批量操作：BulkActionBar 风险分级确认后执行 */
  const handleBatchAction = useCallback(async (action: string) => {
    if (selected.length === 0) return
    try {
      await adminAPI.batchSPU({ spu_ids: selected.map(Number), action })
      setSelected([])
      fetchProducts()
    } catch {
      setError(t('admin.products.batchFailed'))
    }
  }, [selected, fetchProducts, t])

  const handleDelete = async (id: number) => {
    try {
      await adminAPI.deleteSPU(id)
      fetchProducts()
    } catch {
      setError(t('admin.products.deleteFailed'))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const bulkActions: BulkAction[] = [
    {
      key: 'put_on_sale',
      label: t('admin.products.batchOnSale'),
      variant: 'primary',
      onClick: () => handleBatchAction('put_on_sale'),
    },
    {
      key: 'put_off_sale',
      label: t('admin.products.batchOffSale'),
      variant: 'secondary',
      confirmTitle: t('admin.products.batchOffSaleConfirmTitle'),
      confirmMessage: t('admin.products.batchOffSaleConfirmMessage', { count: selected.length }),
      onClick: () => handleBatchAction('put_off_sale'),
    },
    {
      key: 'batch_audit',
      label: t('admin.products.batchAudit'),
      variant: 'secondary',
      confirmTitle: t('admin.products.batchAuditConfirmTitle'),
      confirmMessage: t('admin.products.batchAuditConfirmMessage', { count: selected.length }),
      onClick: () => handleBatchAction('batch_audit'),
    },
  ]

  /* 列表视图：行内操作按钮（阻止冒泡避免触发行点击） */
  const renderRowActions = (item: SPUItem) => (
    <RowActions onClick={(e) => e.stopPropagation()}>
      <ActionBtn onClick={() => onEdit(item.id)}>{t('common.edit')}</ActionBtn>
      {item.status === 'draft' && (
        <>
          {canPublish && <ActionBtn disabled={shelfingIds.has(item.id)} onClick={() => doShelfAction(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>}
          {canSubmit && <ActionBtn onClick={() => onSubmitAudit(item.id)}>{t('admin.products.submitReview')}</ActionBtn>}
        </>
      )}
      {item.status === 'submitted' && canAudit && (
        <ActionBtn onClick={() => onReview(item.id)}>{t('admin.products.review')}</ActionBtn>
      )}
      {item.status === 'approved' && canPublish && (
        <ActionBtn disabled={shelfingIds.has(item.id)} onClick={() => doShelfAction(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
      )}
      {item.status === 'on_sale' && canPublish && (
        <>
          <ActionBtn disabled={shelfingIds.has(item.id)} onClick={() => doShelfAction(item.id, 'suspend')}>{t('admin.products.suspend')}</ActionBtn>
          <ActionBtn disabled={shelfingIds.has(item.id)} onClick={() => doShelfAction(item.id, 'put_off_sale')}>{t('admin.products.offSale')}</ActionBtn>
        </>
      )}
      {item.status === 'suspended' && canPublish && (
        <ActionBtn disabled={shelfingIds.has(item.id)} onClick={() => doShelfAction(item.id, 'resume')}>{t('admin.products.resume')}</ActionBtn>
      )}
      {item.status === 'off_sale' && canPublish && (
        <ActionBtn disabled={shelfingIds.has(item.id)} onClick={() => doShelfAction(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
      )}
      {canDelete && (
        <ActionBtn $danger onClick={() => onDelete(item.id)}>{t('common.delete')}</ActionBtn>
      )}
      <ChatLink onClick={() => onChat(item.id)} />
    </RowActions>
  )

  /* 列表视图列定义 */
  const columns: SmartColumn<SPUItem>[] = [
    {
      key: 'name',
      title: t('admin.products.columnProduct'),
      sortable: true,
      render: (_: unknown, r: SPUItem) => (
        <ProductCell>
          <CellThumb>
            {r.main_image ? <img src={r.main_image} alt={r.name} loading="lazy" /> : <span>📦</span>}
          </CellThumb>
          <CellName>{r.name}</CellName>
        </ProductCell>
      ),
    },
    { key: 'brand_name', title: t('admin.products.columnBrand'), width: '140px' },
    { key: 'category_path', title: t('admin.products.columnCategory'), width: '160px' },
    { key: 'sku_count', title: t('admin.products.columnSku'), width: '80px', align: 'center' },
    {
      key: 'price_range',
      title: t('admin.products.columnPrice'),
      width: '180px',
      render: (val: unknown) => {
        const pr = val as SPUItem['price_range'] | null
        if (!pr) return '-'
        return `${fmtPrice(pr.min)} – ${fmtPrice(pr.max)}`
      },
    },
    {
      key: 'status',
      title: t('admin.products.columnStatus'),
      width: '120px',
      render: (_: unknown, r: SPUItem) => (
        <StatusBadge tone={productTone(r.status as ProductStatus)} dot>{r.status_display}</StatusBadge>
      ),
    },
    {
      key: 'created_at',
      title: t('admin.products.columnCreated'),
      sortable: true,
      width: '160px',
      render: (val: unknown) => formatDateTime(val as string),
    },
    { key: 'actions', title: t('admin.products.columnActions'), width: '300px', hideable: false, render: (_: unknown, r: SPUItem) => renderRowActions(r) },
  ]

  const rowSelection = {
    selectedRowKeys: selected,
    onChange: (keys: (string | number)[]) => setSelected(keys),
  }

  return (
    <div>
      <PageHeader>
        <Title>{t('admin.products.title')} · {total}</Title>
        <Actions>
          <ViewToggle>
            <ViewBtn $active={view === 'card'} data-active={view === 'card' ? 'true' : undefined} onClick={() => setView('card')}>
              {t('admin.products.viewCard')}
            </ViewBtn>
            <ViewBtn $active={view === 'list'} data-active={view === 'list' ? 'true' : undefined} onClick={() => setView('list')}>
              {t('admin.products.viewList')}
            </ViewBtn>
          </ViewToggle>
          <Button variant="primary" onClick={() => navigate('/admin/products/create')}>
            {t('admin.products.createProduct')}
          </Button>
        </Actions>
      </PageHeader>

      <FilterBar>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage('1') }}>
          <option value="">{t('admin.products.filterAllStatus')}</option>
          <option value="draft">{t('admin.products.statusDraft')}</option>
          <option value="submitted">{t('admin.products.statusSubmitted')}</option>
          <option value="approved">{t('admin.products.statusApproved')}</option>
          <option value="rejected">{t('admin.products.statusRejected')}</option>
          <option value="on_sale">{t('admin.products.statusOnSale')}</option>
          <option value="suspended">{t('admin.products.statusSuspended')}</option>
          <option value="off_sale">{t('admin.products.statusOffSale')}</option>
        </Select>
        <SearchInput
          placeholder={t('admin.products.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setPage('1') } }}
        />
        <span style={{ flex: 1 }} />
        <RefreshButton onRefresh={fetchProducts} />
      </FilterBar>

      {error && <ErrorLine>{error}</ErrorLine>}
      {shelfError && <ErrorLine>{shelfError}</ErrorLine>}

      {view === 'card' ? (
        loading ? (
          <CardList><Skeleton type="card" rows={5} /></CardList>
        ) : items.length === 0 ? (
          <Empty
            title={t('admin.products.emptyState')}
            children={
              <ActionBtn style={{ padding: '7px 16px', background: Color.primary, borderColor: Color.primary, color: '#fff' }} onClick={() => navigate('/admin/products/create')}>
                {t('admin.products.createOne')}
              </ActionBtn>
            }
          />
        ) : (
          <>
            <FilterBar style={{ marginBottom: 12 }}>
              <Checkbox
                checked={selected.length > 0 && selected.length === items.length}
                onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])}
                title="全选本页"
              />
              <BulkActionBar
                selectedCount={selected.length}
                actions={bulkActions}
                onClear={() => setSelected([])}
              />
            </FilterBar>
            <CardList>
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  isSelected={selected.includes(item.id)}
                  isShelfing={shelfingIds.has(item.id)}
                  canSubmit={canSubmit}
                  canAudit={canAudit}
                  canDelete={canDelete}
                  canPublish={canPublish}
                  onToggleSelect={(id) => {
                    setSelected((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }}
                  onEdit={onEdit}
                  onShelf={doShelfAction}
                  onSubmitAudit={onSubmitAudit}
                  onReview={onReview}
                  onDelete={onDelete}
                  onChat={onChat}
                />
              ))}
            </CardList>
            {totalPages > 1 && (
              <div style={{ marginTop: 20 }}>
                <Pagination page={pageNum} pageCount={totalPages} total={total} pageSize={PAGE_SIZE} onChange={(p) => setPage(String(p))} />
              </div>
            )}
          </>
        )
      ) : (
        <>
          <SmartDataTable
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={loading}
            error={error || null}
            onRetry={fetchProducts}
            emptyTitle={t('admin.products.emptyState')}
            emptyText={t('admin.products.createOne')}
            onRowClick={(r) => onEdit(r.id)}
            rowSelection={rowSelection}
            bulkBar={
              <BulkActionBar
                selectedCount={selected.length}
                actions={bulkActions}
                onClear={() => setSelected([])}
              />
            }
            stickyHeader
          />
          <div style={{ marginTop: 20 }}>
            <Pagination page={pageNum} pageCount={totalPages} total={total} pageSize={PAGE_SIZE} onChange={(p) => setPage(String(p))} />
          </div>
        </>
      )}
      <ChatFloatWidget />
      {saleDeleteHint && (
        <ConfirmDialog
          open={saleDeleteHint}
          title={t('admin.products.deleteProduct')}
          message={t('admin.products.cannotDeleteOnSale')}
          tone="info"
          confirmLabel={t('common.close')}
          cancelLabel=""
          onConfirm={() => setSaleDeleteHint(false)}
          onCancel={() => setSaleDeleteHint(false)}
        />
      )}
      {deleteTarget !== null && (
        <ConfirmDialog
          open={deleteTarget !== null}
          title={t('admin.products.deleteProduct')}
          message={`确定删除该商品？\n该商品当前有 ${items.find((i) => i.id === deleteTarget)?.sku_count ?? 0} 个 SKU，删除后商品将进入回收站。`}
          tone="danger"
          confirmLabel={t('admin.products.confirmDelete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            const id = deleteTarget
            setDeleteTarget(null)
            handleDelete(id)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── 记忆化卡片组件：选中切换时仅重渲染变化的卡片 ──
interface ProductCardProps {
  item: SPUItem
  isSelected: boolean
  isShelfing: boolean
  canSubmit: boolean
  canAudit: boolean
  canDelete: boolean
  canPublish: boolean
  onToggleSelect: (id: number) => void
  onEdit: (id: number) => void
  onShelf: (id: number, action: string) => void
  onSubmitAudit: (id: number) => void
  onReview: (id: number) => void
  onDelete: (id: number) => void
  onChat: (id: number) => void
}

const ProductCard = memo(function ProductCard({
  item,
  isSelected,
  isShelfing,
  canSubmit,
  canAudit,
  canDelete,
  canPublish,
  onToggleSelect,
  onEdit,
  onShelf,
  onSubmitAudit,
  onReview,
  onDelete,
  onChat,
}: ProductCardProps) {
  const { t } = useTranslation()
  return (
    <Card $selected={isSelected}>
      <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} />
      <Thumb>
        {item.main_image ? <img src={item.main_image} alt={item.name} loading="lazy" /> : <span className="ph">📦</span>}
      </Thumb>
      <CardMain>
        <CardName>{item.name}</CardName>
        <CardMeta>{item.brand_name} · {item.sku_count} SKUs · {item.category_path}</CardMeta>
        <CardBadges>
          <StatusBadge tone={productTone(item.status as ProductStatus)} dot>{item.status_display}</StatusBadge>
        </CardBadges>
      </CardMain>
      <CardRight>
        <CardPrice>{item.price_range ? `$${fmtPrice(item.price_range.min)} – $${fmtPrice(item.price_range.max)}` : '-'}</CardPrice>
        <Actions>
          <ActionBtn onClick={() => onEdit(item.id)}>{t('common.edit')}</ActionBtn>
          {item.status === 'draft' && (
            <>
              {canPublish && <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>}
              {canSubmit && <ActionBtn onClick={() => onSubmitAudit(item.id)}>{t('admin.products.submitReview')}</ActionBtn>}
            </>
          )}
          {item.status === 'submitted' && canAudit && (
            <ActionBtn onClick={() => onReview(item.id)}>{t('admin.products.review')}</ActionBtn>
          )}
          {item.status === 'approved' && canPublish && (
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
          )}
          {item.status === 'on_sale' && canPublish && (
            <>
              <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'suspend')}>{t('admin.products.suspend')}</ActionBtn>
              <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_off_sale')}>{t('admin.products.offSale')}</ActionBtn>
            </>
          )}
          {item.status === 'suspended' && canPublish && (
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'resume')}>{t('admin.products.resume')}</ActionBtn>
          )}
          {item.status === 'off_sale' && canPublish && (
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
          )}
          {canDelete && (
            <ActionBtn $danger onClick={() => onDelete(item.id)}>{t('common.delete')}</ActionBtn>
          )}
          <ChatLink onClick={() => onChat(item.id)} />
        </Actions>
      </CardRight>
    </Card>
  )
})
