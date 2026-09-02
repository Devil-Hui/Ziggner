// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, FontWeight } from '../../theme/tokens'
import { Select, Input as SearchInput } from '../../components/admin/common/ui'
import { adminAPI, type AuditLogItem } from '../../api/admin'
import PageHeader from '../../components/admin/common/PageHeader'
import { SmartDataTable, Button, Pagination, DetailDrawer } from '../../components/admin/design-system'
import type { SmartColumn } from '../../components/admin/design-system'
import { useTranslation } from '../../i18n'
import { formatDateTime } from '../../utils/helpers'
import { useUrlState } from '../../hooks/useUrlState'

const PAGE_SIZE = 20

/** 常用操作类型（审计 action 均为这些前缀/取值） */
const ACTIONS = [
  'create', 'update', 'delete', 'submit', 'approve', 'reject',
  'shelf_on', 'shelf_off', 'schedule', 'duplicate', 'export_products', 'batch_',
]
/** 常用资源类型 */
const RESOURCE_TYPES = ['spu', 'spu_batch', 'admin_group', 'admin_group_member', 'security', 'coupon']

type RangeKey = 'all' | '7' | '30' | '90'

/* ── Styled ── */
const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
`

const MonoText = styled.span`
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.75rem;
  color: ${Color.text.body};
  background: ${Color.primaryLight};
  padding: 1px 6px;
  border-radius: 2px;
  white-space: nowrap;
`

const JsonPreview = styled.pre`
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: ${Color.text.secondary};
  max-width: 360px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: ${Color.primaryLight};
  padding: 6px 10px;
  border-radius: ${Radius.sm}px;
  border: 1px solid ${Color.border.light};
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

const Empty = styled.div`
  padding: ${Spacing.xxl}px;
  text-align: center;
  color: ${Color.text.muted};
`

const DateTime = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  white-space: nowrap;
`

/* ── 时间范围 → 后端 date_from/date_to ── */
function rangeToDates(range: RangeKey): { date_from?: string; date_to?: string } {
  if (range === 'all') return {}
  const days = Number(range)
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const from = new Date()
  from.setDate(from.getDate() - days + 1)
  return { date_from: iso(from), date_to: `${iso(new Date())} 23:59:59` }
}

function formatChanges(changes: Record<string, unknown> | string | undefined): string {
  if (changes == null) return ''
  if (typeof changes === 'string') return changes
  try {
    return JSON.stringify(changes, null, 2)
  } catch {
    return String(changes)
  }
}

/* ── Component ── */
export default function AdminAuditLogs() {
  const { t } = useTranslation()

  /* URL State：分页 / 操作 / 资源 / 时间范围 / 关键词（刷新不丢、可分享、Back 有效） */
  const [page, setPage] = useUrlState<string>('page', '1')
  const pageNum = Math.max(1, Number(page) || 1)
  const [action, setAction] = useUrlState<string>('action', '')
  const [resourceType, setResourceType] = useUrlState<string>('resource_type', '')
  const [range, setRange] = useUrlState<RangeKey>('range', 'all')
  const [q, setQ] = useUrlState<string>('q', '')
  const [searchInput, setSearchInput] = useState(q)

  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AuditLogItem | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dates = rangeToDates(range)
      const res = await adminAPI.getAuditLogs({
        page: pageNum,
        page_size: PAGE_SIZE,
        action: action || undefined,
        resource_type: resourceType || undefined,
        q: q || undefined,
        date_from: dates.date_from,
        date_to: dates.date_to,
      })
      setLogs(res.items || [])
      setTotal(Number(res.total ?? 0))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('admin.auditLogs.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [pageNum, action, resourceType, range, q, t])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: SmartColumn<AuditLogItem>[] = [
    {
      key: 'user',
      title: t('admin.auditLogs.columnUser'),
      sortable: true,
      width: '120px',
      render: (v: unknown) => <MonoText>{String(v ?? '-')}</MonoText>,
    },
    {
      key: 'action',
      title: t('admin.auditLogs.columnAction'),
      sortable: true,
      width: '130px',
      render: (v: unknown) => <MonoText>{String(v ?? '')}</MonoText>,
    },
    {
      key: 'resource_type',
      title: t('admin.auditLogs.columnResourceType'),
      sortable: true,
      width: '120px',
      render: (v: unknown) => <MonoText>{String(v ?? '')}</MonoText>,
    },
    {
      key: 'resource_id',
      title: t('admin.auditLogs.columnResourceId'),
      width: '90px',
      render: (v: unknown) => <MonoText>{String(v ?? '-')}</MonoText>,
    },
    {
      key: 'changes',
      title: t('admin.auditLogs.columnChanges'),
      render: (v: unknown) => {
        const text = formatChanges(v as Record<string, unknown> | string | undefined)
        return text ? <JsonPreview>{text}</JsonPreview> : <span style={{ color: '#ccc' }}>{t('admin.auditLogs.noChanges')}</span>
      },
    },
    {
      key: 'ip_address',
      title: t('admin.auditLogs.columnIp'),
      width: '130px',
      render: (v: unknown) => (v ? <MonoText>{String(v)}</MonoText> : <span style={{ color: '#ccc' }}>-</span>),
    },
    {
      key: 'created_at',
      title: t('admin.auditLogs.columnTime'),
      sortable: true,
      width: '170px',
      render: (v: unknown) => <DateTime>{formatDateTime(String(v ?? ''))}</DateTime>,
    },
    {
      key: 'actions',
      title: t('common.actions'),
      width: '100px',
      hideable: false,
      render: (_: unknown, r: AuditLogItem) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
          {t('admin.auditLogs.openDetail')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('admin.auditLogs.title')}
        breadcrumb={[{ label: t('admin.auditLogs.subtitle') }, { label: t('admin.auditLogs.title') }]}
      />

      <FilterBar>
        <Select value={action} onChange={e => { setAction(e.target.value); setPage('1') }}>
          <option value="">{t('admin.auditLogs.allActions')}</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={resourceType} onChange={e => { setResourceType(e.target.value); setPage('1') }}>
          <option value="">{t('admin.auditLogs.allResourceTypes')}</option>
          {RESOURCE_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
        </Select>
        <Select value={range} onChange={e => { setRange(e.target.value as RangeKey); setPage('1') }}>
          <option value="all">{t('admin.auditLogs.allTime')}</option>
          <option value="7">{t('admin.auditLogs.last7Days')}</option>
          <option value="30">{t('admin.auditLogs.last30Days')}</option>
          <option value="90">{t('admin.auditLogs.last90Days')}</option>
        </Select>
        <SearchInput
          placeholder={t('admin.auditLogs.searchPlaceholder')}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setQ(searchInput.trim()); setPage('1') } }}
        />
        <Button variant="primary" size="sm" onClick={() => { setQ(searchInput.trim()); setPage('1') }}>
          {t('admin.auditLogs.search')}
        </Button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
          {loading ? t('common.loading') : t('admin.auditLogs.refresh')}
        </Button>
      </FilterBar>

      {logs.length === 0 && !loading && !error ? (
        <Empty>{t('admin.auditLogs.noLogs')}</Empty>
      ) : (
        <SmartDataTable<AuditLogItem>
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          error={error}
          onRetry={fetchLogs}
          onRowClick={(r) => setSelected(r)}
          emptyTitle={t('admin.auditLogs.noLogs')}
          stickyHeader
        />
      )}

      <div style={{ marginTop: 20 }}>
        <Pagination page={pageNum} pageCount={totalPages} total={total} pageSize={PAGE_SIZE} onChange={(p) => setPage(String(p))} />
      </div>

      {/* 操作详情 Drawer（操作信息 / 请求信息 / 变更前后 JSON） */}
      <DetailDrawer
        open={!!selected}
        size="lg"
        title={selected ? `${t('admin.auditLogs.detailTitle')} #${selected.id}` : ''}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <SectionTitle>{t('admin.auditLogs.operationInfo')}</SectionTitle>
            <Grid>
              <Field><strong>{t('admin.auditLogs.columnUser')}</strong>{selected.user ?? '-'}</Field>
              <Field><strong>{t('admin.auditLogs.userId')}</strong>{selected.user_id ?? '-'}</Field>
              <Field><strong>{t('admin.auditLogs.columnAction')}</strong><MonoText>{selected.action}</MonoText></Field>
              <Field><strong>{t('admin.auditLogs.columnResourceType')}</strong><MonoText>{selected.resource_type}</MonoText></Field>
              <Field><strong>{t('admin.auditLogs.columnResourceId')}</strong>{selected.resource_id ?? '-'}</Field>
              <Field><strong>{t('admin.auditLogs.columnTime')}</strong>{formatDateTime(selected.created_at)}</Field>
            </Grid>

            <SectionTitle>{t('admin.auditLogs.requestInfo')}</SectionTitle>
            <Grid>
              <Field><strong>{t('admin.auditLogs.columnIp')}</strong>{selected.ip_address ?? '-'}</Field>
            </Grid>

            <SectionTitle>{t('admin.auditLogs.changesTitle')}</SectionTitle>
            <JsonPreview>{formatChanges(selected.changes) || t('admin.auditLogs.noChanges')}</JsonPreview>

            {selected.extra_data && Object.keys(selected.extra_data).length > 0 && (
              <>
                <SectionTitle>{t('admin.auditLogs.extraDataTitle')}</SectionTitle>
                <JsonPreview>{formatChanges(selected.extra_data)}</JsonPreview>
              </>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  )
}
