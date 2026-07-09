import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize } from '../../theme/tokens'
import { PageHeader, DataTable, StatusBadge, SearchFilter, Pagination } from '../../components/admin/common'
import type { Column } from '../../components/admin/common/DataTable'
import { useTranslation } from '../../i18n'
import { adminChatAPI, type ConversationSummary, type PaginatedResult } from '../../api/chat'

// ── Styled ──

const PageWrap = styled.div``

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.md}px;
  margin-bottom: ${Spacing.lg}px;
  flex-wrap: wrap;
`

const StatusFilter = styled.select`
  padding: 6px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  background: ${Color.bg.card};
  outline: none;
  cursor: pointer;

  &:focus { border-color: ${Color.primary}; }
`

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #e74c3c;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
`

const SubjectCell = styled.div`
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
`

const TimeCell = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

// ── Format time ──
  // ── Format time ──
function formatTime(ts: string): string {
  if (!ts) return '-'
  const date = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (msgDay.getTime() === today.getTime()) return `今天 ${time}`
  if (msgDay.getTime() === yesterday.getTime()) return `昨天 ${time}`
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

function statusBadgeType(status: string) {
  if (status === 'open') return 'submitted'
  return 'off_sale'
}

function statusLabel(status: string, isZh: boolean) {
  if (status === 'open') return isZh ? '待处理' : 'Open'
  if (status === 'closed') return isZh ? '已关闭' : 'Closed'
  return status
}

// ── Component ──

export default function AdminChatList() {
  const navigate = useNavigate()
  const { t, lang } = useTranslation()
  const isZh = lang === 'zh-CN'

  const [data, setData] = useState<PaginatedResult<ConversationSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const pageSize = 20

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, unknown> = { page, page_size: pageSize }
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const result = await adminChatAPI.getConversations(params)
      setData(result)
    } catch {
      setError(isZh ? '加载失败，请重试' : 'Failed to load, please retry')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search, isZh])

  useEffect(() => { fetchData() }, [fetchData])

  const conversations = data?.results || []
  const total = data?.count || 0
  const totalPages = Math.ceil(total / pageSize)

  const columns: Column<ConversationSummary>[] = [
    {
      key: 'id',
      title: isZh ? '会话ID' : 'ID',
      width: '80px',
      render: (val: unknown) => <span style={{ color: '#999', fontSize: '12px' }}>#{String(val)}</span>,
    },
    {
      key: 'username',
      title: isZh ? '用户名' : 'User',
      width: '120px',
      render: (_val: unknown, record: ConversationSummary) => record.user?.username || '-',
    },
    {
      key: 'subject',
      title: isZh ? '主题' : 'Subject',
      render: (val: unknown) => <SubjectCell>{String(val || (isZh ? '客服咨询' : 'Support'))}</SubjectCell>,
    },
    {
      key: 'status',
      title: isZh ? '状态' : 'Status',
      width: '100px',
      render: (_val: unknown, record: ConversationSummary) => (
        <StatusBadge
          status={statusBadgeType(record.status) as 'submitted' | 'approved' | 'off_sale'}
          label={statusLabel(record.status, isZh)}
        />
      ),
    },
    {
      key: 'unread_count',
      title: isZh ? '未读' : 'Unread',
      width: '70px',
      render: (val: unknown) =>
        (val as number) > 0 ? <UnreadBadge>{String(val)}</UnreadBadge> : <span style={{ color: '#ccc' }}>0</span>,
    },
    {
      key: 'updated_at',
      title: isZh ? '最后消息' : 'Last Message',
      width: '140px',
      render: (val: unknown) => <TimeCell>{formatTime(String(val))}</TimeCell>,
    },
  ]

  return (
    <PageWrap>
      <PageHeader
        title={isZh ? '客服管理' : 'Support Management'}
      />

      <Toolbar>
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder={isZh ? '搜索用户名或主题...' : 'Search username or subject...'}
        />
        <StatusFilter value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">{isZh ? '全部状态' : 'All Status'}</option>
          <option value="open">{isZh ? '待处理' : 'Open'}</option>
          <option value="closed">{isZh ? '已关闭' : 'Closed'}</option>
        </StatusFilter>
      </Toolbar>

      <DataTable
        columns={columns}
        dataSource={conversations}
        rowKey="id"
        loading={loading}
        error={error}
        onRetry={fetchData}
        emptyText={isZh ? '暂无客服对话' : 'No support conversations'}
        onRowClick={(record: ConversationSummary) => navigate(`/admin/chat/${record.id}`)}
      />

      {totalPages > 1 && (
        <Pagination
          current={page}
          total={total}
          pageSize={pageSize}
          onChange={setPage}
        />
      )}
    </PageWrap>
  )
}
