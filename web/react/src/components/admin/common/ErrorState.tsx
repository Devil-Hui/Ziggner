/**
 * ErrorState（请求/渲染错误态，含重试）
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, Radius, Spacing, Transition } from '../../../theme/tokens'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.section}px;
  text-align: center;
`

const Icon = styled.div`
  font-size: 32px;
  margin-bottom: ${Spacing.sm}px;
`

const Title = styled.div`
  font-size: ${FontSize.base}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: ${Spacing.xs}px;
`

const Message = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
  margin-bottom: ${Spacing.md}px;
  max-width: 420px;
`

const Retry = styled.button`
  padding: 6px 16px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: ${Color.text.secondary};
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }
`

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryText?: string
  children?: ReactNode
  className?: string
}

export default function ErrorState({
  title = '加载失败',
  message,
  onRetry,
  retryText = '重试',
  children,
  className,
}: ErrorStateProps) {
  return (
    <Wrap className={className}>
      <Icon>⚠️</Icon>
      <Title>{title}</Title>
      {message && <Message>{message}</Message>}
      {onRetry && <Retry onClick={onRetry}>{retryText}</Retry>}
      {children}
    </Wrap>
  )
}
