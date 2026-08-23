/**
 * StatusBadge — 统一状态徽标（tone 化）
 * ───────────────────────────────────────────────────
 * 业务只声明 tone（neutral/info/success/warning/danger/purple），
 * 颜色由 Semantic.status[tone] 解析，杜绝各页写死 #047857/#28a745 之类发散。
 * 支持 dot 前缀与 title（状态解释 Tooltip：提交人/处理人/SLA 等）。
 */
import styled from 'styled-components'
import type { ReactNode } from 'react'
import { StatusTone, statusToneFg, statusToneBg } from '@/theme'

const Pill = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: ${({ $tone }) => statusToneFg($tone)};
  background: ${({ $tone }) => statusToneBg($tone)};
  white-space: nowrap;
  box-sizing: border-box;
`

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  flex: none;
`

export interface StatusBadgeProps {
  tone: StatusTone
  children: ReactNode
  /** 前置状态圆点 */
  dot?: boolean
  /** 状态解释：鼠标悬停展示（提交人/当前处理人/SLA 等） */
  title?: string
}

export function StatusBadge({ tone, children, dot, title }: StatusBadgeProps) {
  return (
    <Pill $tone={tone} title={title}>
      {dot && <Dot />}
      {children}
    </Pill>
  )
}
