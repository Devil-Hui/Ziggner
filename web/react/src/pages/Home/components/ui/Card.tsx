import styled from 'styled-components'
import { Ink, Font, Radius, Elevation, cardSurface, cardLift } from '../../editorial'

interface CardProps {
  children: React.ReactNode
  /** 內距尺寸 */
  pad?: 'sm' | 'md' | 'lg'
  /** 是否啟用 hover 上浮 */
  lift?: boolean
  className?: string
}

const PAD = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
} as const

const Surface = styled.div<{ $pad: string; $lift: boolean }>`
  ${cardSurface};
  padding: ${p => p.$pad};
  ${p => p.$lift && cardLift};
`

/**
 * 通用卡片 — 全站卡片观感的单一来源。
 * 白底 + 24px 大圆角 + 柔和紫调阴影，可选 hover 上浮。
 */
export default function Card({ children, pad = 'md', lift = false, className }: CardProps) {
  return (
    <Surface $pad={PAD[pad]} $lift={lift} className={className}>
      {children}
    </Surface>
  )
}

/** 卡片標題 */
export const CardTitle = styled.h3`
  font-family: ${Font.display};
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${Ink.black};
  margin: 0;
`

/** 卡片說明文字 */
export const CardText = styled.p`
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${Ink.graphite};
  margin: 0;
`

/** 小徽章（紫色標籤） */
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.softDeep};
  color: ${Ink.brand};
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;

  svg {
    width: 13px;
    height: 13px;
  }
`

/** 紫色主按鈕 */
export const PrimaryButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.brand};
  color: ${Ink.paper};
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: ${Elevation.brand};
  transition: background 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    background: ${Ink.brandDeep};
    transform: translateY(-2px);
  }
`

/** 描邊次按鈕 */
export const GhostButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.paper};
  border: 1.5px solid ${Ink.rule};
  color: ${Ink.black};
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: ${Ink.brand};
    color: ${Ink.brand};
    transform: translateY(-2px);
  }
`
