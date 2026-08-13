import React from 'react'
import styled from 'styled-components'
import {
  promoPennantContainer,
  promoPennantPrimary,
  promoPennantSecondary,
} from '../../../styles/promoTag'
import type { PromoTag } from '../../../api/public'

const Container = styled.div`
  ${promoPennantContainer}
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
 */
const PromoTags: React.FC<{ tags?: PromoTag[] }> = ({ tags }) => {
  if (!tags || tags.length === 0) return null

  if (tags.length === 1) {
    const tag = tags[0]
    const Tag = tag.type === 'secondary' ? Secondary : Primary
    return (
      <Container>
        <Tag>{tag.label}</Tag>
      </Container>
    )
  }

  const primary = tags.find((t) => t.type === 'primary') || tags[0]
  const secondary = tags.find((t) => t.type === 'secondary') || tags[1]
  return (
    <Container>
      <Stack>
        <Secondary>{secondary?.label}</Secondary>
        <Primary>{primary?.label}</Primary>
      </Stack>
    </Container>
  )
}

export default PromoTags
