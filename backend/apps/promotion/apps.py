from django.apps import AppConfig


class PromotionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.promotion'

    def ready(self):
        import apps.promotion.signals  # noqa
