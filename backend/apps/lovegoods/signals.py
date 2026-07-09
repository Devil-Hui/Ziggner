from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from utils.cache import Cache
from .models import Favorite

_cache = Cache('lovegoods')


@receiver([post_save, post_delete], sender=Favorite)
def invalidate_favorite_cache(sender, instance, **kwargs):
    _cache.clear_by_prefix(f'list:{instance.user_id}')
    _cache.delete(f'check:{instance.user_id}:{instance.spu_id}')
