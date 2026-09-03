import { useState, useEffect } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import EmptyState from '../../components/common/EmptyState'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, FontSize, Spacing, Breakpoint } from '../../theme/tokens'
import { publicAPI, type NotificationItem } from '../../api/public'

const Container = styled.div`
  min-height: calc(100vh - 320px);
  background-color: ${Color.bg.page};
  padding: ${Spacing.xxl}px 5vw 80px;
`

const Wrapper = styled.div`
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${Spacing.lg}px;
`

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${Spacing.md}px;
  flex-wrap: wrap;
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ModuleTitle = styled.h1`
  margin: 0;
  font-size: ${FontSize.xxl}px;
  font-weight: 700;
  color: ${Color.text.heading};
`

const ModuleSub = styled.p`
  margin: 0;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
`

const MarkAllBtn = styled.button`
  background: none;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 7px 16px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: ${Color.brand};
    border-color: ${Color.brand};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const NotificationCard = styled.div<{ $isRead: boolean }>`
  position: relative;
  background: ${p => p.$isRead ? Color.bg.card : Color.blueSoft};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: ${Spacing.lg}px ${Spacing.lg}px ${Spacing.lg}px ${p => p.$isRead ? Spacing.lg : 32}px;
  cursor: ${p => p.$isRead ? 'default' : 'pointer'};
  transition: background 0.2s, transform 0.15s;

  &:hover {
    transform: ${p => p.$isRead ? 'none' : 'translateY(-1px)'};
  }

  @media (max-width: ${Breakpoint.mobile}px) {
    padding: ${Spacing.md}px ${Spacing.md}px ${Spacing.md}px ${p => p.$isRead ? Spacing.md : 28}px;
  }
`

const UnreadDot = styled.span`
  position: absolute;
  left: 16px;
  top: 24px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${Color.brand};

  @media (max-width: ${Breakpoint.mobile}px) {
    left: 12px;
  }
`

const NotifTitle = styled.div`
  font-size: ${FontSize.md}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: 6px;
`

const NotifContent = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  line-height: 1.6;
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
`

const NotifFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${Spacing.sm}px;
`

const NotifTime = styled.div`
  font-size: 12px;
  color: ${Color.text.muted};
`

const UnreadTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${Color.brand};
`

const SkeletonCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: ${Spacing.lg}px;
`

const SkeletonLine = styled.div<{ $w?: string }>`
  height: 12px;
  margin-bottom: 10px;
  width: ${p => p.$w || '100%'};
  background: ${Color.bg.sunken};
  border-radius: 6px;
  animation: pulse 1.4s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const LoadMoreBtn = styled.button`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 12px 0;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${Color.text.heading};
    border-color: ${Color.text.heading};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
)

const PER_PAGE = 20

export default function Notifications() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchNotifications = async (p: number) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const response = await publicAPI.getNotifications({ page: p, per_page: PER_PAGE })
      const items = response.items || (response as { results?: NotificationItem[] }).results || []
      setNotifications(prev => (p === 1 ? items : [...prev, ...items]))
      setTotal(response.total ?? response.count ?? 0)
    } catch {
      // 静默失败，保留已有列表
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchNotifications(1) }, [])

  const handleMarkRead = async (id: number) => {
    // 乐观更新
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    try {
      await publicAPI.markRead(id)
    } catch {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n))
      alert(t('store.userNotifications.markFailed'))
    }
  }

  const handleMarkAllRead = async () => {
    const snapshot = notifications
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    try {
      await publicAPI.markAllRead()
    } catch {
      setNotifications(snapshot)
      alert(t('store.userNotifications.markFailed'))
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(nextPage)
  }

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ts
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <ModuleHeader>
            <HeaderText>
              <ModuleTitle>{t('store.userNotifications.title')}</ModuleTitle>
              <ModuleSub>
                {unreadCount > 0
                  ? `${t('store.userNotifications.unread')} · ${unreadCount}`
                  : t('store.userNotifications.subtitle')}
              </ModuleSub>
            </HeaderText>
            {notifications.length > 0 && unreadCount > 0 && (
              <MarkAllBtn onClick={handleMarkAllRead}>
                {t('store.userNotifications.markAllRead')}
              </MarkAllBtn>
            )}
          </ModuleHeader>

          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i}>
                  <SkeletonLine $w="40%" />
                  <SkeletonLine $w="90%" />
                  <SkeletonLine $w="60%" />
                </SkeletonCard>
              ))}
            </>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<BellIcon />}
              title={t('store.userNotifications.emptyTitle')}
              message={t('store.userNotifications.emptyDesc')}
            />
          ) : (
            notifications.map(n => (
              <NotificationCard
                key={n.id}
                $isRead={n.is_read}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                {!n.is_read && <UnreadDot />}
                <NotifTitle>{n.title}</NotifTitle>
                <NotifContent>{n.content}</NotifContent>
                <NotifFooter>
                  <NotifTime>{formatTime(n.created_at)}</NotifTime>
                  {!n.is_read && <UnreadTag>{t('store.userNotifications.unread')}</UnreadTag>}
                </NotifFooter>
              </NotificationCard>
            ))
          )}

          {!loading && notifications.length > 0 && notifications.length < total && (
            <LoadMoreBtn onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? t('store.userNotifications.loading') : t('store.userNotifications.loadMore')}
            </LoadMoreBtn>
          )}
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
