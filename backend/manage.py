#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# 必须在 Django 导入之前安装 PyMySQL 作为 MySQL 驱动
import pymysql
pymysql.install_as_MySQLdb()

from logging import getLogger

logger = getLogger(__name__)


def main():
    """Run administrative tasks."""

    # CLI 默认 local；服务入口（wsgi/asgi/celery）默认 prod。见 project.runtime_env。
    from project.runtime_env import resolve_django_env, resolve_settings_module

    env = resolve_django_env(default='local')
    logger.info(f'Using environment: {env}')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', resolve_settings_module(default='local'))

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
