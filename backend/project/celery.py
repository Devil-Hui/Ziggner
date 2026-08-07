import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# 服务入口默认 prod（fail-closed）；与 wsgi/asgi 共用 project.runtime_env。
from project.runtime_env import resolve_settings_module

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    resolve_settings_module(default='prod'),
)

# 创建 Celery 应用
app = Celery('backend')

# 使用 Django 的配置文件配置 Celery
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动发现任务
app.autodiscover_tasks()

# 定时任务配置
app.conf.beat_schedule = {
    'check-expired-notifications': {
        'task': 'notification.tasks.check_expired_notifications',
        'schedule': 3600.0,  # 每小时
    },
}