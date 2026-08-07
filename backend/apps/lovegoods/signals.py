from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Favorite
from .services import invalidate_favorite_cache as invalidate_service_cache


@receiver([post_save, post_delete], sender=Favorite)
def invalidate_favorite_cache(sender, instance, **kwargs):
    invalidate_service_cache(instance.user_id, instance.spu_id)
