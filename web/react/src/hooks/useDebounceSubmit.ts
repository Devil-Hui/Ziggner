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

      // 统一解锁函数：请求完成（成功/失败/同步异常）后立即解锁，
      // 不再额外等待 delay —— 避免成功后可重试的间隙被吞掉
      const unlock = () => {
        if (!mountedRef.current) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        pendingRef.current = false;
        setIsPending(false);
      };

      // 超时兜底：若 callback 返回的 Promise 一直 hang（如网络挂起），
      // delay+2000ms 后强制解锁，避免 pendingRef 永久卡死导致后续点击被静默丢弃（0 请求）
      timerRef.current = setTimeout(unlock, delay + 2000);

      try {
        const result = callback(...args);

        // 如果 callback 返回 Promise，等待完成后恢复
        if (result instanceof Promise) {
          result.then(unlock).catch(unlock);
        } else {
          unlock();
        }
      } catch {
        // 同步异常时立即恢复
        unlock();
      }
    },
    [callback, delay],
  );

  return { execute, isPending };
}