from django.apps import AppConfig


class RbacConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.rbac'
    verbose_name = '权限管理'

    def ready(self):
        from apps.rbac import signals  # noqa: F401  —— 注册缓存失效信号
