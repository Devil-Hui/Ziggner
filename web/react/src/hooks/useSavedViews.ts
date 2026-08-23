/**
 * useSavedViews — 保存视图（P2）
 * ───────────────────────────────────────────────────
 * 把当前筛选/排序状态（query string）保存为命名视图，存 localStorage，
 * 配合 useUrlState 使用：切视图 = 恢复 query string。
 * 典型场景：订单管理员「我的视图：待发货 / 退款处理中 / 今日订单」。
 */
import { useCallback, useState } from 'react'

export interface SavedView {
  id: string
  name: string
  /** 保存的 query string（不含 ?），如 status=paid&channel=mall */
  query: string
  createdAt: number
}

function load(key: string): SavedView[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SavedView[]) : []
  } catch {
    return []
  }
}

function persist(key: string, views: SavedView[]) {
  try {
    localStorage.setItem(key, JSON.stringify(views))
  } catch {
    // localStorage 不可用（隐私模式/配额）时静默失败，功能降级为不持久
  }
}

export function useSavedViews(storageKey: string) {
  const [views, setViews] = useState<SavedView[]>(() => load(storageKey))

  const addView = useCallback(
    (name: string, query: string) => {
      const next: SavedView = { id: `v_${Date.now()}`, name, query, createdAt: Date.now() }
      const merged = [...views, next].slice(-20) // 最多 20 个视图
      setViews(merged)
      persist(storageKey, merged)
      return next
    },
    [views, storageKey],
  )

  const removeView = useCallback(
    (id: string) => {
      const next = views.filter((v) => v.id !== id)
      setViews(next)
      persist(storageKey, next)
    },
    [views, storageKey],
  )

  const renameView = useCallback(
    (id: string, name: string) => {
      const next = views.map((v) => (v.id === id ? { ...v, name } : v))
      setViews(next)
      persist(storageKey, next)
    },
    [views, storageKey],
  )

  return { views, addView, removeView, renameView }
}
