from django.conf import settings
from django.db import transaction, models
from django.utils import timezone
from logging import getLogger

from apps.cart.models import CartItem
from apps.goods.models import SKU
from apps.promotion.models import Coupon
from utils.cache import Cache
from .models import Order, OrderItem, OrderStatus, AfterSale

_cache = Cache('order')
_ttl = settings.ORDER_CACHE_TTL
_logger = getLogger('biz')


def _order_to_dict(order) -> dict:
    """仅缓存查询用字段（保留 datetime，set_json 自动序列化）"""
    return {
        'id': order.id,
        'order_no': order.order_no,
        'user_id': order.user_id,
        'status': order.status,
        'total_amount': float(order.total_amount),
        'actual_amount': float(order.actual_amount),
        'shipping_name': order.shipping_name,
        'shipping_phone': order.shipping_phone,
        'shipping_address': order.shipping_address,
        'payment_method': order.payment_method,
        'payment_status': order.payment_status,
        'payment_no': order.payment_no,
        'paid_at': order.paid_at,
        'tracking_no': order.tracking_no,
        'shipped_at': order.shipped_at,
        'delivered_at': order.delivered_at,
        'completed_at': order.completed_at,
        'cancelled_at': order.cancelled_at,
        'cancel_reason': order.cancel_reason,
        'buyer_remark': order.buyer_remark,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
    }


class OrderService:

    # ==================== 下单 ====================

    @staticmethod
    @transaction.atomic
    def checkout(user, cart_item_ids, shipping_name, shipping_phone,
                 shipping_address, payment_method='', buyer_remark='',
                 coupon_code='', idempotency_key=None):
        """
        从购物车结算，创建订单。
        
        设计要点（初创电商防脏数据）：
        - 事务包裹：SKU 扣库、购物车清空、优惠券使用必须原子化
        - SKU 行锁 (select_for_update)：防止并发超卖
        - 幂等键 (idempotency_key)：防止网络重试产生重复订单
        - 同步库存扣减：库存属于强一致性资源，必须同步完成
        """
        # ===== 0. 幂等性检查 =====
        if idempotency_key:
            idem_key = f'idempotent:{idempotency_key}'
            if _cache.get(idem_key):
                _logger.warning(
                    'Order checkout duplicate: user_id=%s idempotency_key=%s',
                    user.id, idempotency_key
                )
                raise ValueError('DUPLICATE_ORDER')
            _cache.set(idem_key, 'processing', 300)  # 5 分钟临时标记

        _logger.info(
            'Order checkout start: user_id=%s cart_items=%s coupon=%s idem=%s',
            user.id, cart_item_ids, coupon_code, idempotency_key
        )

        try:
            # ===== 1. 锁定购物车项 =====
            items = CartItem.objects.select_related('sku__spu').filter(
                cart__user=user,
                pk__in=cart_item_ids,
                selected=True,
            ).select_for_update(of=('self',))

            if not items:
                _logger.warning('Order checkout fail: user_id=%s error=NO_ITEMS_SELECTED', user.id)
                raise ValueError('NO_ITEMS_SELECTED')

            # ===== 2. 🔥 锁定 SKU 行（防止并发超卖） =====
            sku_ids = [item.sku_id for item in items]
            locked_skus = {
                s.id: s
                for s in SKU.objects.select_for_update().filter(id__in=sku_ids)
            }

            order_items_data = []
            total = 0

            # ===== 3. 使用加锁后的 SKU 数据校验库存 =====
            for cart_item in items:
                sku = locked_skus.get(cart_item.sku_id)
                spu = cart_item.sku.spu

                if not sku:
                    _logger.warning(
                        'Order checkout fail: user_id=%s sku_id=%s error=SKU_NOT_FOUND',
                        user.id, cart_item.sku_id
                    )
                    raise ValueError(f'SKU_NOT_FOUND:{cart_item.sku_id}')
                if not sku.is_active or not spu.is_active:
                    _logger.warning(
                        'Order checkout fail: user_id=%s sku_id=%s sku_code=%s error=SKU_NOT_AVAILABLE',
                        user.id, sku.id, sku.sku_code
                    )
                    raise ValueError(f'SKU_NOT_AVAILABLE:{sku.sku_code}')
                if cart_item.quantity > sku.stock:
                    _logger.warning(
                        'Order checkout fail: user_id=%s sku_id=%s sku_code=%s '
                        'need=%d stock=%d error=INSUFFICIENT_STOCK',
                        user.id, sku.id, sku.sku_code, cart_item.quantity, sku.stock
                    )
                    raise ValueError(f'INSUFFICIENT_STOCK:{sku.sku_code}')

                # 构建规格快照
                spec_snapshot = [
                    {'spec_name': sv.spec_value.spec_name.name, 'spec_value': sv.spec_value.value}
                    for sv in sku.sku_spec_values.select_related('spec_value__spec_name').all()
                ]

                subtotal = sku.price * cart_item.quantity
                total += subtotal

                order_items_data.append({
                    'sku': sku,
                    'spu_name': spu.name,
                    'sku_code': sku.sku_code,
                    'spec_snapshot': spec_snapshot,
                    'price': sku.price,
                    'quantity': cart_item.quantity,
                    'subtotal': subtotal,
                })

            # 优惠券抵扣（先校验 + 锁券）
            discount = 0
            applied_uc = None
            if coupon_code:
                from apps.promotion.services import PromotionService
                from apps.promotion.models import UserCoupon
                uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
                    user=user, coupon__code=coupon_code, status='unused',
                ).first()
                if uc and uc.coupon.is_available:
                    discount = float(PromotionService.calc_discount(uc.coupon, total))
                    applied_uc = uc

            # 创建订单
            actual = max(0, float(total) - discount)
            order = Order.objects.create(
                user=user,
                total_amount=total,
                actual_amount=actual,
                currency=getattr(settings, 'DEFAULT_CURRENCY', 'USD'),
                shipping_name=shipping_name,
                shipping_phone=shipping_phone,
                shipping_address=shipping_address,
                payment_method=payment_method,
                buyer_remark=buyer_remark,
            )

            # 创建订单项 + 扣减库存
            for data in order_items_data:
                OrderItem.objects.create(order=order, **data)
                data['sku'].stock = models.F('stock') - data['quantity']
                data['sku'].save(update_fields=['stock'])

            # 清空购物车已结算项
            CartItem.objects.filter(
                cart__user=user, pk__in=cart_item_ids
            ).delete()

            # 标记优惠券已使用
            if applied_uc:
                applied_uc.status = 'used'
                applied_uc.used_at = timezone.now()
                applied_uc.used_order_no = order.order_no
                applied_uc.save(update_fields=['status', 'used_at', 'used_order_no'])
                Coupon.objects.filter(pk=applied_uc.coupon_id).update(
                    used_count=models.F('used_count') + 1,
                )

            # ===== 幂等键更新为 order_no（成功后返回订单号，可复用） =====
            if idempotency_key:
                _cache.set(idem_key, order.order_no, 300)

            _logger.info(
                'Order checkout success: user_id=%s order_no=%s total=%.2f actual=%.2f '
                'discount=%.2f items=%d coupon=%s',
                user.id, order.order_no, float(total), actual, discount,
                len(order_items_data), coupon_code or 'none'
            )
            return order

        except Exception:
            # 清理幂等键，允许用户重试
            if idempotency_key:
                _cache.delete(idem_key)
                _logger.info(
                    'Order checkout fail: cleared idempotent key user_id=%s key=%s',
                    user.id, idempotency_key
                )
            raise

    # ==================== 查询 ====================

    @staticmethod
    def get_order_list(user, status=None, page=1, per_page=20, payment_status=None):
        cache_key = f'list:{user.id}:{status or "all"}:{payment_status or "all"}:{page}'
        cached = _cache.get_json(cache_key)
        if cached is not None:
            return cached['results'], cached['total']

        qs = Order.objects.filter(user=user).prefetch_related('items')
        if status:
            qs = qs.filter(status=status)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        total = qs.count()
        orders = qs[(page - 1) * per_page:page * per_page]
        results = []
        for o in orders:
            d = _order_to_dict(o)
            d['_item_count'] = len(list(o.items.all()))
            results.append(d)

        _cache.set_json(cache_key, {'results': results, 'total': total}, _ttl['ORDER_LIST'])
        return results, total

    @staticmethod
    def get_order_detail(user, order_no):
        order = Order.objects.filter(user=user, order_no=order_no).prefetch_related(
            'items', 'after_sales',
        ).first()
        return order

    # ==================== 操作 ====================

    @staticmethod
    @transaction.atomic
    def cancel_order(user, order_no, reason=''):
        order = Order.objects.select_for_update().filter(
            user=user, order_no=order_no,
        ).first()
        if not order:
            raise ValueError('ORDER_NOT_FOUND')
        order.cancel(reason)

    @staticmethod
    @transaction.atomic
    def confirm_delivered(user, order_no):
        order = Order.objects.select_for_update().filter(
            user=user, order_no=order_no,
        ).first()
        if not order:
            raise ValueError('ORDER_NOT_FOUND')
        order.deliver()

    # ==================== 售后 ====================

    @staticmethod
    @transaction.atomic
    def apply_after_sale(user, order_no, after_sale_type, reason, amount, evidence=None):
        order = Order.objects.select_for_update().filter(
            user=user, order_no=order_no,
        ).first()
        if not order:
            raise ValueError('ORDER_NOT_FOUND')
        if order.status not in (OrderStatus.DELIVERED, OrderStatus.COMPLETED):
            raise ValueError('ORDER_CANNOT_AFTER_SALE')
        if amount > order.actual_amount:
            raise ValueError('AFTER_SALE_AMOUNT_EXCEEDED')

        return AfterSale.objects.create(
            order=order,
            type=after_sale_type,
            reason=reason,
            amount=amount,
            evidence=evidence or [],
        )

    @staticmethod
    def get_after_sale(user, order_no):
        order = Order.objects.filter(user=user, order_no=order_no).first()
        if not order:
            raise ValueError('ORDER_NOT_FOUND')
        return order.after_sales.first()
