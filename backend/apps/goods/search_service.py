"""商品搜索服务 — 简化版（本地开发）
"""

import re
import logging

from django.db.models import Count, Min, Max, Q, Sum

logger = logging.getLogger('biz')

MAX_QUERY_LENGTH = 100
MIN_QUERY_LENGTH = 2
CACHE_TTL = 600        # 10min
HARD_LIMIT = 200       # max rows ever scanned
SUGGEST_MAX_RESULTS = 20


def _sanitize(query: str) -> str:
    """清洗：截断+去LIKE通配符+去SQL元字符+合并空格+小写"""
    if not query:
        return ''
    k = query.strip()[:MAX_QUERY_LENGTH]
    k = re.sub(r'[%_\\\'\";]', '', k)
    k = re.sub(r'\s+', ' ', k)
    return k.lower()


class GoodsSearchService:
    """简化搜索服务（无互斥锁）"""

    @staticmethod
    def search(query: str = '', filters: dict = None, sort: str = None,
               page: int = 1, per_page: int = 20) -> dict:
        from .models import SPU, SKU
        from utils.cache import Cache
        _cache = Cache('search')

        query = _sanitize(query)
        filters = filters or {}

        # ── L0: 短词直接拒 ──
        if query and len(query) < MIN_QUERY_LENGTH:
            return {'items': [], 'total': 0, 'page': page, 'per_page': per_page, 'facets': {}}

        cache_key = f'srch:{query}:{filters.get("category_id",0)}:{filters.get("brand_id",0)}:{sort or "new"}:{page}'

        # ── L1: 缓存（含空结果） ──
        cached = _cache.get_json(cache_key)
        if cached is not None:
            return cached

        # ── L3: MySQL 降级 ──
        qs = SPU.objects.filter(
            deleted_at__isnull=True, status='on_sale'
        ).select_related('brand', 'category')

        if query:
            qs = qs.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(brand__name__icontains=query)
            )
        if filters.get('category_id'):
            qs = qs.filter(category_id=filters['category_id'])
        if filters.get('brand_id'):
            qs = qs.filter(brand_id=filters['brand_id'])

        # SKU 聚合（限制范围）
        spu_ids = list(qs.values_list('id', flat=True)[:HARD_LIMIT])
        sku_agg = {}
        if spu_ids:
            agg_qs = SKU.objects.filter(spu_id__in=spu_ids).values('spu_id').annotate(
                min_price=Min('price'), max_price=Max('price'),
                total_stock=Sum('stock'), total_sales=Sum('sales'),
            )
            sku_agg = {r['spu_id']: r for r in agg_qs}

        # 价格/库存过滤
        if filters.get('price_min') is not None:
            spu_ids = [s for s in spu_ids if sku_agg.get(s, {}).get('min_price') is not None and sku_agg[s]['min_price'] >= filters['price_min']]
        if filters.get('price_max') is not None:
            spu_ids = [s for s in spu_ids if sku_agg.get(s, {}).get('min_price') is not None and sku_agg[s]['min_price'] <= filters['price_max']]
        if filters.get('in_stock'):
            spu_ids = [s for s in spu_ids if (sku_agg.get(s, {}).get('total_stock') or 0) > 0]

        total = len(spu_ids)

        # 排序
        sort_map = {'price_asc': 'min_price', 'price_desc': '-min_price',
                    'sales_desc': '-total_sales', 'newest': '-created_at', 'relevance': '-total_sales'}
        order_by = sort_map.get(sort, '-created_at')
        reverse = order_by.startswith('-')
        field = order_by.lstrip('-')

        if field in ('min_price', 'total_sales'):
            spu_ids.sort(
                key=lambda s: float(sku_agg.get(s, {}).get(field, 0) or 0), reverse=reverse
            )
        elif field == 'created_at':
            batch = list(SPU.objects.filter(id__in=spu_ids).values('id', 'created_at'))
            cmap = {r['id']: r['created_at'] for r in batch}
            spu_ids.sort(key=lambda s: cmap.get(s, 0), reverse=reverse)

        # 分页
        start = (page - 1) * per_page
        paged_ids = spu_ids[start:start + per_page]

        batch = {s.id: s for s in SPU.objects.filter(id__in=paged_ids).select_related('brand', 'category')}
        items = []
        for sid in paged_ids:
            spu = batch.get(sid)
            if not spu:
                continue
            agg = sku_agg.get(sid, {})
            items.append({
                'id': spu.id, 'name': spu.name,
                'brand_id': spu.brand_id, 'brand_name': spu.brand.name if spu.brand else '',
                'category_id': spu.category_id,
                'main_image': spu.main_image or '',
                'min_price': float(agg.get('min_price', 0)) if agg.get('min_price') else 0,
                'max_price': float(agg.get('max_price', 0)) if agg.get('max_price') else 0,
                'total_stock': agg.get('total_stock') or 0,
                'total_sales': agg.get('total_sales') or 0,
                'created_at': spu.created_at.isoformat() if spu.created_at else '',
            })

        payload = {'items': items, 'total': total, 'page': page, 'per_page': per_page,
                   'facets': {'by_brand': [], 'by_category': [], 'price_ranges': []}}
        _cache.set_json(cache_key, payload, CACHE_TTL)
        return payload

    @staticmethod
    def suggest(query: str) -> list:
        from .models import SPU
        query = _sanitize(query)
        if not query or len(query) < 2:
            return []
        qs = SPU.objects.filter(
            deleted_at__isnull=True, status='on_sale',
            name__icontains=query,
        ).values_list('name', flat=True).distinct()[:SUGGEST_MAX_RESULTS]
        return list(qs)
