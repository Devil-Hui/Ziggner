/**
 * Empty（空状态）
 * 无数据 / 无搜索结果 / 无权限；居中展示，可带引导按钮。
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, Spacing } from '../../../theme/tokens'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${Spacing.section}px;
  text-align: center;
`

const Icon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${Color.bg.page};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: ${Color.text.muted};
  margin-bottom: ${Spacing.md}px;
`

const Title = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  margin-bottom: ${Spacing.xs}px;
`

const Desc = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
  margin-bottom: ${Spacing.md}px;
`

export interface EmptyProps {
  icon?: string
  title?: string
  description?: string
  children?: ReactNode
  className?: string
}

export default function Empty({ icon = '📭', title = '暂无数据', description, children, className }: EmptyProps) {
  return (
    <Wrap className={className}>
      <Icon>{icon}</Icon>
      <Title>{title}</Title>
      {description && <Desc>{description}</Desc>}
      {children}
    </Wrap>
  )
}
