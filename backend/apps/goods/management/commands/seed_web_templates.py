"""
幂等种子命令 —— "网页搭建" 分类 + 静态站模板商品上架
============================================================
根据 模板.7z 内 5 个 React/Vite 模板建立：
  - 一级分类「网页搭建」
  - 二级分类按模板家族（Bevel 设计风格 / Light Shop 设计系统 / Mollie 设计风格）
  - 5 个 SPU（product_kind=virtual，ON_SALE）
  - 每个 SPU 1 个默认 SKU

用法:
  docker exec ziggner-web-1 python manage.py seed_web_templates
  docker exec ziggner-web-1 python manage.py seed_web_templates --dry-run
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.goods.models import (
    Category, CategoryStatus, Brand, SPU, SPUStatus, SKU, ShelfStatus,
)

User = get_user_model()

# ── 分类定义 (家族 -> 二级分类名) ──
PARENT_CATEGORY = '网页搭建'
CHILD_CATEGORIES = ['网页搭建-Bevel 设计', '网页搭建-Light Shop', '网页搭建-Mollie']

# ── 商品定义 ──
# (slug, 名称, 名称en, 家族二级分类名, 品牌名, 描述, 描述en, preview_url)
PRODUCTS = [
    dict(
        slug='bevel-design-style-reference',
        name='Bevel 设计风格参考模板',
        name_en='Bevel Design Style Reference',
        child='网页搭建-Bevel 设计',
        brand='Bevel',
        description=(
            'Bevel 设计风格电商模板，React 19 + Vite + Tailwind 构建，'
            '单文件打包（vite-plugin-singlefile），可直接嵌入任意页面作为在线预览。'
        ),
        description_en=(
            'Bevel design style e-commerce template built with React 19 + Vite + Tailwind. '
            'Self-contained single-file output, ready to embed anywhere.'
        ),
        preview_url='https://api.ziggner.com/templates/bevel-design-style-reference/index.html',
    ),
    dict(
        slug='bevel-design-style-reference-qwen3.8',
        name='Bevel 设计风格参考模板 (Qwen 3.8)',
        name_en='Bevel Design Style Reference (Qwen 3.8)',
        child='网页搭建-Bevel 设计',
        brand='Bevel',
        description=(
            'Qwen 3.8 版本 Bevel 设计风格模板，React 19 + Vite + Tailwind 构建，'
            '包含 chart.js 图表与 lucide 图标组件，单文件打包即开即用。'
        ),
        preview_url='https://api.ziggner.com/templates/bevel-design-style-reference-qwen3.8/index.html',
    ),
    dict(
        slug='light-shop-design-system-clude5.5',
        name='Light Shop 设计系统 (Cluade 5.5)',
        name_en='Light Shop Design System (Cluade 5.5)',
        child='网页搭建-Light Shop',
        brand='Light Shop',
        description=(
            'Light Shop 极简设计系统模板，React + Vite 构建，'
            '内置 Drawer / Hero / ProductModal / SearchBar 等组件，'
            '单文件打包，适合轻量电商页面快速搭建。'
        ),
        preview_url='https://api.ziggner.com/templates/light-shop-design-system-clude5.5/index.html',
    ),
    dict(
        slug='light-shop-design-system-gpt-6-luna-max',
        name='Light Shop 设计系统 (GPT-6-Luna-Max)',
        name_en='Light Shop Design System (GPT-6-Luna-Max)',
        child='网页搭建-Light Shop',
        brand='Light Shop',
        description=(
            'GPT-6-Luna-Max 版本 Light Shop 设计系统，'
            '超大单文件 App 组件 + 全局样式，适合需要高度定制页面的场景。'
        ),
        preview_url='https://api.ziggner.com/templates/light-shop-design-system-gpt-6-luna-max/index.html',
    ),
    dict(
        slug='mollie-design-style-reference',
        name='Mollie 设计风格参考模板',
        name_en='Mollie Design Style Reference',
        child='网页搭建-Mollie',
        brand='Mollie',
        description=(
            'Mollie 设计风格电商模板，内置 espresso 演示组件（CheckoutModal / EspressoDemo / Navbar），'
            'React + Vite 构建，单文件打包即开即用。'
        ),
        preview_url='https://api.ziggner.com/templates/mollie-design-style-reference/index.html',
    ),
]

DEFAULT_PRICE = Decimal('49.90')


class Command(BaseCommand):
    help = '幂等创建「网页搭建」分类与模板商品（含预览 URL）'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='预览模式，不实际写入')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        self.stdout.write(self.style.WARNING('[DRY RUN] 仅预览') if dry_run else self.style.SUCCESS('开始 seed_web_templates'))

        admin = User.objects.filter(is_superuser=True).order_by('id').first()
        if not admin:
            admin = User.objects.filter(is_staff=True).order_by('id').first()
        if not admin:
            self.stdout.write(self.style.ERROR('未找到可用管理员用户，先创建 superuser 再执行'))
            return

        now = timezone.now()

        # 1) 一级分类「网页搭建」
        root, _ = Category.objects.get_or_create(
            name=PARENT_CATEGORY, level=1, parent=None,
            defaults={
                'status': CategoryStatus.APPROVED,
                'is_active': True,
                'created_by': admin, 'submitted_by': admin, 'reviewed_by': admin,
            },
        )
        if dry_run:
            self.stdout.write(f'  一级分类: {root.name} (id={root.id})')

        # 2. 二级分类（按品牌家族）
        for child_name in CHILD_CATEGORIES:
            child, created = Category.objects.get_or_create(
                name=child_name, level=2, parent=root,
                defaults={
                    'is_active': True,
                    'status': CategoryStatus.APPROVED,
                    'created_by': admin, 'submitted_by': admin, 'reviewed_by': admin,
                },
            )
            self.stdout.write(f'  二级分类: {child.name}' + (' (+created)' if created else ' (exists)'))

        # 3. 品牌
        for brand_name in {'Bevel', 'Light Shop', 'Mollie'}:
            Brand.objects.get_or_create(name=brand_name, defaults={'description': f'{brand_name} 模板系列', 'is_active': True})

        # 4. SPU + SKU
        for p in PRODUCTS:
            child = Category.objects.filter(name=p['child'], level=2, parent=root).first()
            brand = Brand.objects.filter(name=p['brand']).first()
            if not child or not brand:
                self.stdout.write(self.style.WARNING(f"  SKIP {p['name']}: 分类/品牌缺失"))
                continue
            preview_cat = p.get('preview_cat')
            spu, created = SPU.objects.get_or_create(
                name=p['name'], brand=brand, category=child,
                defaults=dict(
                    description=p['description'],
                    name_en=p['name_en'],
                    description_en=p.get('description_en', ''),
                    preview_url=p['preview_url'],
                    status=SPUStatus.ON_SALE,
                    requires_shipping=False,
                    product_kind='virtual',
                    submitted_by=admin, submitted_at=now,
                    reviewed_by=admin, reviewed_at=now,
                ),
            )
            if dry_run:
                self.stdout.write(f"  [dry] SPU: {spu.name}  preview={p['preview_url']}")
                continue
            # 幂等创建默认 SKU
            SKU.objects.get_or_create(
                spu=spu, spec_values={},
                defaults={
                    'price': DEFAULT_PRICE,
                    'stock': 999,
                    'shelf_status': ShelfStatus.ON,
                },
            )
            self.stdout.write(f"  {'+' if created else '='} SPU: {spu.name}  id={spu.id}  preview={p['preview_url']}")

        self.stdout.write(self.style.SUCCESS('seed 完成'))