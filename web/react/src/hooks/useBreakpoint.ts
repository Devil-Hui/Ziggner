/**
 * useBreakpoint — Admin 响应式断点（P2）
 * ───────────────────────────────────────────────────
 * 对齐用户定义的 Admin 断点策略：
 *   ≥1440       desktopXL   桌面扩展
 *   1200–1439   desktop     桌面
 *   992–1199    tabletLandscape  平板横屏
 *   768–991     tablet      平板竖屏
 *   <768        mobile      （此时建议按页面策略切换：商品→卡片 / 订单→List+Drawer /
 *                           三栏客服→会话/聊天/订单 纵排）
 */
import { useEffect, useState } from 'react'

export type AdminBreakpoint = 'desktopXL' | 'desktop' | 'tabletLandscape' | 'tablet' | 'mobile'

function resolve(): AdminBreakpoint {
  if (typeof window === 'undefined') return 'desktopXL'
  const w = window.innerWidth
  if (w >= 1440) return 'desktopXL'
  if (w >= 1200) return 'desktop'
  if (w >= 992) return 'tabletLandscape'
  if (w >= 768) return 'tablet'
  return 'mobile'
}

export function useBreakpoint(): AdminBreakpoint {
  const [bp, setBp] = useState<AdminBreakpoint>(resolve)
  useEffect(() => {
    const onResize = () => setBp(resolve())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return bp
}

/** 兼容既有导出：是否手机宽度（<768px）。旧用法 useIsMobile() */
export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}
