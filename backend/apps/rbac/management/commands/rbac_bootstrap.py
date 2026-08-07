"""
初始化角色权限矩阵，并把 Django 超级用户登记为 superadmin 角色。

幂等：只补缺失项，绝不删除已有授权 —— 否则会把 superadmin 在界面上的调整冲掉。
部署时由 setup.sh 在 migrate 之后调用。

    python manage.py rbac_bootstrap
    python manage.py rbac_bootstrap --dry-run
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.rbac.constants import DEFAULT_ROLE_PERMS, Role
from apps.rbac.models import RolePermission, UserRole
from apps.rbac.services import invalidate_all


class Command(BaseCommand):
    help = '初始化 RBAC 角色权限矩阵与超管角色（幂等）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true', help='只报告将要写入的内容，不落库'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        existing = set(RolePermission.objects.values_list('role', 'perm_code'))
        missing = [
            RolePermission(role=role, perm_code=code)
            for role, codes in DEFAULT_ROLE_PERMS.items()
            for code in sorted(codes)
            if (role, code) not in existing
        ]

        superuser_ids = list(
            User.objects.filter(is_superuser=True).values_list('id', flat=True)
        )
        already_superadmin = set(
            UserRole.objects.filter(
                role=Role.SUPERADMIN.value, user_id__in=superuser_ids
            ).values_list('user_id', flat=True)
        )
        new_roles = [
            UserRole(user_id=uid, role=Role.SUPERADMIN.value)
            for uid in superuser_ids
            if uid not in already_superadmin
        ]

        if dry_run:
            self.stdout.write(
                f'[dry-run] 将新增 {len(missing)} 条角色权限、'
                f'{len(new_roles)} 条超管角色绑定'
            )
            return

        with transaction.atomic():
            # bulk_create 绕过 save()，故此处逐条校验 perm_code
            for rp in missing:
                rp.clean()
            RolePermission.objects.bulk_create(missing)
            UserRole.objects.bulk_create(new_roles)

        invalidate_all()
        self.stdout.write(
            self.style.SUCCESS(
                f'RBAC 初始化完成：新增 {len(missing)} 条角色权限、'
                f'{len(new_roles)} 条超管角色绑定'
            )
        )
