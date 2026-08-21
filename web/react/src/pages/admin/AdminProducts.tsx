// TypeScript strict mode enabled
import { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, FontWeight, Transition } from '../../theme/tokens'
import { Select, Input as SearchInput } from '../../components/admin/common/ui'
import { Skeleton, Empty, ErrorState } from '../../components/admin/common'
import { adminAPI } from '../../api/admin'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation } from '../../i18n'
import ChatLink from '../../components/admin/ChatLink'
import ChatFloatWidget from '../../components/admin/common/ChatFloatWidget'
import ConfirmDialog from '../../components/admin/common/ConfirmDialog'

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
    object-fit: cover;
    aspect-ratio: 1 / 1;
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

/* 状态徽章：圆角 12px、高 22px、字 12px */
const StatusPill = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: ${Radius.lg}px;
  font-size: 12px;
  font-weight: ${FontWeight.medium};
  background: ${({ $status }) => {
    switch ($status) {
      case 'on_sale': return '#ecfdf5'
      case 'submitted': return '#fffbeb'
      case 'approved': return '#eff6ff'
      case 'rejected': return '#fef2f2'
      case 'suspended': return '#fdf2f8'
      default: return '#f3f4f6'
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'on_sale': return '#047857'
      case 'submitted': return '#b45309'
      case 'approved': return '#1e40af'
      case 'rejected': return '#b91c1c'
      case 'suspended': return '#be185d'
      default: return '#4b5563'
    }
  }};
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

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
`

const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${({ $active }) => ($active ? Color.primary : Color.border.medium)};
  background: ${({ $active }) => ($active ? Color.primary : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : Color.text.secondary)};
  border-radius: ${Radius.sm}px;
  font-size: 0.813rem;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { border-color: ${Color.primary}; color: ${({ $active }) => ($active ? '#fff' : Color.primary)}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const ErrorLine = styled.div`
  color: ${Color.status.error};
  margin-bottom: 12px;
  font-size: 0.875rem;
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

export default function AdminProducts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { adminUser, isSuperAdmin, isGroupLeader, isGroupMember } = useAdminAuth()
  const canSubmit = isSuperAdmin || isGroupLeader || isGroupMember
  const canAudit = isSuperAdmin || isGroupLeader
  const [items, setItems] = useState<SPUItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [shelfingIds, setShelfingIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [shelfError, setShelfError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, unknown> = { page, page_size: 20 }
      if (status) params.status = status
      if (search) params.q = search
      const response = await adminAPI.getSPUs(params)
      setItems(response.items || [])
      setTotal(response.total || 0)
    } catch {
      setError(t('admin.products.loadFailed'))
    }
    setLoading(false)
  }, [page, status, search, t])

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

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === items.length && items.length > 0
        ? new Set()
        : new Set(items.map((i) => i.id)),
    )
  }, [items])

  const onEdit = useCallback((id: number) => navigate(`/admin/products/${id}`), [navigate])
  const onReview = useCallback((id: number) => navigate(`/admin/products/${id}/audit`), [navigate])
  const onChat = useCallback((id: number) => navigate(`/admin/chat?product_id=${id}`), [navigate])
  const onDelete = useCallback((id: number) => setDeleteTarget(id), [])
  const onSubmitAudit = useCallback((id: number) => {
    adminAPI.submitAudit(id).then(fetchProducts).catch(() => setError(t('admin.products.submitFailed')))
  }, [fetchProducts, t])

  const handleBatchAction = async (action: string) => {
    if (selected.size === 0) return
    try {
      await adminAPI.batchSPU({ spu_ids: Array.from(selected), action })
      setSelected(new Set())
      fetchProducts()
    } catch {
      setError(t('admin.products.batchFailed'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await adminAPI.deleteSPU(id)
      fetchProducts()
    } catch {
      setError(t('admin.products.deleteFailed'))
    }
  }

  const totalPages = Math.ceil(total / 20)
  const allChecked = items.length > 0 && selected.size === items.length

  return (
    <div>
      <PageHeader>
        <Title>{t('admin.products.title')} ({total})</Title>
        <Actions>
          <ActionBtn style={{ padding: '7px 16px', fontWeight: 500, background: Color.primary, borderColor: Color.primary, color: '#fff' }} onClick={() => navigate('/admin/products/create')}>
            {t('admin.products.createProduct')}
          </ActionBtn>
        </Actions>
      </PageHeader>

      <FilterBar>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
        />
        <Checkbox checked={allChecked} onChange={toggleAll} title="全选本页" />
        {selected.size > 0 && (
          <Actions>
            <ActionBtn onClick={() => handleBatchAction('put_on_sale')}>{t('admin.products.batchOnSale')} ({selected.size})</ActionBtn>
            <ActionBtn onClick={() => handleBatchAction('put_off_sale')}>{t('admin.products.batchOffSale')}</ActionBtn>
            <ActionBtn onClick={() => handleBatchAction('batch_audit')}>{t('admin.products.batchAudit')}</ActionBtn>
          </Actions>
        )}
      </FilterBar>

      {error && <ErrorLine>{error}</ErrorLine>}
      {shelfError && <ErrorLine>{shelfError}</ErrorLine>}

      {loading ? (
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
          <CardList>
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                isShelfing={shelfingIds.has(item.id)}
                canSubmit={canSubmit}
                canAudit={canAudit}
                isSuperAdmin={isSuperAdmin}
                onToggleSelect={toggleSelect}
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
            <Pagination>
              <PageBtn disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</PageBtn>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1
                return <PageBtn key={pageNum} $active={pageNum === page} onClick={() => setPage(pageNum)}>{pageNum}</PageBtn>
              })}
              <PageBtn disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</PageBtn>
            </Pagination>
          )}
        </>
      )}
      <ChatFloatWidget />
      {deleteTarget !== null && (
        <ConfirmDialog
          title={t('admin.products.deleteProduct')}
          message={t('admin.products.confirmDeleteProduct')}
          confirmLabel={t('admin.products.confirmDelete')}
          cancelLabel={t('common.cancel')}
          danger
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
  isSuperAdmin: boolean
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
  isSuperAdmin,
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
          <StatusPill $status={item.status}>{item.status_display}</StatusPill>
        </CardBadges>
      </CardMain>
      <CardRight>
        <CardPrice>{item.price_range ? `$${item.price_range.min} – $${item.price_range.max}` : '-'}</CardPrice>
        <Actions>
          <ActionBtn onClick={() => onEdit(item.id)}>{t('common.edit')}</ActionBtn>
          {item.status === 'draft' && (
            <>
              <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
              {canSubmit && <ActionBtn onClick={() => onSubmitAudit(item.id)}>{t('admin.products.submitReview')}</ActionBtn>}
            </>
          )}
          {item.status === 'submitted' && canAudit && (
            <ActionBtn onClick={() => onReview(item.id)}>{t('admin.products.review')}</ActionBtn>
          )}
          {item.status === 'approved' && (
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
          )}
          {item.status === 'on_sale' && (
            <>
              <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'suspend')}>{t('admin.products.suspend')}</ActionBtn>
              <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_off_sale')}>{t('admin.products.offSale')}</ActionBtn>
            </>
          )}
          {item.status === 'suspended' && (
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'resume')}>{t('admin.products.resume')}</ActionBtn>
          )}
          {item.status === 'off_sale' && (
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
          )}
          {isSuperAdmin && (
            <ActionBtn $danger onClick={() => onDelete(item.id)}>{t('common.delete')}</ActionBtn>
          )}
          <ChatLink onClick={() => onChat(item.id)} />
        </Actions>
      </CardRight>
    </Card>
  )
})
