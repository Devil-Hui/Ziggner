/**
 * 断点突变 Hook（响应式）
 * ─────────────────────────
 * 管理后台三大断点：1024（平板横屏）/ 768（平板竖屏）/ 480（手机）。
 * 返回当前断点键与常用布尔，配合组件级「突变式」布局切换（而非线性挤压）。
 */
import { useEffect, useState } from 'react'

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg'

const QUERIES: { key: BreakpointKey; query: string }[] = [
  { key: 'xs', query: '(max-width: 479.98px)' },
  { key: 'sm', query: '(min-width: 480px) and (max-width: 767.98px)' },
  { key: 'md', query: '(min-width: 768px) and (max-width: 1023.98px)' },
  { key: 'lg', query: '(min-width: 1024px)' },
]

function resolve(): BreakpointKey {
  if (typeof window === 'undefined') return 'lg'
  const matched = QUERIES.find(q => window.matchMedia(q.query).matches)
  return matched ? matched.key : 'lg'
}

export function useBreakpoint(): BreakpointKey {
  const [bp, setBp] = useState<BreakpointKey>(resolve)
  useEffect(() => {
    const mqls = QUERIES.map(q => window.matchMedia(q.query))
    const handler = () => setBp(resolve())
    mqls.forEach(m => m.addEventListener('change', handler))
    return () => mqls.forEach(m => m.removeEventListener('change', handler))
  }, [])
  return bp
}

/** <768px：移动优先模板区隔（简化版模板 / 汉堡菜单） */
export function useIsMobile(): boolean {
  const bp = useBreakpoint()
  return bp === 'xs' || bp === 'sm'
}

/** <1024px：平板及以下（侧栏折叠 / 卡片降列） */
export function useIsCompact(): boolean {
  const bp = useBreakpoint()
  return bp !== 'lg'
}
