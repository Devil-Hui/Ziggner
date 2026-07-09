import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

// ==================== 类型定义 ====================

/** 面包屑项目 */
export interface BreadcrumbItem {
  label: string
  path?: string
}

/** Breadcrumb 组件 Props */
export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

// ==================== 样式组件 ====================

/** 面包屑容器 - 位于 Header 下方 */
const BreadcrumbWrapper = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 0.85rem;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
`

/** 面包屑项 - 可点击 */
const BreadcrumbLink = styled(Link)`
  color: #666;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #1a73e8;
    text-decoration: underline;
  }
`

/** 面包屑当前项 - 不可点击，最后一项 */
const BreadcrumbCurrent = styled.span`
  color: #333;
  font-weight: 600;
`

/** 分隔符 */
const Separator = styled.span`
  color: #ccc;
  user-select: none;
`

// ==================== 组件 ====================

/**
 * Breadcrumb - 树形结构面包屑导航组件
 *
 * 功能：
 * - 显示层级路径导航
 * - 最后一项不可点击（当前页面）
 * - 渲染在 Header 下方
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <BreadcrumbWrapper aria-label="Breadcrumb navigation">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <React.Fragment key={`breadcrumb-${index}`}>
            {/* 分隔符（第一项前不显示） */}
            {index > 0 && <Separator>/</Separator>}

            {/* 面包屑项 */}
            {isLast || !item.path ? (
              <BreadcrumbCurrent>{item.label}</BreadcrumbCurrent>
            ) : (
              <BreadcrumbLink to={item.path}>{item.label}</BreadcrumbLink>
            )}
          </React.Fragment>
        )
      })}
    </BreadcrumbWrapper>
  )
}

export default Breadcrumb