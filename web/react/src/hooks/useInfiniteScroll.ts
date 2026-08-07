import { useState, useEffect, useRef } from 'react'
import { PAGE_SIZE } from '../config'

// ==================== 类型定义 ====================

/** useInfiniteScroll 配置选项 */
interface UseInfiniteScrollOptions {
  /** 每页加载数量，默认使用 config 中的 PAGE_SIZE */
  pageSize?: number
  /** 是否还有更多数据（外部控制） */
  hasMore: boolean
  /** 是否正在加载 */
  loading: boolean
  /** 加载更多数据的回调 */
  loadMore: () => void | Promise<void>
}

/** useInfiniteScroll 返回值 */
interface UseInfiniteScrollReturn {
  /** 哨兵元素 ref - 挂载到列表底部作为触发点 */
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** 是否正在加载 */
  loading: boolean
  /** 是否还有更多数据 */
  hasMore: boolean
  /** 当前页码 */
  page: number
}

// ==================== Hook ====================

/**
 * useInfiniteScroll - 无限滚动 Hook
 *
 * 使用 IntersectionObserver 监听哨兵元素，
 * 当哨兵元素进入视口时自动触发 loadMore 回调加载更多数据。
 *
 * @param options - 配置选项
 * @returns 包含 sentinelRef、loading、hasMore、page 的对象
 *
 * @example
 * ```tsx
 * const { sentinelRef, loading, hasMore, page } = useInfiniteScroll({
 *   hasMore: data.length < total,
 *   loading: isLoading,
 *   loadMore: fetchNextPage,
 * })
 * ```
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const {
    pageSize = PAGE_SIZE,
    hasMore,
    loading,
    loadMore,
  } = options

  // pageSize 用于未来扩展（如按照 pageSize 计算偏移量），当前保留
  void pageSize

  const [page, setPage] = useState<number>(1)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  // 防止重复触发
  const isTriggering = useRef<boolean>(false)

  // 外部 loading 变化时重置触发锁
  useEffect(() => {
    if (!loading) {
      isTriggering.current = false
    }
  }, [loading])

  // IntersectionObserver 监听哨兵元素
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        // 哨兵进入视口、还有更多数据、不在加载中、未触发过
        if (entry.isIntersecting && hasMore && !loading && !isTriggering.current) {
          isTriggering.current = true
          setPage((prev) => prev + 1)
          loadMore()
        }
      },
      {
        // 提前 200px 触发，优化体验
        rootMargin: '200px',
        threshold: 0,
      },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading, loadMore])

  return {
    sentinelRef,
    loading,
    hasMore,
    page,
  }
}

export default useInfiniteScroll