// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../theme/tokens'
import { adminAPI } from '../../api/admin'
import DataTable, { type Column } from '../../components/admin/common/DataTable'
import PageHeader from '../../components/admin/common/PageHeader'
import FilterBar from '../../components/admin/common/FilterBar'
import { useTranslation } from '../../i18n'

// ── Styled Components ──

const PageContainer = styled.div`
  padding: 0;
`

const SearchInput = styled.input`
  height: 32px;
  width: 200px;
  padding: 0 ${Spacing.sm}px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: 2px;
  background: ${Color.bg.card};
  color: ${Color.primaryHover};

  &::placeholder {
    color: ${Color.border.dark};
  }

  &:focus {
    outline: none;
    border-color: #e74c3c;
  }
`

const JsonPreview = styled.pre`
  margin: 0;
  font-size: 11px;
  color: ${Color.text.secondary};
  max-width: 260px;
  max-height: 80px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: ${Color.primaryLight};
  padding: 4px 8px;
  border-radius: 2px;
  border: 1px solid ${Color.border.light};
`

const MonoText = styled.span`
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  background: ${Color.primaryLight};
  padding: 1px 6px;
  border-radius: 2px;
`

const DateTime = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  white-space: nowrap;
`

// ── Types ──

interface AuditLog {
  id: number
  user: string
  action: string
  resource_type: string
  resource_id: number
  changes: Record<string, unknown> | string
  ip_address: string
  created_at: string
}

// ── Component ──

export default function AdminAuditLogs() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [spuFilter, setSpuFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize }
      if (spuFilter) params.spu_name = spuFilter
      const res = (await adminAPI.getAuditLogs(params)) as { items: AuditLog[]; total: number }
      setLogs(res.items || [])
      setTotal(res.total || 0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('admin.auditLogs.loadFailed')
      setError(message)
    }
    setLoading(false)
  }, [page, spuFilter, t])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    setSpuFilter(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatChanges = (changes: Record<string, unknown> | string): string => {
    if (typeof changes === 'string') return changes
    try {
      return JSON.stringify(changes, null, 2)
    } catch {
      return String(changes)
    }
  }

  const formatDateTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const columns: Column<AuditLog>[] = [
    {
      key: 'user',
      title: t('admin.auditLogs.columnUser'),
      width: '100px',
      render: (val: unknown) => <MonoText>{String(val ?? '')}</MonoText>,
    },
    {
      key: 'action',
      title: t('admin.auditLogs.columnAction'),
      width: '120px',
    },
    {
      key: 'resource_type',
      title: t('admin.auditLogs.columnResourceType'),
      width: '100px',
      render: (val: unknown) => <MonoText>{String(val ?? '')}</MonoText>,
    },
    {
      key: 'resource_id',
      title: t('admin.auditLogs.columnResourceId'),
      width: '80px',
      render: (val: unknown) => <MonoText>{String(val ?? '')}</MonoText>,
    },
    {
      key: 'changes',
      title: t('admin.auditLogs.columnChanges'),
      width: '280px',
      render: (val: unknown) => {
        const text = formatChanges(val as Record<string, unknown> | string)
        return text ? <JsonPreview>{text}</JsonPreview> : <span style={{ color: '#ccc' }}>—</span>
      },
    },
    {
      key: 'ip_address',
      title: t('admin.auditLogs.columnIp'),
      width: '130px',
      render: (val: unknown) => <MonoText>{String(val ?? '')}</MonoText>,
    },
    {
      key: 'created_at',
      title: t('admin.auditLogs.columnTime'),
      width: '170px',
      render: (val: unknown) => <DateTime>{formatDateTime(String(val ?? ''))}</DateTime>,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.auditLogs.title')}
        breadcrumb={[{ label: t('admin.auditLogs.subtitle') }, { label: t('admin.auditLogs.title') }]}
      />

      <FilterBar>
        <SearchInput
          type="text"
          placeholder={t('admin.auditLogs.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <button
          onClick={handleSearch}
          style={{
            height: 32,
            padding: '0 14px',
            fontSize: 13,
            border: '1px solid #e74c3c',
            background: '#e74c3c',
            color: '#fff',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          {t('admin.auditLogs.search')}
        </button>
      </FilterBar>

      <DataTable<AuditLog>
        columns={columns}
        data={logs}
        loading={loading}
        error={error}
        onRetry={fetchLogs}
        emptyTitle={t('admin.auditLogs.noLogs')}
        emptyIcon="logs"
        rowKey="id"
      />
    </PageContainer>
  )
}