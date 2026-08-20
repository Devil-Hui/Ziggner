/**
 * Badge（数字角标 / 红点），数字上限 99+。
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, Radius } from '../../../theme/tokens'

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
`

const Count = styled.span`
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: ${Radius.full}px;
  background: ${Color.status.error};
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
  box-shadow: 0 0 0 2px #fff;
`

const Dot = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${Color.status.error};
  box-shadow: 0 0 0 2px #fff;
`

export interface BadgeProps {
  count?: number
  /** 仅红点（不显示数字） */
  dot?: boolean
  max?: number
  children: ReactNode
  className?: string
}

export default function Badge({ count = 0, dot = false, max = 99, children, className }: BadgeProps) {
  const shown = count > max ? `${max}+` : String(count)
  return (
    <Wrap className={className}>
      {children}
      {dot ? <Dot /> : count > 0 && <Count>{shown}</Count>}
    </Wrap>
  )
}
