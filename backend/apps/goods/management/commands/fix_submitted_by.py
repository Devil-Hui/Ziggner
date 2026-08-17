"""D1 回填命令：修复历史上 submitted_by 为空的 SUBMITTED 状态 SPU。

用法：
    python manage.py fix_submitted_by --dry-run   # 仅统计，不写库
    python manage.py fix_submitted_by             # 执行回填
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.goods.models import SPU, SPUStatus


class Command(BaseCommand):
    help = '回填 SUBMITTED 状态但 submitted_by 为空的 SPU（修复审核页「提交人 -」）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='仅统计需要回填的 SPU 数量，不写库',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        qs = SPU.objects.filter(status=SPUStatus.SUBMITTED, submitted_by__isnull=True)
        total = qs.count()

        if options['dry_run']:
            self.stdout.write(f'[dry-run] 共 {total} 个 SPU 需回填 submitted_by')
            return

        superuser = User.objects.filter(is_superuser=True).order_by('id').first()
        if superuser is None:
            self.stderr.write(self.style.ERROR('未找到任何超管，无法兜底回填'))
            return

        updated = 0
        for spu in qs:
            spu.submitted_by = spu.reviewed_by or superuser
            spu.save(update_fields=['submitted_by'])
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'已回填 {updated} 个 SPU 的 submitted_by')
        )
