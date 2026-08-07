"""
幂等种子数据管理命令 —— 支持 dev / staging / prod 环境
=========================================================
与 init_p0_data 的区别：
  - init_p0_data: TRUNCATE 全表 + 重建，仅开发环境，破坏性
  - seed_data:     UPSERT 语义，生产安全，可重复执行

用法:
  docker exec django-app python3 manage.py seed_data --env=dev
  docker exec django-app python3 manage.py seed_data --env=staging
  docker exec django-app python3 manage.py seed_data --env=prod
  docker exec django-app python3 manage.py seed_data --env=prod --dry-run  # 预览模式
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.management import call_command
from apps.goods.models import Category, Brand, SPU, SKU, SPUStatus, Tag
from apps.promotion.models import Coupon
from django.utils import timezone
import json

User = get_user_model()

# ── 种子数据定义 ──
# 格式: (unique_key, defaults_dict)
# unique_key 用于幂等查找 (get_or_create)

SEED_CONFIG = {
    'dev': {
        'categories': [
            # (name, level, parent_name, defaults)
            ('数码产品', 1, None, {'is_active': True}),
            ('手机', 2, '数码产品', {'is_active': True}),
            ('电脑', 2, '数码产品', {'is_active': True}),
            ('家电', 1, None, {'is_active': True}),
            ('冰箱', 2, '家电', {'is_active': True}),
            ('洗衣机', 2, '家电', {'is_active': True}),
            ('服装', 1, None, {'is_active': True}),
            ('男装', 2, '服装', {'is_active': True}),
            ('女装', 2, '服装', {'is_active': True}),
        ],
        'brands': [
            ('Apple', '苹果公司'),
            ('Huawei', '华为技术有限公司'),
            ('Haier', '海尔集团'),
            ('Nike', '耐克'),
        ],
        'tags': ['新品', '热销', '推荐', '限时', '特价', '精选'],
        'coupons': [
            ('满100减10', 'fixed', 10, 100),
            ('满200减30', 'fixed', 30, 200),
            ('9折券', 'percentage', 10, 0),
        ],
    },
    'staging': {
        'categories': [
            ('数码产品', 1, None, {'is_active': True}),
            ('手机', 2, '数码产品', {'is_active': True}),
            ('家电', 1, None, {'is_active': True}),
            ('服装', 1, None, {'is_active': True}),
        ],
        'brands': [
            ('Apple', '苹果公司'),
            ('Huawei', '华为技术有限公司'),
        ],
        'tags': ['新品', '热销', '推荐'],
        'coupons': [
            ('满100减10', 'fixed', 10, 100),
        ],
    },
    'prod': {
        'categories': [
            # 生产环境初始为空，由运营通过 Admin 页面创建
            # 如需预置，在此添加
        ],
        'brands': [],
        'tags': [],
        'coupons': [],
    },
}


class Command(BaseCommand):
    help = '幂等种子数据初始化 — UPSERT 语义，生产安全'

    def add_arguments(self, parser):
        parser.add_argument('--env', type=str, default='dev',
                            choices=['dev', 'staging', 'prod'],
                            help='目标环境')
        parser.add_argument('--dry-run', action='store_true',
                            help='预览模式，不实际写入')

    def handle(self, *args, **options):
        env = options['env']
        dry_run = options['dry_run']

        config = SEED_CONFIG.get(env)
        if not config:
            self.stdout.write(self.style.ERROR(f'未知环境: {env}'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f'=== DRY RUN: {env} 环境 ==='))
        else:
            self.stdout.write(self.style.SUCCESS(f'=== 种子数据初始化: {env} 环境 ==='))

        # ── 1. 分类 ──
        self.stdout.write(f'\n[分类] 共 {len(config["categories"])} 条')
        created = 0
        for name, level, parent_name, defaults in config['categories']:
            parent = None
            if parent_name:
                parent = Category.objects.filter(name=parent_name, level=level - 1).first()
                if not parent:
                    self.stdout.write(self.style.WARNING(f'  SKIP {name}: 找不到父分类 {parent_name}'))
                    continue

            obj, is_new = Category.objects.get_or_create(
                name=name, level=level, parent=parent,
                defaults={**defaults, 'created_by': User.objects.filter(is_superuser=True).first()}
            )
            if is_new:
                created += 1
                self.stdout.write(f'  + {name} (level={level})')
            elif dry_run:
                self.stdout.write(f'  = {name} (已存在)')

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'  → 分类: 新建 {created}, 跳过 {len(config["categories"]) - created}'))

        # ── 2. 品牌 ──
        self.stdout.write(f'\n[品牌] 共 {len(config["brands"])} 条')
        created = 0
        for name, desc in config['brands']:
            obj, is_new = Brand.objects.get_or_create(
                name=name,
                defaults={'description': desc}
            )
            if is_new:
                created += 1
                self.stdout.write(f'  + {name}')
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'  → 品牌: 新建 {created}'))

        # ── 3. 标签 ──
        self.stdout.write(f'\n[标签] 共 {len(config["tags"])} 条')
        for tag_name in config['tags']:
            Tag.objects.get_or_create(name=tag_name)

        # ── 4. 优惠券 ──
        self.stdout.write(f'\n[优惠券] 共 {len(config["coupons"])} 条')
        for name, discount_type, discount_value, min_amount in config['coupons']:
            Coupon.objects.get_or_create(
                name=name,
                defaults={
                    'discount_type': discount_type,
                    'amount': discount_value,
                    'min_amount': min_amount,
                    'total_count': 1000,
                    'per_user_limit': 1,
                    'start_time': timezone.now(),
                    'end_time': timezone.now() + timezone.timedelta(days=365),
                }
            )

        if dry_run:
            self.stdout.write('\n' + self.style.WARNING('[DRY RUN] 无实际写入'))
        else:
            self.stdout.write('\n' + self.style.SUCCESS('=== 种子数据初始化完成 ==='))