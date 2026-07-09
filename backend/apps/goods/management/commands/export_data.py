"""
环境数据导出/导入管理命令
==========================
用于开发环境 → 预发布 → 生产环境的数据迁移。
导出为 JSON，可版本控制，可回滚。

用法:
  # 导出
  docker exec django-app python3 manage.py export_data --env=dev --output=seeds/dev/2026-06-21.json

  # 导入
  docker exec django-app python3 manage.py import_data --file=seeds/dev/2026-06-21.json --env=staging

  # 预览
  docker exec django-app python3 manage.py import_data --file=seeds/dev/2026-06-21.json --dry-run
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.serializers import serialize
from django.core.serializers.json import DjangoJSONEncoder
from apps.goods.models import Category, Brand, SPU, SKU, Tag
from apps.promotion.models import Coupon
import json
import os
import sys

User = get_user_model()

EXPORT_MODELS = ['goods.Category', 'goods.Brand', 'goods.Tag', 'promotion.Coupon']


class Command(BaseCommand):
    help = '跨环境数据导出/导入（JSON 格式，版本可控）'

    def add_arguments(self, parser):
        parser.add_argument('--export', action='store_true', help='导出模式')
        parser.add_argument('--import-file', type=str, help='导入模式: JSON 文件路径')
        parser.add_argument('--output', type=str, default='seeds/export.json', help='导出文件路径')
        parser.add_argument('--env', type=str, default='dev', help='标注来源环境')
        parser.add_argument('--dry-run', action='store_true', help='导入预览，不写入')

    def handle(self, *args, **options):
        if options['export']:
            self.do_export(options['output'], options['env'])
        elif options['import_file']:
            self.do_import(options['import_file'], options['env'], options['dry_run'])
        else:
            self.stdout.write(self.style.ERROR('请指定 --export 或 --import-file'))

    def do_export(self, output_path, env):
        """导出当前环境数据为 JSON"""
        self.stdout.write(f'导出 {env} 环境数据到 {output_path}...')

        data = {
            '_meta': {
                'env': env,
                'exported_at': str(__import__('django').utils.timezone.now()),
                'version': '1.0',
            },
            'data': {},
        }

        for model_label in EXPORT_MODELS:
            app_label, model_name = model_label.split('.')
            from django.apps import apps
            Model = apps.get_model(app_label, model_name)
            queryset = Model.objects.all()

            serialized = json.loads(serialize('json', queryset))
            # 精简字段，去掉不必要的内容
            cleaned = []
            for item in serialized:
                cleaned.append({
                    'model': item['model'],
                    'pk': item['pk'],
                    'fields': {k: v for k, v in item['fields'].items() if v is not None},
                })
            data['data'][model_label] = cleaned
            self.stdout.write(f'  ✓ {model_label}: {len(cleaned)} 条')

        # 确保目录存在
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, cls=DjangoJSONEncoder)

        self.stdout.write(self.style.SUCCESS(f'\n导出完成: {output_path}'))
        self.stdout.write(f'  git add {output_path} && git commit -m "seed: {env} data export"')

    def do_import(self, file_path, env, dry_run):
        """导入 JSON 数据到当前环境（UPSERT）"""
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'文件不存在: {file_path}'))
            sys.exit(1)

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        meta = data.get('_meta', {})
        self.stdout.write(f'导入数据: 来源={meta.get("env")}, 目标={env}')
        self.stdout.write(f'导出时间: {meta.get("exported_at")}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN 模式 ==='))

        # ── 分类（需要按层级顺序创建） ──
        cats = data['data'].get('goods.Category', [])
        self.stdout.write(f'\n[分类] 共 {len(cats)} 条')

        # 按 level 排序，确保父级先创建
        cats.sort(key=lambda c: c['fields'].get('level', 1))

        for item in cats:
            fields = item['fields']
            name = fields['name']
            level = fields.get('level', 1)
            parent_id = fields.get('parent')

            if parent_id:
                parent = Category.objects.filter(id=parent_id).first()
                if not parent:
                    self.stdout.write(self.style.WARNING(f'  SKIP {name}: 父分类 id={parent_id} 不存在'))
                    continue
            else:
                parent = None

            if dry_run:
                existing = Category.objects.filter(name=name, level=level, parent=parent).first()
                self.stdout.write(f'  {"=" if existing else "+"} {name} (level={level})')
            else:
                obj, created = Category.objects.get_or_create(
                    name=name, level=level, parent=parent,
                    defaults={'created_by': User.objects.filter(is_superuser=True).first()}
                )
                self.stdout.write(f'  {"+" if created else "="} {name}')

        # ── 品牌 ──
        brands = data['data'].get('goods.Brand', [])
        self.stdout.write(f'\n[品牌] 共 {len(brands)} 条')
        for item in brands:
            fields = item['fields']
            if dry_run:
                existing = Brand.objects.filter(name=fields['name']).first()
                self.stdout.write(f'  {"=" if existing else "+"} {fields["name"]}')
            else:
                Brand.objects.get_or_create(
                    name=fields['name'],
                    defaults={'description': fields.get('description', '')}
                )
                self.stdout.write(f'  + {fields["name"]}')

        # ── 标签 ──
        tags = data['data'].get('goods.Tag', [])
        self.stdout.write(f'\n[标签] 共 {len(tags)} 条')
        for item in tags:
            if not dry_run:
                Tag.objects.get_or_create(name=item['fields']['name'])

        # ── 优惠券 ──
        coupons = data['data'].get('promotion.Coupon', [])
        self.stdout.write(f'\n[优惠券] 共 {len(coupons)} 条')
        for item in coupons:
            fields = item['fields']
            if dry_run:
                existing = Coupon.objects.filter(name=fields['name']).first()
                self.stdout.write(f'  {"=" if existing else "+"} {fields["name"]}')
            else:
                Coupon.objects.get_or_create(
                    name=fields['name'],
                    defaults={
                        'discount_type': fields.get('discount_type', 'fixed'),
                        'amount': fields.get('amount', 0),
                        'min_amount': fields.get('min_amount', 0),
                        'total_count': fields.get('total_count', 1000),
                        'per_user_limit': fields.get('per_user_limit', 1),
                        'start_time': fields.get('start_time') or __import__('django').utils.timezone.now(),
                        'end_time': fields.get('end_time') or __import__('django').utils.timezone.now() + __import__('django').utils.timezone.timedelta(days=365),
                    }
                )

        if dry_run:
            self.stdout.write('\n' + self.style.WARNING('[DRY RUN] 无实际写入'))
        else:
            self.stdout.write('\n' + self.style.SUCCESS('=== 导入完成 ==='))