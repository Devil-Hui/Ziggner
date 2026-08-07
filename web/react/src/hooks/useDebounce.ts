/**
 * 通用防抖 hook。
 * 延迟更新值，适用于搜索输入框、价格筛选等高频变动的场景。
 *
 * 使用方式：
 *   const [searchTerm, setSearchTerm] = useState('')
 *   const debouncedTerm = useDebounce(searchTerm, 300)
 *
 *   useEffect(() => {
 *     if (debouncedTerm) fetchResults(debouncedTerm)
 *   }, [debouncedTerm])
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}