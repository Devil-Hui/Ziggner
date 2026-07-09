import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# 设置默认的 Django settings 模块（优先 DJANGO_ENV，兼容 DEL_ENV，与 manage.py 保持一致）
os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'project.config.settings.{os.getenv("DJANGO_ENV") or os.getenv("DEL_ENV") or "dev"}')

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