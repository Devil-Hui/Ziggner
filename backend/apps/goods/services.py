from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from utils.cache import Cache
from utils.bloom_filter import BloomFilter

_goods_cache = Cache('goods')
_status_cache = Cache('spu:status')
_ttl = settings.GOODS_CACHE_TTL

# 布隆过滤器 — 前置拦截不存在的 SPU/SKU ID
_spu_bloom = BloomFilter('spu_ids', capacity=100000, error_rate=0.001)
_sku_bloom = BloomFilter('sku_ids', capacity=500000, error_rate=0.001)


# ==================== 缓存服务 ====================

class GoodsCacheService:
    """商品缓存读写与失效管理（static methods）"""

    # ---------- warm ----------

    @staticmethod
    def warm_category_tree():
        from apps.goods.models import Category
        cats = list(Category.objects.filter(is_active=True).select_related('parent'))
        data = GoodsCacheService._build_category_tree(cats)
        _goods_cache.two_level_set('category:tree:active', data, _ttl['CATEGORY_TREE'])

    @staticmethod
    def warm_brand_list():
        from apps.goods.models import Brand
        from apps.goods.serializers import BrandSerializer
        brands = Brand.objects.filter(is_active=True)
        data = BrandSerializer(brands, many=True).data
        _goods_cache.set('brand:list', data, _ttl['BRAND_LIST'])

    @staticmethod
    def warm_hot_products(category_id=None):
        if category_id is not None and category_id <= 0:
            return
        from apps.goods.models import SKU, SPUStatus
        # 仅返回已上架且父 SPU 已上架、有库存的 SKU
        skus = SKU.objects.select_related('spu').filter(
            spu__status=SPUStatus.ON_SALE,
            spu__deleted_at__isnull=True,
            shelf_status='on',
            stock__gt=0,
        ).order_by('-id')[:100]
        from apps.goods.serializers import SKUSimpleSerializer
        data = SKUSimpleSerializer(skus, many=True).data
        suffix = f':{category_id}' if category_id else ''
        key = f'hot:products{suffix}'
        _goods_cache.set(key, data, _ttl['HOT_PRODUCTS'])

    # ---------- invalidate ----------

    @staticmethod
    def invalidate_brand(brand_id: int = None):
        _goods_cache.delete('brand:list')

    @staticmethod
    def invalidate_category_tree():
        _goods_cache.delete('category:tree:active')

    @staticmethod
    def invalidate_spu(spu_id: int):
        _goods_cache.delete(f'spu:{spu_id}')
        _goods_cache.delete(f'spu:{spu_id}:skus')

    @staticmethod
    def invalidate_sku(sku_id: int, spu_id: int = None):
        _goods_cache.delete(f'sku:{sku_id}')
        if spu_id:
            GoodsCacheService.invalidate_spu(spu_id)

    @staticmethod
    def invalidate_hot_products():
        _goods_cache.clear_by_prefix('hot:products')

    @staticmethod
    def invalidate_spu_list():
        _goods_cache.clear_by_prefix('spu:list')

    @staticmethod
    def invalidate_tag_list():
        _goods_cache.delete('tag:list')

    # ---------- media list & spu kind ----------

    @staticmethod
    def warm_media_list(spu_id: int):
        """预热 SPU 媒体列表缓存（含 alt_text、各尺寸 URL）。"""
        from apps.goods.models import ProductMedia
        media_qs = ProductMedia.objects.filter(spu_id=spu_id).order_by('sort_order', 'id')
        data = []
        for m in media_qs:
            item = {
                'id': m.id, 'media_type': m.media_type,
                'sort_order': m.sort_order, 'status': m.status,
                'alt_text': m.alt_text, 'file_size': m.file_size,
            }
            if m.media_type == 'image':
                item.update(thumb_url=m.thumb_url, list_url=m.list_url,
                            large_url=m.large_url, original_url=m.original_url)
            else:
                item.update(video_url=m.video_url, video_thumb_url=m.video_thumb_url,
                            video_list_url=m.video_list_url, video_large_url=m.video_large_url)
            data.append(item)
        _goods_cache.set(f'media:spu:{spu_id}', data, _ttl.get('MEDIA_LIST', 1800))

    @staticmethod
    def invalidate_media_list(spu_id: int):
        """失效 SPU 媒体列表缓存。"""
        _goods_cache.delete(f'media:spu:{spu_id}')

    @staticmethod
    def warm_spu_kind(spu_id: int):
        """预热 SPU 商品类型缓存。"""
        from apps.goods.models import SPU
        spu = SPU.objects.filter(id=spu_id).only('product_kind').first()
        if spu:
            _goods_cache.set(f'spu:{spu_id}:kind', spu.product_kind, _ttl.get('SPU_KIND', 3600))

    @staticmethod
    def invalidate_spu_kind(spu_id: int):
        """失效 SPU 商品类型缓存。"""
        _goods_cache.delete(f'spu:{spu_id}:kind')

    @staticmethod
    def get_spu_kind(spu_id: int) -> str | None:
        """获取 SPU 商品类型（cache-aside）。"""
        cached = _goods_cache.get(f'spu:{spu_id}:kind')
        if cached is not None:
            return cached
        GoodsCacheService.warm_spu_kind(spu_id)
        return _goods_cache.get(f'spu:{spu_id}:kind')

    # ---------- Bloom Filter ----------

    @staticmethod
    def warm_bloom_filters():
        """预热布隆过滤器 — 加载所有活跃 SPU/SKU ID"""
        from apps.goods.models import SPU, SKU, SPUStatus
        try:
            spu_ids = list(SPU.objects.filter(
                deleted_at__isnull=True,
            ).values_list('id', flat=True))
            if spu_ids:
                _spu_bloom.batch_add([f'spu:{spu_id}' for spu_id in spu_ids])

            sku_ids = list(SKU.objects.filter(
                spu__deleted_at__isnull=True,
            ).values_list('id', flat=True))
            if sku_ids:
                _sku_bloom.batch_add([f'sku:{sku_id}' for sku_id in sku_ids])
        except Exception:
            pass  # Redis 不可用时静默降级

    @staticmethod
    def add_spu_to_bloom(spu_id: int):
        _spu_bloom.add(f'spu:{spu_id}')

    @staticmethod
    def add_sku_to_bloom(sku_id: int):
        _sku_bloom.add(f'sku:{sku_id}')

    @staticmethod
    def spu_exists_in_bloom(spu_id: int) -> bool:
        return _spu_bloom.exists(f'spu:{spu_id}')

    @staticmethod
    def sku_exists_in_bloom(sku_id: int) -> bool:
        return _sku_bloom.exists(f'sku:{sku_id}')

    # ---------- helpers ----------

    @staticmethod
    def _build_category_tree(categories):
        """将扁平的分类列表转为嵌套树结构"""
        by_parent = {}
        for cat in categories:
            by_parent.setdefault(cat.parent_id, []).append({
                'id': cat.id,
                'name': cat.name,
                'parent_id': cat.parent_id,
                'level': cat.level,
                'is_active': cat.is_active,
                'children': [],
            })
        def attach(parents):
            for node in parents:
                node['children'] = by_parent.get(node['id'], [])
                attach(node['children'])
            return parents
        return attach(by_parent.get(None, []))


# ==================== 查询服务（cache-aside）====================

class GoodsQueryService:
    """商品数据读取 —— 先查缓存，miss 则查库并回填"""

    @staticmethod
    def get_category_tree():
        # 二级缓存（L1 LocMem → L2 Redis）：分类树读多写少，近缓存命中省 Redis 往返
        cached = _goods_cache.two_level_get('category:tree:active')
        if cached:
            return cached
        GoodsCacheService.warm_category_tree()
        return _goods_cache.two_level_get('category:tree:active', [])

    @staticmethod
    def get_brand_list():
        cached = _goods_cache.two_level_get('brand:list')
        if cached:
            return cached
        GoodsCacheService.warm_brand_list()
        return _goods_cache.two_level_get('brand:list', [])

    @staticmethod
    def get_spu_detail(spu_id: int):
        if spu_id <= 0:
            return None
        from apps.goods.models import SPU, SPUStatus
        # 布隆过滤器前置拦截：不存在的 ID 直接返回 None
        if not GoodsCacheService.spu_exists_in_bloom(spu_id):
            return None
        cached = _goods_cache.two_level_get(f'spu:{spu_id}')
        if cached is not None:
            spu = SPU.objects.filter(id=spu_id).only('id', 'category_id', 'brand_id').first()
            if spu:
                cached['promo_tags'] = GoodsQueryService.compute_promo_tags(
                    [{'id': spu.id, 'category_id': spu.category_id, 'brand_id': spu.brand_id}]
                ).get(spu_id, [])
            return cached
        spu = SPU.objects.filter(
            id=spu_id, deleted_at__isnull=True, status=SPUStatus.ON_SALE,
        ).select_related('brand', 'category').first()
        if not spu:
            return None
        from apps.goods.serializers import SPUDetailSerializer
        data = SPUDetailSerializer(spu).data
        # 补充规格定义和属性（从关联表读取）
        data['specs'] = spu.specs  # 已从 JSONField 获取
        if spu.spu_attributes.exists():
            data['attributes'] = [
                {'name': sa.attribute.name, 'value': sa.attribute_value.value}
                for sa in spu.spu_attributes.select_related('attribute', 'attribute_value')
            ]
        # 补充 SKU 列表（公开详情需要规格选择与加购）
        from apps.goods.serializers import SKUSimpleSerializer
        skus_qs = spu.skus.all().order_by('id')
        data['skus'] = SKUSimpleSerializer(skus_qs, many=True).data
        # 补充媒体列表（仅 active）
        media_qs = spu.media.filter(status='active').order_by('sort_order', 'id')
        data['media'] = [
            {
                'id': m.id,
                'media_type': m.media_type,
                'sort_order': m.sort_order,
                'status': m.status,
                'alt_text': m.alt_text or '',
                'thumb_url': m.thumb_url or '',
                'list_url': m.list_url or '',
                'large_url': m.large_url or '',
                'original_url': m.original_url or '',
                'video_url': m.video_url or '',
                'video_thumb_url': m.video_thumb_url or '',
                'video_list_url': m.video_list_url or '',
                'video_large_url': m.video_large_url or '',
            }
            for m in media_qs
        ]
        # 标签
        data['tags'] = [
            {'id': rel.tag_id, 'name': rel.tag.name}
            for rel in spu.tag_relations.select_related('tag').filter(tag__is_active=True)
        ]
        _goods_cache.two_level_set(f'spu:{spu_id}', data, _ttl['SPU_DETAIL'])
        data['promo_tags'] = GoodsQueryService.compute_promo_tags(
            [{'id': spu.id, 'category_id': spu.category_id, 'brand_id': spu.brand_id}]
        ).get(spu_id, [])
        return data

    @staticmethod
    def get_sku_detail(sku_id: int):
        if sku_id <= 0:
            return None
        # 布隆过滤器前置拦截
        if not GoodsCacheService.sku_exists_in_bloom(sku_id):
            return None
        cached = _goods_cache.two_level_get(f'sku:{sku_id}')
        if cached is not None:
            return cached
        from apps.goods.models import SKU, SPUStatus as _SPUStatus
        sku = SKU.objects.filter(id=sku_id).select_related('spu').first()
        if not sku:
            return None
        # 父 SPU 必须已上架且未删除
        if not sku.spu or sku.spu.deleted_at or sku.spu.status != _SPUStatus.ON_SALE:
            return None
        from apps.goods.serializers import SKUSimpleSerializer
        data = SKUSimpleSerializer(sku).data
        _goods_cache.two_level_set(f'sku:{sku_id}', data, _ttl['SKU_DETAIL'])
        return data

    @staticmethod
    def get_spu_list(page=1, size=20, status=None, category_id=None, brand_id=None):
        """Public SPU list with pagination and filters. Excludes suspended SPUs.
        
        🔥 Uses Redis caching with mutex lock (get_or_set_with_lock) to prevent
        cache penetration and avalanche.
        """
        from .models import SPU, SPUStatus, Category
        from django.db.models import Count

        # 构建缓存 key（按筛选条件区分）
        cache_key_parts = [
            f'spu:list:{status or "on_sale"}',
            f'p{page}:s{size}',
        ]
        if category_id:
            cache_key_parts.append(f'c{category_id}')
        if brand_id:
            cache_key_parts.append(f'b{brand_id}')
        cache_key = ':'.join(cache_key_parts)

        def _fetch():
            qs = SPU.objects.filter(
                deleted_at__isnull=True, status=SPUStatus.ON_SALE,
            ).select_related('brand', 'category')
            if status and status != 'on_sale':
                qs = SPU.objects.filter(
                    deleted_at__isnull=True,
                ).exclude(status=SPUStatus.SUSPENDED)
                if status:
                    qs = qs.filter(status=status)
            if category_id:
                # 包含当前分类及其所有子孙分类
                sub_ids = Category.get_all_subcategory_ids(category_id)
                qs = qs.filter(category_id__in=sub_ids)
            if brand_id:
                qs = qs.filter(brand_id=brand_id)

            total = qs.count()
            offset = (page - 1) * size
            spus = qs.annotate(sku_count=Count('skus')).order_by('-created_at')[offset:offset + size]
            # 批量获取所有 SKU 价格，避免 N+1
            spu_ids = [s.id for s in spus]
            from apps.goods.models import SKU
            from django.db.models import Min, Max
            sku_prices = {}
            if spu_ids:
                price_data = SKU.objects.filter(spu_id__in=spu_ids, shelf_status='on').values('spu_id').annotate(
                    min_price=Min('price'), max_price=Max('price')
                )
                for p in price_data:
                    sku_prices[p['spu_id']] = p

            results = []
            for spu in spus:
                prices = sku_prices.get(spu.id, {})
                results.append({
                    'id': spu.id,
                    'name': spu.name,
                    'main_image': spu.main_image,
                    'status': spu.status,
                    'brand_name': spu.brand.name if spu.brand_id else '',
                    'category_name': spu.category.name if spu.category_id else '',
                    'category_path': '',
                    'sku_count': spu.sku_count,
                    'min_price': str(prices.get('min_price', '')),
                    'max_price': str(prices.get('max_price', '')),
                    'created_at': spu.created_at.isoformat() if spu.created_at else '',
                })
            promo_map = GoodsQueryService.compute_promo_tags([
                {'id': s.id, 'category_id': s.category_id, 'brand_id': s.brand_id}
                for s in spus
            ])
            for r in results:
                r['promo_tags'] = promo_map.get(r['id'], [])
            return {'results': results, 'total': total, 'page': page, 'size': size}

        return _goods_cache.get_or_set_with_lock(
            cache_key,
            ttl=_ttl['SPU_LIST'],
            fetch_func=_fetch,
        )

    @staticmethod
    def get_hot_products(category_id: int = None):
        suffix = f':{category_id}' if category_id else ''
        key = f'hot:products{suffix}'
        cached = _goods_cache.get(key)
        if cached is not None:
            return cached
        GoodsCacheService.warm_hot_products(category_id)
        return _goods_cache.get(key, [])

    @staticmethod
    def get_spu_skus(spu_id: int):
        if spu_id <= 0:
            return []
        cached = _goods_cache.get(f'spu:{spu_id}:skus')
        if cached is not None:
            return cached
        from apps.goods.models import SKU
        skus = SKU.objects.filter(spu_id=spu_id)
        from apps.goods.serializers import SKUSimpleSerializer
        data = SKUSimpleSerializer(skus, many=True).data
        _goods_cache.set(f'spu:{spu_id}:skus', data, _ttl['SPU_DETAIL'])
        return data

    # ---------- 活动标签（promo_tags）----------

    @staticmethod
    def compute_promo_tags(items):
        """计算商品活动标签。
        items: [{'id': int, 'category_id': int|None, 'brand_id': int|None}]
        返回 {spu_id: [{'type':'primary'|'secondary','label':str}, ...]}
        - 活动价(primary): 在售 SKU 含 discount_price，或 SPU 命中生效期折扣活动
        - 可领券(secondary): 命中活动券 scope，或存在无 scope 的全场券
        """
        if not items:
            return {}
        spu_ids = [i['id'] for i in items]
        from apps.goods.models import SKU
        discount_spu_ids = set(SKU.objects.filter(
            spu_id__in=spu_ids, shelf_status='on', discount_price__isnull=False,
        ).values_list('spu_id', flat=True))
        activity_spu_ids = _get_active_activity_index()
        activity_hit = discount_spu_ids | (activity_spu_ids & set(spu_ids))
        cidx = _get_active_coupon_index()
        result = {}
        for it in items:
            tags = []
            if it['id'] in activity_hit:
                tags.append({'type': 'primary', 'label': '活动价'})
            if (cidx['global']
                    or it['id'] in cidx['spu']
                    or (it['category_id'] is not None and it['category_id'] in cidx['cat'])
                    or (it['brand_id'] is not None and it['brand_id'] in cidx['brand'])):
                tags.append({'type': 'secondary', 'label': '可领券'})
            if tags:
                result[it['id']] = tags
        return result

    @staticmethod
    def invalidate_promo_caches():
        """券/活动/折扣价变更后，刷新活动标签相关缓存。"""
        cache.delete('promo:coupon_index:v1')
        cache.delete('promo:activity_index:v1')
        GoodsCacheService.invalidate_spu_list()
        from utils.cache import Cache
        Cache('search').clear_by_prefix('srch:')


# ==================== 活动标签索引（模块级，短 TTL 缓存） ====================

_PROMO_INDEX_TTL = 60


def _get_active_coupon_index():
    """活动券 scope 索引（缓存 60s）。
    返回 {'spu': set, 'cat': set, 'brand': set, 'global': bool}
    global=True 表示存在无 scope 的全场券。
    """
    key = 'promo:coupon_index:v1'
    idx = cache.get(key)
    if idx is not None:
        return idx
    now = timezone.now()
    from apps.promotion.models import Coupon, CouponScope
    spu_set, cat_set, brand_set = set(), set(), set()
    global_coupon = False
    coupons = Coupon.objects.filter(
        is_active=True, start_time__lte=now, end_time__gte=now,
    ).prefetch_related('scopes')
    for c in coupons:
        scopes = list(c.scopes.all())
        if not scopes:
            global_coupon = True
            continue
        for s in scopes:
            if s.scope_type == CouponScope.ScopeType.SPU:
                spu_set.add(s.target_id)
            elif s.scope_type == CouponScope.ScopeType.CATEGORY:
                cat_set.add(s.target_id)
            elif s.scope_type == CouponScope.ScopeType.BRAND:
                brand_set.add(s.target_id)
    idx = {'spu': spu_set, 'cat': cat_set, 'brand': brand_set, 'global': global_coupon}
    cache.set(key, idx, _PROMO_INDEX_TTL)
    return idx


def _get_active_activity_index():
    """处于生效期的折扣活动所覆盖的 SPU id 集合（缓存 60s）。"""
    key = 'promo:activity_index:v1'
    idx = cache.get(key)
    if idx is not None:
        return idx
    now = timezone.now()
    from apps.promotion.models import DiscountActivity, ActivitySKURelation
    active_ids = list(DiscountActivity.objects.filter(
        start_time__lte=now, end_time__gte=now,
    ).values_list('id', flat=True))
    spu_ids = set()
    if active_ids:
        spu_ids = set(ActivitySKURelation.objects.filter(
            activity_id__in=active_ids,
        ).values_list('sku__spu_id', flat=True))
    cache.set(key, spu_ids, _PROMO_INDEX_TTL)
    return spu_ids


# ==================== SPU 状态缓存服务（Redis 前置缓存） ====================

class SPUStatusCache:
    """
    SPU 状态 Redis 前置缓存。
    
    设计目的：
    - Admin 状态变更（上架/下架/挂起/恢复）时，同步写入 Redis
    - 公开端 API 和管理端列表优先读取 Redis 缓存，实现即时响应
    - 避免"admin 改了状态但页面刷新不及时"的问题
    - TTL = 1小时，状态变更时刷新
    """

    STATUS_KEY_PREFIX = 'spu:status'
    TTL = 3600  # 1小时

    @classmethod
    def _key(cls, spu_id: int) -> str:
        return f'{cls.STATUS_KEY_PREFIX}:{spu_id}'

    @classmethod
    def set(cls, spu_id: int, status: str):
        """写入状态缓存（状态变更时调用）"""
        _goods_cache.set(f'status:{spu_id}', status, cls.TTL)

    @classmethod
    def get(cls, spu_id: int) -> str | None:
        """读取状态缓存，miss 返回 None"""
        return _goods_cache.get(f'status:{spu_id}')

    @classmethod
    def get_bulk(cls, spu_ids: list[int]) -> dict[int, str]:
        """批量读取状态缓存（管理端列表使用，pipeline 优化）"""
        if not spu_ids:
            return {}
        keys = [f'status:{spu_id}' for spu_id in spu_ids]
        raw = _goods_cache.get_many(keys)
        result = {}
        for key, val in raw.items():
            spu_id = int(key.split(':')[-1])
            result[spu_id] = val
        return result

    @classmethod
    def invalidate(cls, spu_id: int):
        """清除状态缓存"""
        _goods_cache.delete(f'status:{spu_id}')

    @classmethod
    def sync_from_db(cls, spu_id: int):
        """从数据库同步状态到 Redis（缓存 miss 时回填）"""
        from .models import SPU
        spu = SPU.objects.filter(id=spu_id, deleted_at__isnull=True).only('status').first()
        if spu:
            cls.set(spu_id, spu.status)
            return spu.status
        return None