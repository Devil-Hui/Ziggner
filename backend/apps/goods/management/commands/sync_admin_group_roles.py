"""
把商品审核组的成员身份同步为 RBAC 全局角色。

放在 goods 而不是 rbac，是为了守住依赖方向：业务 app 依赖 rbac，rbac 不反向依赖业务。

映射关系：
    AdminGroupMember(role=leader, status=ACTIVE) → UserRole(admin_leader)
    AdminGroupMember(role=member, status=ACTIVE) → UserRole(admin_member)

幂等，可反复执行。未在任何组的用户不写记录 —— 由 rbac 兜底为 customer。

    python manage.py sync_admin_group_roles
    python manage.py sync_admin_group_roles --dry-run
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.goods.models import AdminGroupMember
from apps.rbac.constants import Role
from apps.rbac.models import UserRole
from apps.rbac.services import invalidate_all

ROLE_MAP = {
    AdminGroupMember.Role.LEADER: Role.ADMIN_LEADER.value,
    AdminGroupMember.Role.MEMBER: Role.ADMIN_MEMBER.value,
}

ACTIVE = AdminGroupMember.Status.ACTIVE


class Command(BaseCommand):
    help = '按商品审核组成员身份同步 RBAC 全局角色（幂等）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true', help='只报告将要写入的内容，不落库'
        )

    def handle(self, *args, **options):
        memberships = AdminGroupMember.objects.filter(status=ACTIVE).values_list(
            'user_id', 'role'
        )

        wanted = {
            (user_id, ROLE_MAP[role])
            for user_id, role in memberships
            if role in ROLE_MAP
        }
        existing = set(
            UserRole.objects.filter(
                role__in=list(ROLE_MAP.values())
            ).values_list('user_id', 'role')
        )
        missing = wanted - existing

        if options['dry_run']:
            self.stdout.write(f'[dry-run] 将新增 {len(missing)} 条角色绑定')
            return

        with transaction.atomic():
            UserRole.objects.bulk_create(
                [UserRole(user_id=uid, role=role) for uid, role in sorted(missing)]
            )

        invalidate_all()
        self.stdout.write(
            self.style.SUCCESS(f'角色同步完成：新增 {len(missing)} 条绑定')
        )
