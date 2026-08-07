/**
 * 防重复提交 hook。
 * 短时间内的多次点击只执行一次回调，防止表单重复提交。
 *
 * 使用方式：
 *   const { execute, isPending } = useDebounceSubmit(async (e) => {
 *     await api.submit(data)
 *   }, 800)
 *
 *   <button onClick={execute} disabled={isPending}>
 *     {isPending ? '提交中...' : '提交'}
 *   </button>
 */

import { useRef, useCallback, useState, useEffect } from 'react';

type AsyncFn<T extends unknown[]> = (...args: T) => Promise<void> | void;

export function useDebounceSubmit<T extends unknown[]>(
  callback: AsyncFn<T>,
  delay = 500,
): {
  execute: (...args: T) => void;
  isPending: boolean;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false); // ref 作为互斥锁，避免 React 闭包中的状态延迟
  const [isPending, setIsPending] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const execute = useCallback(
    (...args: T) => {
      // ref 互斥锁：防止同一闭包中的多次调用
      if (pendingRef.current) return;

      pendingRef.current = true;
      setIsPending(true);

      try {
        const result = callback(...args);

        // 如果 callback 返回 Promise，等待完成后恢复
        if (result instanceof Promise) {
          result
            .then(() => {
              timerRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  pendingRef.current = false;
                  setIsPending(false);
                }
              }, delay);
            })
            .catch(() => {
              // 失败时立即恢复，允许重试
              if (mountedRef.current) {
                pendingRef.current = false;
                setIsPending(false);
              }
            });
        } else {
          timerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              pendingRef.current = false;
              setIsPending(false);
            }
          }, delay);
        }
      } catch {
        // 同步异常时立即恢复
        if (mountedRef.current) {
          pendingRef.current = false;
          setIsPending(false);
        }
      }
    },
    [callback, delay],
  );

  return { execute, isPending };
}