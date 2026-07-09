from django.db import transaction, models
from utils.cache import Cache
from .models import Review

_cache = Cache('review')


def _review_to_dict(r: Review) -> dict:
    return {
        'id': r.id,
        'user_id': r.user_id,
        'spu_id': r.spu_id,
        'order_item_id': r.order_item_id,
        'rating': r.rating,
        'content': r.content,
        'images': r.images,
        'is_anonymous': r.is_anonymous,
        'is_active': r.is_active,
        'user': {
            'username': r.user.username,
        },
        'created_at': r.created_at,
        'updated_at': r.updated_at,
    }


class ReviewService:

    @staticmethod
    def _invalidate(spu_id):
        _cache.delete(f'spu:{spu_id}:list')
        _cache.delete(f'spu:{spu_id}:stats')

    @staticmethod
    def get_spu_stats(spu_id):
        key = f'spu:{spu_id}:stats'
        cached = _cache.get(key)
        if cached is not None:
            return cached
        stats = Review.objects.filter(spu_id=spu_id, is_active=True).aggregate(
            count=models.Count('id'),
            avg_rating=models.Avg('rating'),
        )
        data = {
            'count': stats['count'] or 0,
            'avg_rating': float(stats['avg_rating'] or 0),
        }
        _cache.set(key, data, 300)
        return data

    @staticmethod
    def get_reviewable_items(user, spu_id):
        """返回用户已购买（已签收/已完成）但未评价的订单项"""
        from apps.order.models import OrderItem, OrderStatus
        reviewed_ids = Review.objects.filter(
            user=user, is_active=True,
        ).values_list('order_item_id', flat=True)
        items = OrderItem.objects.select_related('order').filter(
            order__user=user,
            sku__spu_id=spu_id,
            order__status__in=(OrderStatus.DELIVERED, OrderStatus.COMPLETED),
        ).exclude(id__in=reviewed_ids).order_by('-order__created_at')
        return [
            {'id': item.id, 'order_no': item.order.order_no, 'product_name': item.spu_name}
            for item in items
        ]

    @staticmethod
    @transaction.atomic
    def create(user, spu_id, rating, content='', images=None, order_item_id=None,
               is_anonymous=False):
        # 校验已购买：订单项属于用户、SPU 匹配、订单已签收
        from apps.order.models import OrderItem, OrderStatus
        order_item = OrderItem.objects.select_related('order').filter(
            pk=order_item_id, order__user=user, sku__spu_id=spu_id,
        ).first()
        if not order_item:
            raise ValueError('NOT_PURCHASED')
        if order_item.order.status not in (OrderStatus.DELIVERED, OrderStatus.COMPLETED):
            raise ValueError('ORDER_NOT_DELIVERED')

        # 使用 get_or_create 利用数据库 unique_together 约束防止并发重复评价
        review, created = Review.objects.get_or_create(
            user=user,
            order_item_id=order_item_id,
            defaults={
                'spu_id': spu_id,
                'rating': rating,
                'content': content,
                'images': images or [],
                'is_anonymous': is_anonymous,
            },
        )
        if not created:
            raise ValueError('ALREADY_REVIEWED')
        ReviewService._invalidate(spu_id)
        return review

    @staticmethod
    def list_by_spu(spu_id, page=1, per_page=20):
        cache_key = f'spu:{spu_id}:list:{page}'
        cached = _cache.get_json(cache_key)
        if cached is not None:
            return cached['results'], cached['total']

        qs = Review.objects.filter(spu_id=spu_id, is_active=True).select_related('user')
        total = qs.count()
        results = [_review_to_dict(r) for r in qs[(page - 1) * per_page:page * per_page]]
        data = {'results': results, 'total': total}
        _cache.set_json(cache_key, data, 300)
        return results, total

    @staticmethod
    def list_by_user(user, page=1, per_page=20):
        key = f'user:{user.id}:{page}'
        cached = _cache.get_json(key)
        if cached is not None:
            return cached['results'], cached['total']
        qs = Review.objects.filter(user=user).select_related('spu', 'user')
        total = qs.count()
        results = [_review_to_dict(r) for r in qs[(page - 1) * per_page:page * per_page]]
        data = {'results': results, 'total': total}
        _cache.set_json(key, data, 300)
        return results, total

    @staticmethod
    def invalidate_user_cache(user):
        _cache.delete(f'user:{user.id}')

    @staticmethod
    def update(user, review_id, **kwargs):
        review = Review.objects.filter(user=user, pk=review_id).first()
        if not review:
            raise ValueError('REVIEW_NOT_FOUND')
        # 去掉微秒再比较，避免创建时 auto_now / auto_now_add 的微秒差异误判
        if review.updated_at.replace(microsecond=0) > review.created_at.replace(microsecond=0):
            raise ValueError('ALREADY_EDITED')
        # 🔒 字段白名单：防止批量赋值攻击
        allowed = {'rating', 'content', 'images', 'is_anonymous'}
        for k, v in kwargs.items():
            if v is not None and k in allowed:
                setattr(review, k, v)
        review.save()
        return review

    @staticmethod
    @transaction.atomic
    def delete(user, review_id):
        """软删除评价（仅作者可删）"""
        review = Review.objects.filter(user=user, pk=review_id, is_active=True).first()
        if not review:
            raise ValueError('REVIEW_NOT_FOUND')
        review.is_active = False
        review.save()
        ReviewService._invalidate(review.spu_id)
        # 同时隐藏该评价的所有回复
        review.replies.filter(is_active=True).update(is_active=False)
        return True

    @staticmethod
    @transaction.atomic
    def create_reply(user, parent_id, rating, content='', images=None, is_anonymous=False):
        """回复评价（商家或用户）"""
        parent = Review.objects.filter(pk=parent_id, is_active=True).first()
        if not parent:
            raise ValueError('REVIEW_NOT_FOUND')
        # 不能回复自己的评价
        if parent.user == user:
            raise ValueError('CANNOT_REPLY_SELF')
        # 回复不需要 order_item_id，也不需要购买校验
        reply = Review.objects.create(
            user=user,
            spu=parent.spu,
            parent=parent,
            rating=rating,
            content=content,
            images=images or [],
            is_anonymous=is_anonymous,
        )
        ReviewService._invalidate(parent.spu_id)
        return reply
