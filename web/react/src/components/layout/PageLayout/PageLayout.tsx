// 前台页面统一布局模版
// 使用方式：<PageLayout><YourContent /></PageLayout>
// 自动包裹 Navigation + 内容区，后续可扩展 Footer

import { type ReactNode } from 'react'
import Navigation from '../Navigation/Navigation'

type PageLayoutProps = {
  children: ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div>
      <Navigation />
      {children}
    </div>
  )
}