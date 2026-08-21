import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, FontWeight, Transition } from '../../theme/tokens'
import { Select as StatusFilter } from '../../components/admin/common/ui'
import { PageHeader, SearchFilter, Pagination, Avatar, Skeleton, Empty } from '../../components/admin/common'
import { useTranslation } from '../../i18n'
import { adminChatAPI, type ConversationSummary, type PaginatedResult } from '../../api/chat'
import { CONFIG } from '../../config/constants'

// ── Styled ──

const PageWrap = styled.div``

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${Spacing.md}px;
  margin-bottom: ${Spacing.lg}px;
  flex-wrap: wrap;
`

/* 联系人列表：卡片行（头像 + 名称 + 消息预览 + 未读 + 时间） */
const ContactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ContactCard = styled.div<{ $unread: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid rgba(26, 23, 18, 0.08);
  border-radius: ${Radius.md}px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: ${Color.primary};
  }
`

const ContactMain = styled.div`
  flex: 1;
  min-width: 0;
`

const ContactNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .name {
    font-size: ${FontSize.base}px;
    font-weight: ${FontWeight.semibold};
    color: ${Color.text.heading};
  }

  .subject {
    font-size: ${FontSize.sm}px;
    color: ${Color.text.secondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const ContactPreview = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StatusDot = styled.span<{ $open: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $open }) => ($open ? '#d97706' : Color.border.dark)};
  flex-shrink: 0;
`

const UnreadPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: ${Color.status.error};
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  flex-shrink: 0;
`

const TimeCell = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  flex-shrink: 0;
  white-space: nowrap;
`

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

  // 轮询刷新：列表页无 WebSocket，靠轮询兜底让新会话 / 未读变化自动出现
  useEffect(() => {
    const timer = setInterval(() => { fetchData() }, CONFIG.ADMIN_CHAT_LIST_POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchData])

  const conversations = data?.results || []
  const total = data?.count || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <PageWrap>
      <PageHeader title={isZh ? '客服管理' : 'Support Management'} />

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

      {loading ? (
        <ContactList><Skeleton type="card" rows={5} /></ContactList>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48, color: Color.status.error }}>
          {error}
          <div style={{ marginTop: 8 }}>
            <button onClick={fetchData} style={{ padding: '6px 16px', border: `1px solid ${Color.border.medium}`, borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              {isZh ? '重试' : 'Retry'}
            </button>
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <Empty title={isZh ? '暂无客服对话' : 'No support conversations'} />
      ) : (
        <ContactList>
          {conversations.map(c => {
            const unread = (c.unread_count ?? 0) > 0
            const username = c.user?.username || '?'
            const subject = c.subject || (isZh ? '客服咨询' : 'Support')
            return (
              <ContactCard key={c.id} $unread={unread} onClick={() => navigate(`/admin/chat/${c.id}`)}>
                <Avatar name={username} size={40} />
                <ContactMain>
                  <ContactNameRow>
                    <StatusDot $open={c.status === 'open'} title={statusLabel(c.status, isZh)} />
                    <span className="name">{username}</span>
                    <span className="subject">{statusLabel(c.status, isZh)}</span>
                  </ContactNameRow>
                  <ContactPreview>{subject}</ContactPreview>
                </ContactMain>
                {unread && <UnreadPill>{c.unread_count}</UnreadPill>}
                <TimeCell>{formatTime(c.updated_at)}</TimeCell>
              </ContactCard>
            )
          })}
        </ContactList>
      )}

      {totalPages > 1 && (
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      )}
    </PageWrap>
  )
}
