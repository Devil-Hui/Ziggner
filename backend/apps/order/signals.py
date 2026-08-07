from functools import partial
from uuid import uuid4

from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from utils.cache import Cache
from .models import Order, OrderItem, AfterSale

_cache = Cache('order')


def _invalidate_user_list(user_id):
    _cache.set(f'list-version:{user_id}', uuid4().hex, 3600)


def _invalidate_after_commit(user_id, order_no):
    transaction.on_commit(partial(_invalidate_user_list, user_id))
    transaction.on_commit(partial(_cache.delete, f'detail:{order_no}'))


@receiver([post_save, post_delete], sender=Order)
def invalidate_order_cache(sender, instance, **kwargs):
    _invalidate_after_commit(instance.user_id, instance.order_no)


@receiver([post_save, post_delete], sender=OrderItem)
def invalidate_order_on_item_change(sender, instance, **kwargs):
    _invalidate_after_commit(instance.order.user_id, instance.order.order_no)


@receiver([post_save, post_delete], sender=AfterSale)
def invalidate_order_on_aftersale_change(sender, instance, **kwargs):
    transaction.on_commit(partial(_cache.delete, f'detail:{instance.order.order_no}'))
