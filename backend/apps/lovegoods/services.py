from django.db import transaction
from uuid import uuid4

from utils.cache import Cache
from .models import Favorite

_cache = Cache('lovegoods')


def _list_version(user_id):
    return _cache.get(f'list-version:{user_id}', 'initial')


def invalidate_favorite_cache(user_id, spu_id=None):
    _cache.set(f'list-version:{user_id}', uuid4().hex, 3600)
    if spu_id is not None:
        _cache.delete(f'check:{user_id}:{spu_id}')


def _favorite_to_dict(fav: Favorite) -> dict:
    """将 Favorite 模型对象转为字典（保留 datetime，set_json 自动序列化）。

    注意：SKU.is_active 是 property，会再读 spu.is_active，列表路径用
    shelf_status + stock 过滤，避免依赖 property 语义变化。
    """
    spu = fav.spu
    skus = [
        s for s in spu.skus.all()
        if s.shelf_status == 'on' and s.stock > 0
    ]
    min_price = float(min(s.price for s in skus)) if skus else None
    return {
        'id': fav.id,
        'spu_id': fav.spu_id,
        'spu': {
            'name': spu.name,
            'main_image': spu.main_image,
            'skus': [
                {
                    'price': float(s.price),
                    'is_active': s.shelf_status == 'on' and s.stock > 0,
                }
                for s in skus
            ],
        },
        'min_price': min_price,
        'created_at': fav.created_at,
    }


class FavoriteService:

    MAX_FAVORITES = 200

    @staticmethod
    @transaction.atomic
    def toggle(user, spu_id):
        fav = Favorite.objects.filter(user=user, spu_id=spu_id).first()
        if fav:
            fav.delete()
            invalidate_favorite_cache(user.id, spu_id)
            return False
        # 锁定用户收藏行防止并发超限
        existing_count = Favorite.objects.select_for_update().filter(user=user).count()
        if existing_count >= FavoriteService.MAX_FAVORITES:
            raise ValueError('FAVORITES_LIMIT_REACHED')
        Favorite.objects.create(user=user, spu_id=spu_id)
        invalidate_favorite_cache(user.id, spu_id)
        return True

    @staticmethod
    def is_favorited(user, spu_id):
        key = f'check:{user.id}:{spu_id}'
        cached = _cache.get(key)
        if cached is not None:
            return cached
        result = Favorite.objects.filter(user=user, spu_id=spu_id).exists()
        _cache.set(key, result, 300)
        return result

    @staticmethod
    def list_by_user(user, page=1, per_page=20):
        version = _list_version(user.id)
        key = f'list:{user.id}:{version}:{page}:{per_page}'
        cached = _cache.get_json(key)
        if cached is not None:
            return cached['results'], cached['total']
        qs = Favorite.objects.filter(user=user).select_related(
            'spu__brand', 'spu__category'
        ).prefetch_related('spu__skus')
        total = qs.count()
        page_favs = list(qs[(page - 1) * per_page:page * per_page])
        # 注：spu.skus 已通过 prefetch_related('spu__skus') 预取，
        # _favorite_to_dict 内部直接遍历 spu.skus.all() 即可，无需额外查询。
        results = [_favorite_to_dict(fav) for fav in page_favs]
        data = {'results': results, 'total': total}
        _cache.set_json(key, data, 300)
        return results, total
