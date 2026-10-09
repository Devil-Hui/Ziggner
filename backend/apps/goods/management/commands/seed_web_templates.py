"""
幂等种子命令 —— "Website Builder" 分类 + 静态站模板商品上架
============================================================
根据 shop_templates 下 5 个 React/Vite 模板建立：
  - 一级分类「Website Builder」
  - 二级分类按模板家族（Bevel Design / Light Shop / Mollie）
  - 5 个 SPU（product_kind=virtual，ON_SALE）
  - 每个 SPU 1 个默认SKU

命名约定
--------
分类名与商品名一律英文（站点默认语言即 en-US，见前端 i18n/I18nContext）。
同一家族的两个变体用 (Style 1) / (Style 2) 区分 —— 不暴露内部分析工具名。

幂等性
------
SPU 以 preview_url（含 slug，跨改名稳定）作为匹配键，而不是 name，
因此改名不会产生重复商品；字段有差异时自动patch。

用法:
  docker exec ziggner-web-1 python manage.py seed_web_templates
  docker exec ziggner-web-1 python manage.py seed_web_templates --dry-run
"""

import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.goods.models import (
    Category, CategoryStatus, Brand, SPU, SPUStatus, SKU, ShelfStatus,
)

User = get_user_model()

# ── 分类定义 (家族 -> 二级分类名) ──
PARENT_CATEGORY = 'Website Builder'
CHILD_CATEGORIES = ['Bevel Design', 'Light Shop', 'Mollie']

# 历史中文分类名 -> 英文名。首次执行时原地改名，避免与英文分类重复建树。
LEGACY_CATEGORY_NAMES = {
    '网页搭建': 'Website Builder',
    '网页搭建-Bevel 设计': 'Bevel Design',
    '网页搭建-Light Shop': 'Light Shop',
    '网页搭建-Mollie': 'Mollie',
}

# 模板预览站根目录：对外域名用shop.ziggner.com（同前端一起由 Cloudflare 托管）。
# 绝不使用 api.ziggner.com —— 那是内部 API 域名，不应出现在可售页面的任何 URL 里。
# 需要改域名时设环境变量 TEMPLATE_PREVIEW_BASE（seed 幂等，改完重跑即可）。
PREVIEW_BASE = os.getenv('TEMPLATE_PREVIEW_BASE', 'https://shop.ziggner.com').rstrip('/')
TEMPLATE_ROOT = '/templates'

# ── 商品定义 ──
# (slug, 名称, 二级分类名, 品牌名, 描述)
# preview_url / main_image 由 slug 推导，避免域名硬编码进数据。
PRODUCTS = [
    dict(
        slug='bevel-design-style-reference',
        name='Bevel Design Style (Style 1)',
        child='Bevel Design',
        brand='Bevel',
        description=(
            'Bevel design-style storefront template built with React 19 + Vite + Tailwind. '
            'Bundled as a self-contained single file, so it can be dropped into any page as a live preview.'
        ),
    ),
    dict(
        slug='bevel-design-style-reference-qwen3.8',
        name='Bevel Design Style (Style 2)',
        child='Bevel Design',
        brand='Bevel',
        description=(
            'Second variant of the Bevel design-style template. '
            'Includes chart.js charts and the lucide icon set, shipped as one self-contained file.'
        ),
    ),
    dict(
        slug='light-shop-design-system-clude5.5',
        name='Light Shop Design System (Style 1)',
        child='Light Shop',
        brand='Light Shop',
        description=(
            'A minimal light design system with Drawer / Hero / ProductModal / SearchBar components. '
            'Single-file build — ideal for lightweight commerce pages.'
        ),
    ),
    dict(
        slug='light-shop-design-system-gpt-6-luna-max',
        name='Light Shop Design System (Style 2)',
        child='Light Shop',
        brand='Light Shop',
        description=(
            'Second variant of the Light Shop design system. '
            'Oversized single-file app shell plus global styles, for pages that need heavy customisation.'
        ),
    ),
    dict(
        slug='mollie-design-style-reference',
        name='Mollie Design Style',
        child='Mollie',
        brand='Mollie',
        description=(
            'Mollie-inspired storefront template with the full espresso demo suite '
            '(CheckoutModal / EspressoDemo / Navbar). Built with React + Vite, shipped as one file.'
        ),
    ),
]

DEFAULT_PRICE = Decimal('49.90')


class Command(BaseCommand):
    help = '幂等创建「Website Builder」分类与模板商品（含预览 URL 与主图）'

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

        # 0) 历史中文分类名原地改英文（幂等，dry-run 只报告）
        for old_name, new_name in LEGACY_CATEGORY_NAMES.items():
            qs = Category.objects.filter(name=old_name)
            if not qs.exists():
                continue
            self.stdout.write(f"  分类改名: {old_name} → {new_name}（{qs.count()} 条）")
            if not dry_run:
                qs.update(name=new_name)

        # 1) 一级分类
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

        # 3) 品牌
        for brand_name in {'Bevel', 'Light Shop', 'Mollie'}:
            Brand.objects.get_or_create(name=brand_name, defaults={'description': f'{brand_name} template series', 'is_active': True})

        # 4. SPU + SKU
        for p in PRODUCTS:
            child = Category.objects.filter(name=p['child'], level=2, parent=root).first()
            brand = Brand.objects.filter(name=p['brand']).first()
            if not child or not brand:
                self.stdout.write(self.style.WARNING(f"  SKIP {p['name']}: 分类/品牌缺失"))
                continue
            preview_url = f"{PREVIEW_BASE}{TEMPLATE_ROOT}/{p['slug']}/index.html"
            cover_url = f"{PREVIEW_BASE}{TEMPLATE_ROOT}/{p['slug']}/cover.jpg"

            # 以 preview_url 为匹配键（slug 稳定，改名不会重复建商品）
            spu = SPU.objects.filter(preview_url=preview_url).first()
            created = spu is None
            if created:
                spu = SPU.objects.create(
                    name=p['name'],
                    brand=brand,
                    category=child,
                    description=p['description'],
                    name_en=p['name'],
                    description_en=p['description'],
                    preview_url=preview_url,
                    # 封面即上架卡片图：模板首屏真实渲染截图
                    main_image=cover_url,
                    status=SPUStatus.ON_SALE,
                    requires_shipping=False,
                    product_kind='virtual',
                    submitted_by=admin, submitted_at=now,
                    reviewed_by=admin, reviewed_at=now,
                )
            if dry_run:
                self.stdout.write(
                    f"  {'+' if created else '='} SPU: {spu.name}  "
                    f"preview={preview_url}  cover={cover_url}"
                )
                continue

            # 幂等补齐：改名 / 换域名 / 补封面都靠这里收敛
            desired = {
                'name': p['name'],
                'name_en': p['name'],
                'description': p['description'],
                'description_en': p['description'],
                'brand': brand,
                'category': child,
                'preview_url': preview_url,
                'main_image': cover_url,
                'product_kind': 'virtual',
                'requires_shipping': False,
                'status': SPUStatus.ON_SALE,
            }
            patch = [f for f, v in desired.items() if getattr(spu, f) != v]
            if patch:
                for f, v in desired.items():
                    setattr(spu, f, v)
                spu.save(update_fields=list(desired.keys()))
                self.stdout.write(f"    更新字段: {', '.join(patch)}")

            # 幂等创建默认 SKU
            SKU.objects.get_or_create(
                spu=spu, spec_values={},
                defaults={
                    'price': DEFAULT_PRICE,
                    'stock': 999,
                    'shelf_status': ShelfStatus.ON,
                },
            )
            self.stdout.write(f"  {'+' if created else '='} SPU: {spu.name}  id={spu.id}")

        self.stdout.write(self.style.SUCCESS('seed 完成'))