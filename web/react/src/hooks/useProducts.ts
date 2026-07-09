/**
 * 从后端 API 获取商品数据，与 admin 后台操作保持一致。
 * 所有数据来自真实 API，不再使用 mock 降级。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { publicAPI, type PublicSPU, type PublicCategory } from '../api/public';

// ── 类型 ──────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  categoryId?: number;
  description: string;
  rating: number;
  reviews: number;
  badge?: string;
  originalPrice?: number;
}

export interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  level: number;
  children?: CategoryItem[];
}

// ── 数据映射 ──────────────────────────────────────────────────

function mapSPUToProduct(spu: PublicSPU): Product {
  return {
    id: spu.id,
    name: spu.name,
    price: parseFloat(spu.min_price || '0') || 0,
    image: spu.main_image || '',
    category: spu.category_name || '',
    description: spu.description || '',
    rating: 0,
    reviews: 0,
  };
}

// ── Hook: 商品列表 ────────────────────────────────────────────

export function useProducts(page = 1, per_page = 20, categoryId?: number) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    abortRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, per_page };
      if (categoryId) params.category_id = categoryId;
      const response = await publicAPI.getSPUList(params);
      if (abortRef.current) return;
      const items = response.items || response.results || [];
      setProducts(items.map(mapSPUToProduct));
      setTotal(response.total || 0);
    } catch (err: any) {
      if (!abortRef.current) setError(err?.message || 'Failed to load products');
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, [page, per_page, categoryId]);

  useEffect(() => {
    fetchProducts();
    return () => { abortRef.current = true; };
  }, [fetchProducts]);

  return { products, total, loading, error, refetch: fetchProducts };
}

// ── Hook: 商品详情 ────────────────────────────────────────────

export function useProductDetail(spuId: number) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!spuId) return;
    abortRef.current = false;
    setLoading(true);
    setError(null);
    publicAPI.getSPUDetail(spuId)
      .then((detail) => {
        if (abortRef.current) return;
        if (detail) {
          const minPrice = detail.skus?.length
            ? Math.min(...detail.skus.map(s => parseFloat(s.price || '0') || 0))
            : 0;
          setProduct({
            id: detail.id,
            name: detail.name,
            price: minPrice,
            image: detail.main_image || detail.skus?.[0]?.image_url || '',
            category: detail.category_path || '',
            categoryId: detail.category_id,
            description: detail.description || '',
            rating: 0,
            reviews: 0,
          });
        }
      })
      .catch((err: any) => {
        if (!abortRef.current) setError(err?.message || 'Failed to load product');
      })
      .finally(() => { if (!abortRef.current) setLoading(false); });
    return () => { abortRef.current = true; };
  }, [spuId]);

  return { product, loading, error };
}

// ── Hook: 分类列表（树形） ────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const mapNode = (node: PublicCategory): CategoryItem => ({
    id: node.id,
    name: node.name,
    icon: '',
    level: node.level,
    children: node.children?.map(mapNode) || [],
  });

  useEffect(() => {
    abortRef.current = false;
    publicAPI.getCategoryTree()
      .then((tree) => {
        if (abortRef.current) return;
        if (Array.isArray(tree) && tree.length > 0) {
          setCategories(tree.map(mapNode));
        }
      })
      .catch((err: any) => {
        if (!abortRef.current) setError(err?.message || 'Failed to load categories');
      })
      .finally(() => { if (!abortRef.current) setLoading(false); });
    return () => { abortRef.current = true; };
  }, []);

  return { categories, loading, error };
}

// ── Hook: 扁平分类列表 ────────────────────────────────────────

export function useFlatCategories() {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    publicAPI.getCategoryTree()
      .then((tree) => {
        if (abortRef.current) return;
        const flat: { id: number; name: string }[] = [];
        const walk = (nodes: PublicCategory[]) => {
          for (const node of nodes) {
            flat.push({ id: node.id, name: node.name });
            if (node.children) walk(node.children);
          }
        };
        if (Array.isArray(tree)) walk(tree);
        setCategories(flat);
      })
      .catch(() => {})
      .finally(() => { if (!abortRef.current) setLoading(false); });
    return () => { abortRef.current = true; };
  }, []);

  return { categories, loading };
}