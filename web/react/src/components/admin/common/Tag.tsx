/**
 * Tag（语义标签，圆角 12px、高 22px、字 12px）
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, FontWeight, Radius, Transition } from '../../../theme/tokens'

export type TagTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const toneMap: Record<TagTone, { bg: string; color: string; border: string }> = {
  success: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  warning: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  error: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  info: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  neutral: { bg: '#f9fafb', color: '#4b5563', border: '#e5e7eb' },
}

const StyledTag = styled.span<{ $tone: TagTone; $closable: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  height: 22px;
  border-radius: ${Radius.lg}px;
  font-size: ${FontSize.xs}px;
  font-weight: ${FontWeight.medium};
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all ${Transition.fast};

  ${({ $tone }) => {
    const t = toneMap[$tone]
    return `background: ${t.bg}; color: ${t.color}; border-color: ${t.border};`
  }}

  .close {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    font-size: 12px;
    line-height: 1;
    color: inherit;
    opacity: 0.7;

    &:hover { opacity: 1; }
  }
`

export interface TagProps {
  tone?: TagTone
  closable?: boolean
  onClose?: () => void
  children: ReactNode
  className?: string
}

export default function Tag({ tone = 'neutral', closable = false, onClose, children, className }: TagProps) {
  return (
    <StyledTag $tone={tone} $closable={closable} className={className}>
      {children}
      {closable && (
        <button className="close" onClick={onClose} aria-label="移除">✕</button>
      )}
    </StyledTag>
  )
}
