/**
 * 轻量 SWR 风格的数据获取 hook。
 * 自动管理 loading/error/data 状态，组件卸载时取消请求。
 *
 * 使用方式：
 *   const { data, loading, error, refetch } = useRequest(
 *     `spu-${id}`,
 *     () => publicAPI.getSPUDetail(id)
 *   )
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRequestResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRequest<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): UseRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    if (!key) return;

    // 取消上一次请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (mountedRef.current && !controller.signal.aborted) {
        setData(result);
      }
    } catch (err: unknown) {
      if (mountedRef.current && !controller.signal.aborted) {
        setError(err instanceof Error ? err.message : '请求失败');
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [key, fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}