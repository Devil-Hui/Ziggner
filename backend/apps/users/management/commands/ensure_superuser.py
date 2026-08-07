"""
从环境变量确保存在一个 Django 超级管理员（幂等）。

部署时由 setup.sh 在 migrate 之后、rbac_bootstrap 之前调用，
以便 rbac_bootstrap 能把该超管自动绑定为 superadmin 角色。

环境变量：
  DJANGO_SUPERUSER_USERNAME  (默认 "admin")
  DJANGO_SUPERUSER_EMAIL     (默认 "<username>@ziggner.com")
  DJANGO_SUPERUSER_PASSWORD  (必填；缺失则跳过并告警，不阻断启动)
  DJANGO_SUPERUSER_FORCE_PASSWORD (="1" 时强制用环境变量密码覆盖)

    python manage.py ensure_superuser
    python manage.py ensure_superuser --dry-run
"""
import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = '确保存在一个超级管理员（幂等，从环境变量读取凭据）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true', help='只报告将要执行的操作，不落库'
        )

    def handle(self, *args, **options):
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', f'{username}@ziggner.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

        if not password:
            self.stdout.write(
                self.style.WARNING(
                    '[SKIP] 未设置 DJANGO_SUPERUSER_PASSWORD，跳过超级管理员创建。'
                )
            )
            return

        if options['dry_run']:
            exists = User.objects.filter(username=username).exists()
            self.stdout.write(
                f'[dry-run] 超级管理员 "{username}" {"已存在" if exists else "将被创建"}'
            )
            return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_superuser': True, 'is_staff': True},
        )
        if created:
            user.set_password(password)
            user.email = email
            user.is_superuser = True
            user.is_staff = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'超级管理员已创建: {username}'))
            return

        # 已存在：保证其为超管（幂等修复）；仅当显式要求时覆盖密码
        changed = False
        if not user.is_superuser or not user.is_staff:
            user.is_superuser = True
            user.is_staff = True
            changed = True
        if os.getenv('DJANGO_SUPERUSER_FORCE_PASSWORD') == '1':
            user.set_password(password)
            changed = True
        if changed:
            user.save()
        self.stdout.write(
            self.style.SUCCESS(f'超级管理员已存在: {username}（已确保为超管）')
        )
