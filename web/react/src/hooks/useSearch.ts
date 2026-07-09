import { useState, useCallback, useRef } from 'react';
import { publicAPI } from '../api/public';
import type { PublicSPU } from '../api/public';

export function useSearch() {
  const [results, setResults] = useState<PublicSPU[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (keyword: string, categoryId?: number, page = 1) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await publicAPI.search({ q: keyword, category_id: categoryId, page, per_page: 20 });
        const items = (data as { results?: PublicSPU[]; items?: PublicSPU[] }).results
          || (data as { items?: PublicSPU[] }).items || [];
        setResults(items);
        setTotal((data as { total?: number; count?: number }).total
          || (data as { count?: number }).count || 0);
      } catch {
        // keep old results
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  return { results, isLoading, total, search };
}
