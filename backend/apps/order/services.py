from decimal import Decimal

from django.conf import settings
from django.db import transaction, models
from django.utils import timezone
from logging import getLogger

from apps.cart.models import CartItem
from apps.goods.models import SKU
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
                 user_coupon_id=None, coupon_code='', idempotency_key=None):
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
            idem_key = f'idempotent:{user.id}:{idempotency_key}'
            type(user).objects.select_for_update().get(pk=user.pk)
            existing_order = Order.objects.filter(
                user=user,
                checkout_idempotency_key=idempotency_key,
            ).first()
            if existing_order is not None:
                _cache.set(idem_key, existing_order.order_no, 300)
                return existing_order
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
            total = Decimal('0.00')

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

                unit_price = sku.discount_price if sku.discount_price is not None else sku.price
                subtotal = unit_price * cart_item.quantity
                total += subtotal

                order_items_data.append({
                    'sku': sku,
                    'spu_name': spu.name,
                    'sku_code': sku.sku_code,
                    'spec_snapshot': spec_snapshot,
                    'price': unit_price,
                    'quantity': cart_item.quantity,
                    'subtotal': subtotal,
                    'has_activity': sku.discount_price is not None,
                })

            # 优惠券抵扣（先校验 + 锁券）
            from apps.promotion.services import PromotionService
            applied_uc, discount = PromotionService.prepare_discount(
                user,
                user_coupon_id=user_coupon_id,
                coupon_code=coupon_code,
                items=order_items_data,
            )

            # 创建订单
            actual = max(Decimal('0.00'), total - discount)
            coupon_snapshot = {}
            if applied_uc:
                coupon_snapshot = {
                    'user_coupon_id': applied_uc.id,
                    'coupon_id': applied_uc.coupon_id,
                    'code': applied_uc.coupon.code,
                    'discount_type': applied_uc.coupon.discount_type,
                    'amount': str(applied_uc.coupon.amount),
                    'discount_amount': str(discount),
                    'stackable': applied_uc.coupon.stackable,
                }
            order = Order.objects.create(
                user=user,
                total_amount=total,
                actual_amount=actual,
                discount_amount=discount,
                user_coupon=applied_uc,
                coupon_snapshot=coupon_snapshot,
                payment_deadline=timezone.now() + timezone.timedelta(minutes=15),
                checkout_idempotency_key=idempotency_key,
                currency=getattr(settings, 'DEFAULT_CURRENCY', 'USD'),
                shipping_name=shipping_name,
                shipping_phone=shipping_phone,
                shipping_address=shipping_address,
                payment_method=payment_method,
                buyer_remark=buyer_remark,
            )

            # 创建订单项 + 扣减库存
            for data in order_items_data:
                item_data = {key: value for key, value in data.items() if key != 'has_activity'}
                OrderItem.objects.create(order=order, **item_data)
                data['sku'].stock = models.F('stock') - data['quantity']
                data['sku'].save(update_fields=['stock'])

            # 清空购物车已结算项
            CartItem.objects.filter(
                cart__user=user, pk__in=cart_item_ids
            ).delete()

            if applied_uc:
                PromotionService.lock(user, applied_uc.id, order.order_no)

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
        version = _cache.get(f'list-version:{user.id}', 'initial')
        cache_key = (
            f'list:{user.id}:{version}:{status or "all"}:'
            f'{payment_status or "all"}:{page}:{per_page}'
        )
        cached = _cache.get_json(cache_key)
        if cached is not None:
            return cached['results'], cached['total']

        # 列表只需要 item 数量，用 Count annotate，避免 prefetch 全量 OrderItem。
        qs = Order.objects.filter(user=user).annotate(
            _item_count=models.Count('items'),
        )
        if status:
            qs = qs.filter(status=status)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        total = qs.count()
        orders = qs[(page - 1) * per_page:page * per_page]
        results = []
        for o in orders:
            d = _order_to_dict(o)
            d['_item_count'] = o._item_count
            results.append(d)

        _cache.set_json(cache_key, {'results': results, 'total': total}, _ttl['ORDER_LIST'])
        return results, total

    @staticmethod
    def get_order_detail(user, order_no):
        order = Order.objects.filter(user=user, order_no=order_no).prefetch_related(
            models.Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('sku__spu'),
            ),
            'after_sales',
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
