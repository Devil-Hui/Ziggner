from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Coupon
from utils.cache import Cache

_cache = Cache('promotion')


@receiver([post_save, post_delete], sender=Coupon)
def invalidate_coupon_cache(sender, instance, **kwargs):
    _cache.delete('available')
