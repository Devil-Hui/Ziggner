/**
 * useDashboardStats — 工作台统计（P2）
 * ───────────────────────────────────────────────────
 * 待办优先于统计：并行拉取待审核商品/申请/售后/未读通知/进行中任务 + 商品/订单总数。
 * 各指标独立 try/catch，单个失败不影响其余；字段解析做兼容（total/count/results/items）。
 */
import { useCallback, useEffect, useState } from 'react'
import { adminAPI, type PaginatedData } from '../api/admin'
import { orderAPI } from '../api/order'

export interface DashboardStats {
  pendingProducts: number
  pendingApplications: number
  pendingAfterSales: number
  unreadNotifications: number
  runningTasks: number
  productCount: number
  orderCount: number
  loading: boolean
  refreshedAt: number | null
  refresh: () => Promise<void>
}

function readTotal(x: unknown): number {
  if (x == null) return 0
  if (typeof x === 'number') return x
  if (Array.isArray(x)) return x.length
  const o = x as Record<string, unknown>
  const t = o.total ?? o.count
  if (typeof t === 'number') return t
  if (Array.isArray(o.results)) return (o.results as unknown[]).length
  if (Array.isArray(o.items)) return (o.items as unknown[]).length
  return 0
}

export function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState({
    pendingProducts: 0,
    pendingApplications: 0,
    pendingAfterSales: 0,
    unreadNotifications: 0,
    runningTasks: 0,
    productCount: 0,
    orderCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [spuPending, applications, afterSales, unread, tasks, spuAll, orders] = await Promise.allSettled([
      adminAPI.getSPUs({ status: 'pending', page: 1, size: 1 }).then((d: PaginatedData<unknown>) => readTotal(d)),
      adminAPI.getPendingApplications().then((d) => readTotal(d)),
      orderAPI.adminAfterSaleList({ status: 'pending', page: 1, size: 1 }).then((d) => readTotal(d)),
      adminAPI.getUnreadCount().then((d) => readTotal((d as { unread_count?: number }).unread_count)),
      adminAPI.getMyTasks().then((d) => (Array.isArray(d) ? d.filter((t) => t.state === 'PROCESSING' || t.state === 'PENDING').length : 0)),
      adminAPI.getSPUs({ page: 1, size: 1 }).then((d: PaginatedData<unknown>) => readTotal(d)),
      orderAPI.adminList({ page: 1, size: 1 }).then((d) => readTotal(d)),
    ])

    const val = (r: PromiseSettledResult<number>): number => (r.status === 'fulfilled' ? r.value : 0)
    setStats({
      pendingProducts: val(spuPending),
      pendingApplications: val(applications),
      pendingAfterSales: val(afterSales),
      unreadNotifications: val(unread),
      runningTasks: val(tasks),
      productCount: val(spuAll),
      orderCount: val(orders),
    })
    setRefreshedAt(Date.now())
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...stats, loading, refreshedAt, refresh }
}
