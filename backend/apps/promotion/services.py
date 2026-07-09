from decimal import Decimal

from django.db import transaction, models
from django.utils import timezone
from logging import getLogger

from utils.cache import Cache
from .models import Coupon, DiscountType, UserCoupon

_cache = Cache('promotion')
_logger = getLogger('biz')


def _coupon_to_dict(c: Coupon) -> dict:
    return {
        'id': c.id,
        'code': c.code,
        'discount_type': c.discount_type,
        'amount': float(c.amount),
        'min_amount': float(c.min_amount),
        'max_discount': float(c.max_discount) if c.max_discount else None,
        'total_count': c.total_count,
        'claimed_count': c.claimed_count,
        'remaining': c.total_count - c.claimed_count,
        'stackable': c.stackable,
        'start_time': c.start_time,
        'end_time': c.end_time,
        'is_active': c.is_active,
        'created_at': c.created_at,
    }


class PromotionService:

    @staticmethod
    def list_available():
        key = 'available'
        cached = _cache.get_json(key)
        if cached is not None:
            return cached
        coupons = [_coupon_to_dict(c) for c in Coupon.objects.filter(is_active=True).order_by('-created_at')]
        _cache.set_json(key, coupons, 300)
        return coupons

    @staticmethod
    def list_user_coupons(user, status=None):
        qs = UserCoupon.objects.filter(user=user).select_related('coupon')
        if status:
            qs = qs.filter(status=status)
        return qs

    @staticmethod
    @transaction.atomic
    def claim(user, code):
        coupon = Coupon.objects.select_for_update().filter(code=code).first()
        if not coupon:
            _logger.warning('Coupon claim fail: user_id=%s code=%s error=COUPON_NOT_FOUND', user.id, code)
            raise ValueError('COUPON_NOT_FOUND')
        if not coupon.is_available:
            _logger.warning('Coupon claim fail: user_id=%s code=%s error=COUPON_UNAVAILABLE', user.id, code)
            raise ValueError('COUPON_UNAVAILABLE')

        # 用 select_for_update 保证并发下 per_user_limit 检查与创建原子性
        user_count = UserCoupon.objects.select_for_update().filter(user=user, coupon=coupon).count()
        if user_count >= coupon.per_user_limit:
            _logger.warning(
                'Coupon claim fail: user_id=%s code=%s error=COUPON_LIMIT_REACHED limit=%d',
                user.id, code, coupon.per_user_limit
            )
            raise ValueError('COUPON_LIMIT_REACHED')

        UserCoupon.objects.create(user=user, coupon=coupon)
        # 🔥 修复：claimed_count 必须递增，且 update_fields 必须包含该字段
        coupon.claimed_count = models.F('claimed_count') + 1
        coupon.save(update_fields=['claimed_count'])
        _cache.delete('available')
        _logger.info(
            'Coupon claim success: user_id=%s code=%s coupon_id=%d claimed=%d',
            user.id, code, coupon.id, coupon.claimed_count + 1
        )

    @staticmethod
    @transaction.atomic
    def use(user, user_coupon_id, order_no):
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            pk=user_coupon_id, user=user, status='unused',
        ).first()
        if not uc:
            _logger.warning(
                'Coupon use fail: user_id=%s user_coupon_id=%d error=COUPON_INVALID',
                user.id, user_coupon_id
            )
            raise ValueError('COUPON_INVALID')
        if not uc.coupon.is_available:
            _logger.warning(
                'Coupon use fail: user_id=%s user_coupon_id=%d coupon_id=%d error=COUPON_EXPIRED',
                user.id, user_coupon_id, uc.coupon_id
            )
            raise ValueError('COUPON_EXPIRED')

        uc.status = 'used'
        uc.used_at = timezone.now()
        uc.used_order_no = order_no
        uc.save()

        Coupon.objects.filter(pk=uc.coupon_id).update(
            used_count=models.F('used_count') + 1,
        )
        _logger.info(
            'Coupon use success: user_id=%s user_coupon_id=%d coupon_id=%d order_no=%s',
            user.id, user_coupon_id, uc.coupon_id, order_no
        )

    @staticmethod
    def calc_discount(coupon, order_amount):
        if order_amount < coupon.min_amount:
            return Decimal('0')
        if coupon.discount_type == DiscountType.FIXED:
            return min(coupon.amount, order_amount)
        discount = order_amount * coupon.amount / Decimal('100')
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
        return discount

    @staticmethod
    @transaction.atomic
    def use_by_code(user, code, order_no):
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            user=user, coupon__code=code, status='unused',
        ).first()
        if not uc:
            raise ValueError('COUPON_INVALID')
        return PromotionService.use(user, uc.pk, order_no), uc
