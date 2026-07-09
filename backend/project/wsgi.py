"""
WSGI config for project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# 获取环境变量（优先使用 DJANGO_ENV，兼容 DEL_ENV，与 manage.py 保持一致）
env = os.getenv("DJANGO_ENV") or os.getenv("DEL_ENV") or "dev"

os.environ.setdefault("DJANGO_SETTINGS_MODULE", f'project.config.settings.{env}')

application = get_wsgi_application()
