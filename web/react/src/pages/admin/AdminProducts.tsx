// TypeScript strict mode enabled
import { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { Select, Input as SearchInput, SecondaryBtn } from '../../components/admin/common/ui'
import { adminAPI } from '../../api/admin'
import { useAdminAuth } from '../../store/AdminAuthContext'
import { useTranslation } from '../../i18n'
import ChatLink from '../../components/admin/ChatLink'
import ChatFloatWidget from '../../components/admin/common/ChatFloatWidget'
import ConfirmDialog from '../../components/admin/common/ConfirmDialog'

// ── Styled Components ──

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const Title = styled.h2`
  font-size: 1.25rem;
  color: ${Color.text.heading};
  font-weight: 600;
`

const Actions = styled.div`
  display: flex;
  gap: 8px;
`

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid rgba(26, 23, 18, 0.10);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 14px rgba(26, 23, 18, 0.06);
`

const Th = styled.th`
  padding: 14px 18px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #8a8175;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(26, 23, 18, 0.10);
  background: rgba(26, 23, 18, 0.03);
`

const Td = styled.td`
  padding: 14px 18px;
  font-size: 0.875rem;
  color: #1a1712;
  border-bottom: 1px solid rgba(26, 23, 18, 0.10);
`

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $status }) => {
    switch ($status) {
      case 'on_sale': return '#e8f5e9'
      case 'draft': return '#f5f5f5'
      case 'submitted': return '#fff3e0'
      case 'approved': return '#e3f2fd'
      case 'rejected': return '#ffebee'
      case 'suspended': return '#fce4ec'
      case 'off_sale': return '#f5f5f5'
      default: return '#f5f5f5'
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'on_sale': return '#2e7d32'
      case 'draft': return '#999'
      case 'submitted': return '#e65100'
      case 'approved': return '#1565c0'
      case 'rejected': return '#c62828'
      case 'suspended': return '#c2185b'
      case 'off_sale': return '#999'
      default: return '#999'
    }
  }};
`

const ActionBtn = styled.button<{ $danger?: boolean }>`
  padding: 4px 10px;
  border: 1px solid ${({ $danger }) => ($danger ? '#e74c3c' : '#ddd')};
  background: ${Color.bg.card};
  color: ${({ $danger }) => ($danger ? '#e74c3c' : '#333')};
  border-radius: ${Radius.sm}px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-right: 4px;
  transition: ${Transition.fast};

  &:hover {
    background: ${({ $danger }) => ($danger ? '#e74c3c' : '#f5f5f5')};
    color: ${({ $danger }) => ($danger ? '#fff' : '#333')};
  }
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
  border: 1px solid ${({ $active }) => ($active ? '#e74c3c' : '#ddd')};
  background: ${({ $active }) => ($active ? '#e74c3c' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#333')};
  border-radius: ${Radius.sm}px;
  font-size: 0.813rem;
  cursor: pointer;
`

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin: 0;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: ${Color.text.muted};
  font-size: 0.875rem;
`

const LoadingState = styled.div`
  text-align: center;
  padding: 48px;
  color: ${Color.text.muted};
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
  // 用 Set 存储选中项：membership 查询 O(1)（原数组 includes 为 O(n)），切换单选不再触发全表重算
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

  // 在 fetchProducts 之后声明，避免 useCallback 依赖数组的 TDZ
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

  // 行级回调保持稳定引用，配合 memo 行组件避免选中切换时全表重渲染
  const onEdit = useCallback((id: number) => navigate(`/admin/products/${id}`), [navigate])
  const onReview = useCallback((id: number) => navigate(`/admin/products/${id}/audit`), [navigate])
  const onChat = useCallback((id: number) => navigate(`/admin/chat?product_id=${id}`), [navigate])
  const onDelete = useCallback((id: number) => setDeleteTarget(id), [])
  const onSubmitAudit = useCallback((id: number) => {
    adminAPI.submitAudit(id).then(fetchProducts).catch(() => {})
  }, [fetchProducts])

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

  return (
    <div>
      <PageHeader>
        <Title>{t('admin.products.title')} ({total})</Title>
        <Actions>
          <SecondaryBtn onClick={() => navigate('/admin/products/create')}>{t('admin.products.createProduct')}</SecondaryBtn>
          <SecondaryBtn onClick={() => navigate('/admin/chat')}>{t('admin.layout.menu.chat')}</SecondaryBtn>
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

        {selected.size > 0 && (
          <Actions>
            <SecondaryBtn onClick={() => handleBatchAction('put_on_sale')}>{t('admin.products.batchOnSale')}</SecondaryBtn>
            <SecondaryBtn onClick={() => handleBatchAction('put_off_sale')}>{t('admin.products.batchOffSale')}</SecondaryBtn>
            <SecondaryBtn onClick={() => handleBatchAction('batch_audit')}>{t('admin.products.batchAudit')}</SecondaryBtn>
          </Actions>
        )}
      </FilterBar>

      {error && <div style={{ color: '#e74c3c', marginBottom: 12, fontSize: '0.875rem' }}>{error}</div>}
      {shelfError && <div style={{ color: '#e74c3c', marginBottom: 12, fontSize: '0.875rem' }}>{shelfError}</div>}

      {loading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : items.length === 0 ? (
        <EmptyState>{t('admin.products.emptyState')}<SecondaryBtn onClick={() => navigate('/admin/products/create')}>{t('admin.products.createOne')}</SecondaryBtn></EmptyState>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th style={{ width: 40 }}><Checkbox checked={selected.size === items.length && items.length > 0} onChange={toggleAll} /></Th>
                <Th>{t('admin.products.columnProduct')}</Th>
                <Th>{t('admin.products.columnPrice')}</Th>
                <Th>{t('admin.products.columnStatus')}</Th>
                <Th>{t('admin.products.columnCategory')}</Th>
                <Th>{t('admin.products.columnActions')}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ProductRow
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
            </tbody>
          </Table>

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

// ── 记忆化行组件：选中切换时仅重渲染变化的行，避免全表 reconcile ──
interface ProductRowProps {
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

const ProductRow = memo(function ProductRow({
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
}: ProductRowProps) {
  const { t } = useTranslation()
  return (
    <tr>
      <Td><Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} /></Td>
      <Td>
        <div style={{ fontWeight: 500 }}>{item.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#999' }}>{item.brand_name} · {item.sku_count} SKUs</div>
      </Td>
      <Td>{item.price_range ? `$${item.price_range.min} - $${item.price_range.max}` : '-'}</Td>
      <Td><StatusBadge $status={item.status}>{item.status_display}</StatusBadge></Td>
      <Td style={{ fontSize: '0.75rem', color: '#999' }}>{item.category_path}</Td>
      <Td>
        <ActionBtn onClick={() => onEdit(item.id)}>{t('common.edit')}</ActionBtn>
        {item.status === 'draft' && (
          <>
            <ActionBtn disabled={isShelfing} onClick={() => onShelf(item.id, 'put_on_sale')}>{t('admin.products.onSale')}</ActionBtn>
            {canSubmit && (
              <ActionBtn onClick={() => onSubmitAudit(item.id)}>{t('admin.products.submitReview')}</ActionBtn>
            )}
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
      </Td>
    </tr>
  )
})