/**
 * Tooltip（轻量提示气泡，纯 CSS hover；键盘聚焦同样可见）
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { FontSize, Radius } from '../../../theme/tokens'

const Wrap = styled.span`
  position: relative;
  display: inline-flex;

  .tip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: rgba(17, 24, 39, 0.92);
    color: #fff;
    font-size: ${FontSize.xs}px;
    border-radius: ${Radius.sm}px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    z-index: 10;
    pointer-events: none;
    max-width: 260px;
  }

  &:hover .tip,
  &:focus-visible .tip {
    opacity: 1;
    visibility: visible;
  }
`

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
}

export default function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <Wrap className={className}>
      {children}
      <span className="tip" role="tooltip">{content}</span>
    </Wrap>
  )
}
