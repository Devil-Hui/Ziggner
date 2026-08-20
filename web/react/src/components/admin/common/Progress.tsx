/**
 * Progress（线型进度条，width 0.6s 过渡；红色语义填充由 status 控制）
 */
import styled from 'styled-components'
import { Color, FontSize, Radius } from '../../../theme/tokens'

const Wrap = styled.div<{ $w: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Track = styled.div<{ $w: string }>`
  width: ${({ $w }) => $w};
  height: 6px;
  border-radius: ${Radius.sm}px;
  background: ${Color.border.light};
  overflow: hidden;
`

const Fill = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  background: ${({ $color }) => $color};
  border-radius: ${Radius.sm}px;
  transition: width 0.6s ease;
`

const Text = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

export interface ProgressProps {
  percent: number
  /** 填充色；默认主蓝，进度/用量类可传红 #dc2626 */
  color?: string
  showText?: boolean
  width?: string
  className?: string
}

export default function Progress({ percent, color = Color.primary, showText = true, width = '120px', className }: ProgressProps) {
  return (
    <Wrap $w={width} className={className}>
      <Track $w={width}>
        <Fill $percent={percent} $color={color} />
      </Track>
      {showText && <Text>{Math.round(percent)}%</Text>}
    </Wrap>
  )
}
