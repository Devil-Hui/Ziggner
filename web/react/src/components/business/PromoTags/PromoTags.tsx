import React from 'react'
import styled from 'styled-components'
import {
  promoPennantContainer,
  promoPennantPrimary,
  promoPennantSecondary,
} from '../../../styles/promoTag'
import type { PromoTag } from '../../../api/public'

const Container = styled.div<{ $clickable?: boolean }>`
  ${promoPennantContainer}
  ${props => props.$clickable && `
    cursor: pointer;
    transition: transform 0.2s ease;
    &:hover { transform: translateY(-2px); }
  `}
`

const Stack = styled.div`
  position: relative;
  display: inline-block;
`

const Primary = styled.span`
  ${promoPennantPrimary}
`

const Secondary = styled.span`
  ${promoPennantSecondary}
`

/**
 * 商品活动标签渲染器 —— 复用 promoTag.ts 的锦旗样式。
 * - 单个标签：蓝色(primary) 或 黄色(secondary)
 * - 两个标签：黄(secondary) 层叠在蓝(primary) 之上
 * - 传入 onClick 时整块可点击（如跳领券中心），并阻止冒泡避免与卡片跳转冲突
 */
const PromoTags: React.FC<{ tags?: PromoTag[]; onClick?: () => void }> = ({ tags, onClick }) => {
  if (!tags || tags.length === 0) return null

  const handleClick = onClick
    ? (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }
    : undefined

  if (tags.length === 1) {
    const tag = tags[0]
    const Tag = tag.type === 'secondary' ? Secondary : Primary
    return (
      <Container $clickable={!!onClick} onClick={handleClick}>
        <Tag>{tag.label}</Tag>
      </Container>
    )
  }

  const primary = tags.find((t) => t.type === 'primary') || tags[0]
  const secondary = tags.find((t) => t.type === 'secondary') || tags[1]
  return (
    <Container $clickable={!!onClick} onClick={handleClick}>
      <Stack>
        <Secondary>{secondary?.label}</Secondary>
        <Primary>{primary?.label}</Primary>
      </Stack>
    </Container>
  )
}

export default PromoTags
