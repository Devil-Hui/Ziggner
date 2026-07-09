from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from utils.cache import Cache
from .models import Order, OrderItem, AfterSale

_cache = Cache('order')


@receiver([post_save, post_delete], sender=Order)
def invalidate_order_cache(sender, instance, **kwargs):
    _cache.clear_by_prefix(f'list:{instance.user_id}')
    _cache.delete(f'detail:{instance.order_no}')


@receiver([post_save, post_delete], sender=OrderItem)
def invalidate_order_on_item_change(sender, instance, **kwargs):
    _cache.delete(f'detail:{instance.order.order_no}')
    _cache.clear_by_prefix(f'list:{instance.order.user_id}')


@receiver([post_save, post_delete], sender=AfterSale)
def invalidate_order_on_aftersale_change(sender, instance, **kwargs):
    _cache.delete(f'detail:{instance.order.order_no}')
