/**
 * useUrlState — URL State（P1）
 * ───────────────────────────────────────────────────
 * 把页面筛选/分页/搜索状态同步进 query string：
 *   /admin/orders?status=paid&page=2&q=ZG123
 * 收益：刷新不丢筛选、浏览器 Back 有效、可复制链接/收藏/分享给同事。
 *
 * 用法：
 *   const [status, setStatus] = useUrlState('status', 'all')
 *   const [page, setPage] = useUrlState('page', '1', { parse: Number, serialize: String })
 *
 * 注意：多个 useUrlState 共存的页面，各自 set 时只改自己的 key，
 * 其余 query 参数保持不动（基于当前 location.search 增量更新）。
 */
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface UseUrlStateOptions<T> {
  /** 从 query string 解析（默认原样字符串） */
  parse?: (raw: string | null) => T
  /** 序列化写入 query string（返回 null/undefined 则删除该 key） */
  serialize?: (value: T) => string | null | undefined
  /** replace（默认，不撑爆历史栈）/ push */
  mode?: 'replace' | 'push'
}

export function useUrlState<T extends string = string>(
  key: string,
  defaultValue: T,
  options?: UseUrlStateOptions<T>,
): [T, (next: T | ((prev: T) => T)) => void] {
  const location = useLocation()
  const navigate = useNavigate()
  const { parse, serialize, mode = 'replace' } = options ?? {}

  const raw = new URLSearchParams(location.search).get(key)
  const value: T = parse ? parse(raw) : ((raw as T | null) ?? defaultValue)

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      const params = new URLSearchParams(location.search)
      const s = serialize ? serialize(resolved) : (resolved == null ? null : String(resolved))
      if (s == null || s === '') params.delete(key)
      else params.set(key, s)
      const qs = params.toString()
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: mode === 'replace' })
    },
    [key, value, location, navigate, serialize, mode],
  )

  return [value, setValue]
}
