// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { adminAPI } from '../../api/admin'
import PageHeader from '../../components/admin/common/PageHeader'
import { SmartDataTable, ConfirmDialog } from '../../components/admin/design-system'
import type { SmartColumn } from '../../components/admin/design-system'
import { useTranslation } from '../../i18n'
import { formatDateTime } from '../../utils/helpers'

// ── Styled Components ──

const PageContainer = styled.div`
  padding: 0;
`

const ActionBtn = styled.button<{ $variant?: 'restore' | 'danger' }>`
  padding: 4px 12px;
  font-size: ${FontSize.xs}px;
  border: 1px solid ${({ $variant }) => ($variant === 'danger' ? Color.primary : '#27ae60')};
  background: ${Color.bg.card};
  color: ${({ $variant }) => ($variant === 'danger' ? Color.primary : '#27ae60')};
  border-radius: 2px;
  cursor: pointer;
  margin-right: 6px;
  transition: ${Transition.fast};

  &:hover {
    background: ${({ $variant }) => ($variant === 'danger' ? Color.primary : '#27ae60')};
    color: ${Color.text.inverse};
  }
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

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.inverse};
  background: ${({ $type }) => ($type === 'success' ? '#27ae60' : Color.primary)};
  z-index: 2000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

// ── Types ──

interface RecycleItem {
  id: number
  name: string
  brand_name: string
  category_path: string
  deleted_at: string
  sku_count: number
}

// ── Component ──

export default function AdminRecycleBin() {
  const { t } = useTranslation()
  const [items, setItems] = useState<RecycleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    danger: boolean
    onConfirm: () => void
  } | null>(null)

  // Double confirm state for permanent delete
  const [doubleConfirmId, setDoubleConfirmId] = useState<number | null>(null)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = (await adminAPI.getRecycleList()) as unknown as { items: RecycleItem[] } | RecycleItem[]
      const data = Array.isArray(res) ? res : (res as { items: RecycleItem[] }).items || []
      setItems(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('admin.recycleBin.loadFailed')
      setError(message)
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleRestore = (id: number, name: string) => {
    setConfirmDialog({
      title: t('admin.recycleBin.confirmRestore'),
      message: t('admin.recycleBin.confirmRestoreMsg').replace('{name}', name),
      confirmLabel: t('admin.recycleBin.restore'),
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await adminAPI.restoreSPU(id)
          showToast(t('admin.recycleBin.restoreSuccess').replace('{name}', name), 'success')
          fetchList()
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : t('admin.recycleBin.restoreFailed')
          showToast(message, 'error')
        }
      },
    })
  }

  const handlePermanentDelete = (id: number, name: string) => {
    // First confirmation
    if (doubleConfirmId !== id) {
      setDoubleConfirmId(id)
      setConfirmDialog({
        title: t('admin.recycleBin.permanentDelete'),
        message: t('admin.recycleBin.permanentDeleteMsg').replace('{name}', name),
        confirmLabel: t('admin.recycleBin.confirmContinue'),
        danger: true,
        onConfirm: () => {
          setConfirmDialog(null)
          // Second confirmation
          setConfirmDialog({
            title: t('admin.recycleBin.secondConfirm'),
            message: t('admin.recycleBin.secondConfirmMsg').replace('{name}', name),
            confirmLabel: t('admin.recycleBin.confirmPermanentDelete'),
            danger: true,
            onConfirm: async () => {
              setConfirmDialog(null)
              setDoubleConfirmId(null)
              try {
                await adminAPI.permanentDeleteSPU(id)
                showToast(t('admin.recycleBin.permanentDeleteSuccess').replace('{name}', name), 'success')
                fetchList()
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : t('admin.recycleBin.permanentDeleteFailed')
                showToast(message, 'error')
              }
            },
          })
        },
      })
    }
  }

  const columns: SmartColumn<RecycleItem>[] = [
    {
      key: 'id',
      title: 'ID',
      width: '60px',
      render: (val: unknown) => <MonoText>{String(val ?? '')}</MonoText>,
    },
    {
      key: 'name',
      title: t('admin.recycleBin.columnName'),
      width: '200px',
    },
    {
      key: 'brand_name',
      title: t('admin.recycleBin.columnBrand'),
      width: '100px',
      render: (val: unknown) => String(val ?? '—'),
    },
    {
      key: 'category_path',
      title: t('admin.recycleBin.columnCategory'),
      width: '150px',
      render: (val: unknown) => String(val ?? '—'),
    },
    {
      key: 'sku_count',
      title: t('admin.recycleBin.columnSkuCount'),
      width: '80px',
      render: (val: unknown) => <MonoText>{String(val ?? '0')}</MonoText>,
    },
    {
      key: 'deleted_at',
      title: t('admin.recycleBin.columnDeletedAt'),
      width: '160px',
      render: (val: unknown) => <DateTime>{formatDateTime(String(val ?? ''))}</DateTime>,
    },
    {
      key: 'actions',
      title: t('admin.recycleBin.columnActions'),
      width: '180px',
      render: (_val: unknown, record: RecycleItem) => (
        <>
          <ActionBtn $variant="restore" onClick={() => handleRestore(record.id, record.name)}>
            {t('admin.recycleBin.restoreBtn')}
          </ActionBtn>
          <ActionBtn
            $variant="danger"
            onClick={() => handlePermanentDelete(record.id, record.name)}
          >
            {t('admin.recycleBin.permanentDeleteBtn')}
          </ActionBtn>
        </>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.recycleBin.title')}
        breadcrumb={[{ label: t('admin.recycleBin.subtitle') }, { label: t('admin.recycleBin.title') }]}
      />

      <SmartDataTable<RecycleItem>
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle={t('admin.recycleBin.empty')}
        rowKey="id"
      />

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={t('admin.recycleBin.cancel')}
          tone={confirmDialog.danger ? 'danger' : 'info'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => {
            setConfirmDialog(null)
            setDoubleConfirmId(null)
          }}
        />
      )}

      {toast && <Toast $type={toast.type}>{toast.message}</Toast>}
    </PageContainer>
  )
}