from django.apps import AppConfig


class LovegoodsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.lovegoods'

    def ready(self):
        import apps.lovegoods.signals  # noqa
