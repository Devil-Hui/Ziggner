from django.db import transaction
from django.core.exceptions import ValidationError
from utils.cache import Cache
from .models import Cart, CartItem

_cache = Cache('cart')


class CartService:

    MAX_ITEMS = 100

    @staticmethod
    def get_or_create_cart(user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    @staticmethod
    def get_cart_with_items(user):
        """获取购物车（含预加载关联数据）"""
        cart = CartService.get_or_create_cart(user)
        return Cart.objects.prefetch_related(
            'items__sku__spu',
            'items__sku__sku_spec_values__spec_value__spec_name',
        ).get(pk=cart.pk)

    @staticmethod
    def _invalidate_cache(user):
        _cache.delete(f'items:{user.id}')

    @staticmethod
    @transaction.atomic
    def add_item(user, sku_id, quantity=1):
        from apps.goods.models import SKU
        sku = SKU.objects.select_related('spu').filter(pk=sku_id).first()
        if not sku or not sku.is_active:
            raise ValueError('SKU_NOT_FOUND')
        if not sku.spu.is_active:
            raise ValueError('SPU_NOT_ACTIVE')
        if sku.stock < quantity:
            raise ValueError('INSUFFICIENT_STOCK')

        cart = CartService.get_or_create_cart(user)
        item, created = CartItem.objects.get_or_create(
            cart=cart, sku=sku,
            defaults={'quantity': quantity},
        )
        if not created:
            item.quantity += quantity
            if item.quantity > sku.stock:
                raise ValueError('INSUFFICIENT_STOCK')
            item.save(update_fields=['quantity'])
        else:
            # 新增项才检查上限（更新已有数量不检查）
            if CartItem.objects.filter(cart=cart).count() > CartService.MAX_ITEMS:
                item.delete()
                raise ValueError('CART_FULL')
        CartService._invalidate_cache(user)
        return item

    @staticmethod
    @transaction.atomic
    def update_quantity(user, item_id, quantity):
        cart = CartService.get_or_create_cart(user)
        item = CartItem.objects.filter(pk=item_id, cart=cart).select_related('sku').first()
        if not item:
            raise ValueError('ITEM_NOT_FOUND')
        if quantity <= 0:
            item.delete()
            CartService._invalidate_cache(user)
            return None
        if quantity > item.sku.stock:
            raise ValueError('INSUFFICIENT_STOCK')
        item.quantity = quantity
        item.save(update_fields=['quantity'])
        CartService._invalidate_cache(user)
        return item

    @staticmethod
    def remove_item(user, item_id):
        cart = CartService.get_or_create_cart(user)
        deleted, _ = CartItem.objects.filter(pk=item_id, cart=cart).delete()
        if not deleted:
            raise ValueError('ITEM_NOT_FOUND')
        CartService._invalidate_cache(user)

    @staticmethod
    @transaction.atomic
    def set_selected(user, item_ids):
        cart = CartService.get_or_create_cart(user)
        CartItem.objects.filter(cart=cart, pk__in=item_ids).update(selected=True)
        CartItem.objects.filter(cart=cart).exclude(pk__in=item_ids).update(selected=False)
        CartService._invalidate_cache(user)

    @staticmethod
    @transaction.atomic
    def clear_selected(user):
        cart = CartService.get_or_create_cart(user)
        CartItem.objects.filter(cart=cart, selected=True).delete()
        CartService._invalidate_cache(user)

    @staticmethod
    @transaction.atomic
    def clear_all(user):
        """清空用户购物车中所有项"""
        cart = CartService.get_or_create_cart(user)
        CartItem.objects.filter(cart=cart).delete()
        CartService._invalidate_cache(user)
