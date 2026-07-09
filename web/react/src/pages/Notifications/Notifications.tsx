import { useState, useEffect } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, FontSize, Layout, Spacing } from '../../theme/tokens'
import { publicAPI, type NotificationItem } from '../../api/public'

const Container = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background-color: ${Color.bg.page};
  padding: 5vh 5vw;
`

const Wrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`

const ModuleTitle = styled.div`
  font-size: ${FontSize.xl}px;
  font-weight: 700;
  color: ${Color.text.primary};
`

const MarkAllBtn = styled.button`
  background: none;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 6px 16px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  cursor: pointer;
  &:hover { color: ${Color.text.primary}; border-color: ${Color.text.primary}; }
`

const NotificationCard = styled.div<{ $isRead: boolean }>`
  background: ${p => p.$isRead ? Color.bg.card : '#f0f5ff'};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: 20px;
  cursor: ${p => p.$isRead ? 'default' : 'pointer'};
  transition: background 0.2s;
  &:hover { background: ${p => p.$isRead ? Color.bg.card : '#e6eeff'}; }
`

const NotifTitle = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.primary};
  margin-bottom: 6px;
`

const NotifContent = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  line-height: 1.5;
  margin-bottom: 8px;
`

const NotifTime = styled.div`
  font-size: 12px;
  color: ${Color.text.muted};
`

const UnreadDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  margin-right: 8px;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${Color.text.muted};
  font-size: ${FontSize.md}px;
`

const LoadMoreBtn = styled.button`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 10px 0;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  cursor: pointer;
  &:hover { color: ${Color.text.primary}; }
`

export default function Notifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const PER_PAGE = 20

  const fetchNotifications = async (p: number) => {
    setLoading(true)
    try {
      const response = await publicAPI.getNotifications({ page: p, per_page: PER_PAGE })
      const items = response.items || (response as any).results || []
      if (p === 1) {
        setNotifications(items)
      } else {
        setNotifications(prev => [...prev, ...items])
      }
      setTotal(response.total || 0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications(1) }, [])

  const handleMarkRead = async (id: number) => {
    try {
      await publicAPI.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* fail silently */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await publicAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch { /* fail silently */ }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(nextPage)
  }

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString()
    } catch { return ts }
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <ModuleHeader>
            <ModuleTitle>Notifications</ModuleTitle>
            <MarkAllBtn onClick={handleMarkAllRead}>
              Mark All Read
            </MarkAllBtn>
          </ModuleHeader>

          {!loading && notifications.length === 0 && (
            <EmptyState>No notifications yet</EmptyState>
          )}

          {notifications.map(n => (
            <NotificationCard key={n.id} $isRead={n.is_read} onClick={() => !n.is_read && handleMarkRead(n.id)}>
              <NotifTitle>
                {!n.is_read && <UnreadDot />}
                {n.title}
              </NotifTitle>
              <NotifContent>{n.content}</NotifContent>
              <NotifTime>{formatTime(n.created_at)}</NotifTime>
            </NotificationCard>
          ))}

          {notifications.length < total && (
            <LoadMoreBtn onClick={handleLoadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </LoadMoreBtn>
          )}
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
