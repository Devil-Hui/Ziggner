// 前台页面共享样式组件 —— 全局排版模版
// 所有前台页面通过 import { Container, Wrapper, Sidebar, MainContent, ModuleCard, ModuleTitle } from './shared' 引用
// 样式统一引用 theme/tokens，修改 tokens 即可全局联动

import styled from 'styled-components'
import { Color, Spacing, Radius, Shadow, FontSize, Layout, Breakpoint } from '../../../theme/tokens'

/** 页面外层容器 */
export const Container = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background-color: ${Color.bg.page};
  padding: ${Spacing.page}px ${Spacing.page}px;
`

/** 内容居中包裹器 */
export const Wrapper = styled.div`
  max-width: ${Layout.maxContentWidth}px;
  margin: 0 2vw 0 ${Layout.navLeftMargin};

  @media (max-width: ${Breakpoint.mobile}px) {
    margin-left: 2vw;
  }
`

/** 侧边栏卡片 */
export const Sidebar = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: ${Spacing.xxl}px;
`

/** 主内容区域 */
export const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.xxl}px;
`

/** 模块卡片 */
export const ModuleCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: ${Spacing.xxl}px;
`

/** 模块标题 */
export const ModuleTitle = styled.div`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: ${Spacing.xl}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`