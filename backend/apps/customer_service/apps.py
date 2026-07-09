from django.apps import AppConfig


class CustomerServiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.customer_service'
    verbose_name = '客服系统'

    def ready(self):
        import apps.customer_service.signals  # noqa: F401
