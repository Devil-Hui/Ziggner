/**
 * AsyncState — 统一异步态（P0-2 组件收敛）
 * ───────────────────────────────────────────────────
 * 收敛 LoadingState / EmptyState / ErrorState / Skeleton 为一套：
 *   LoadingState — 骨架优先（不用 spinner）
 *   EmptyState   — 解释 + 下一步动作
 *   ErrorState   — 发生了什么 + 重试
 *   DataState    — 组合器：loading → error → empty → children 四态自动路由
 */
import type { ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { Semantic } from '@/theme'
import { Button } from './Button'
import { useTranslation } from '@/i18n'

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`

const SkeletonRow = styled.div`
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f3f4f6 25%, #eceef1 37%, #f3f4f6 63%);
  background-size: 800px 100%;
  animation: ${shimmer} 1.2s ease-in-out infinite;
  margin-bottom: 12px;
`

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
`

const Icon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: ${({ $color }) => `${$color}1a`};
  color: ${({ $color }) => $color};
`

const Title = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${Semantic.text.heading};
`

const Desc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${Semantic.text.secondary};
  line-height: 1.6;
`

export interface LoadingStateProps {
  /** 骨架行数 */
  rows?: number
}

export function LoadingState({ rows = 5 }: LoadingStateProps) {
  const { t } = useTranslation()
  return (
    <div aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

export interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon = '🗂',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { t } = useTranslation()
  return (
    <Box>
      <Icon $color={Semantic.text.muted}>{icon}</Icon>
      <Title>{title ?? t('common.noData')}</Title>
      {description && <Desc>{description}</Desc>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

export interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <Box>
      <Icon $color={Semantic.status.danger.fg}>!</Icon>
      <Title>{t('admin.asyncState.errorTitle')}</Title>
      <Desc>{message ?? t('admin.asyncState.errorMessage')}</Desc>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </Box>
  )
}

export interface DataStateProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  onRetry?: () => void
  children: ReactNode
}

/** 四态自动路由：loading → error → empty → children */
export function DataState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (empty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }
  return <>{children}</>
}
