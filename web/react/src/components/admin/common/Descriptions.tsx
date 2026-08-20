/**
 * Descriptions（只读字段描述，2 列栅格）
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, Spacing } from '../../../theme/tokens'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${Spacing.md}px ${Spacing.xl}px;
`

const Item = styled.div`
  min-width: 0;

  .label {
    font-size: ${FontSize.xs}px;
    color: ${Color.text.muted};
    margin-bottom: 4px;
  }

  .value {
    font-size: ${FontSize.base}px;
    color: ${Color.text.body};
    word-break: break-word;
  }
`

export interface DescriptionsItem {
  label: ReactNode
  value: ReactNode
  span?: number
}

export interface DescriptionsProps {
  items: DescriptionsItem[]
  column?: number
  className?: string
}

export default function Descriptions({ items, column, className }: DescriptionsProps) {
  return (
    <Grid className={className} style={column ? { gridTemplateColumns: `repeat(${column}, 1fr)` } : undefined}>
      {items.map((it, i) => (
        <Item key={i} style={it.span ? { gridColumn: `span ${it.span}` } : undefined}>
          <div className="label">{it.label}</div>
          <div className="value">{it.value ?? '-'}</div>
        </Item>
      ))}
    </Grid>
  )
}
