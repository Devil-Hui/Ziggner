"""搜索服务 — 简化版，用于本地开发环境。"""

from apps.goods.models import SPU, SPUStatus


class GoodsSearchService:
    """商品搜索服务（简化版，无 Elasticsearch）。"""

    @staticmethod
    def search(*, query='', filters=None, sort=None, page=1, per_page=20):
        """SPU 搜索，支持关键词、分类、品牌、价格区间过滤。"""
        filters = filters or {}
        # 默认仅返回已上架商品，管理员可通过 status 参数覆盖
        qs = SPU.objects.filter(
            deleted_at__isnull=True, status=SPUStatus.ON_SALE,
        ).select_related('brand', 'category')

        if query:
            qs = qs.filter(name__icontains=query)

        category_id = filters.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)

        brand_id = filters.get('brand_id')
        if brand_id:
            qs = qs.filter(brand_id=brand_id)

        min_price = filters.get('min_price')
        if min_price is not None:
            qs = qs.filter(skus__price__gte=min_price)

        max_price = filters.get('max_price')
        if max_price is not None:
            qs = qs.filter(skus__price__lte=max_price)

        status = filters.get('status')
        if status:
            qs = qs.filter(status=status)

        # 排序
        sort_map = {
            'price_asc': 'skus__price',
            'price_desc': '-skus__price',
            'newest': '-created_at',
            'oldest': 'created_at',
        }
        order_by = sort_map.get(sort, '-created_at')
        qs = qs.order_by(order_by).distinct()

        total = qs.count()
        offset = (page - 1) * per_page
        results = qs[offset:offset + per_page]

        from apps.goods.serializers import SPUDetailSerializer
        items = SPUDetailSerializer(results, many=True).data

        return {
            'total': total,
            'page': page,
            'per_page': per_page,
            'items': items,
        }