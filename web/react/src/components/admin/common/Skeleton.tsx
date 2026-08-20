/**
 * Skeleton（骨架屏，替代转菊花）
 * ─────────────────────────────
 * 类型：table / card / avatar / text / image；颜色 #e5e7eb，shimmer 左→右扫光。
 */
import styled, { keyframes } from 'styled-components'
import { Radius, Spacing } from '../../../theme/tokens'

const shimmer = keyframes`
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`

const Block = styled.div<{ $w?: string; $h?: string; $r?: string }>`
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '16px'};
  border-radius: ${({ $r }) => $r ?? `${Radius.sm}px`};
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 37%, #e5e7eb 63%);
  background-size: 400% 100%;
  animation: ${shimmer} 1.4s ease infinite;
`

const Row = styled.div`
  display: flex;
  gap: ${Spacing.md}px;
  align-items: center;
`

export interface SkeletonProps {
  type?: 'table' | 'card' | 'avatar' | 'text' | 'image'
  rows?: number
  cols?: number
  className?: string
}

export default function Skeleton({ type = 'text', rows = 3, cols = 4, className }: SkeletonProps) {
  if (type === 'avatar') {
    return (
      <Row className={className}>
        <Block $w="40px" $h="40px" $r="50%" />
        <div style={{ flex: 1 }}>
          <Block $w="60%" $h="14px" />
        </div>
      </Row>
    )
  }
  if (type === 'image') {
    return <Block $w="100%" $h="200px" $r={`${Radius.md}px`} className={className} />
  }
  if (type === 'table') {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
        <Block $h="14px" $w="30%" />
        {Array.from({ length: rows }).map((_, r) => (
          <Row key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <Block key={c} $h="16px" $w={c === cols - 1 ? '15%' : '22%'} />
            ))}
          </Row>
        ))}
      </div>
    )
  }
  if (type === 'card') {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
        {Array.from({ length: rows }).map((_, r) => (
          <Row key={r}>
            <Block $w="48px" $h="48px" $r={`${Radius.sm}px`} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
              <Block $w="70%" $h="16px" />
              <Block $w="40%" $h="12px" />
            </div>
          </Row>
        ))}
      </div>
    )
  }
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
      {Array.from({ length: rows }).map((_, r) => (
        <Block key={r} $h="14px" $w={`${100 - (r % 3) * 20}%`} />
      ))}
    </div>
  )
}
