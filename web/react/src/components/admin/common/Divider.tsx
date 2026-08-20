/**
 * Divider（分割线）
 */
import styled from 'styled-components'
import { Color, Spacing } from '../../../theme/tokens'

const H = styled.div`
  height: 1px;
  background: ${Color.border.light};
  margin: ${Spacing.lg}px 0;
`

const V = styled.div`
  width: 1px;
  height: 16px;
  background: ${Color.border.light};
`

export interface DividerProps {
  type?: 'horizontal' | 'vertical'
  className?: string
}

export default function Divider({ type = 'horizontal', className }: DividerProps) {
  return type === 'vertical' ? <V className={className} /> : <H className={className} />
}
