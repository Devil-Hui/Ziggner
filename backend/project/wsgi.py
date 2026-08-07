"""
WSGI config for project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# 服务入口默认 prod（fail-closed）；Docker/CI 必须显式设 DJANGO_ENV。
from project.runtime_env import resolve_settings_module

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    resolve_settings_module(default='prod'),
)

application = get_wsgi_application()
