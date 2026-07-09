"""
P0 数据初始化管理命令
用法: docker exec django-app python3 manage.py init_p0_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone

User = get_user_model()

BUSINESS_TABLES = [
    'payment_payment_log', 'order_order_item', 'order_order', 'order_after_sale',
    'cart_cart_item', 'cart_cart',
    'review_review', 'lovegoods_favorite',
    'promotion_activity_sku', 'promotion_coupon_scope', 'promotion_user_coupon',
    'promotion_activity', 'promotion_coupon',
    'notification_notification',
    'goods_operation_log', 'goods_price_history', 'goods_audit_log',
    'goods_spu_tag_relation', 'goods_spu_attribute',
    'goods_spu_spec_value', 'goods_spu_spec',
    'goods_sku_spec_value', 'goods_sku', 'goods_spu',
    'goods_spec_value', 'goods_spec_name', 'goods_attribute_value', 'goods_attribute',
    'goods_admin_notification', 'goods_leader_change_app', 'goods_coupon_app',
    'goods_category_rename_app', 'goods_brand_rename_app',
    'goods_tag', 'goods_brand', 'goods_category',
    'goods_admin_group_member', 'goods_admin_group',
    'users_sms_verification_code', 'users_expiringtoken', 'users_userprofile',
    'address_address',
    'token_blacklist_blacklistedtoken', 'token_blacklist_outstandingtoken',
]


class Command(BaseCommand):
    help = 'P0 数据初始化 — 清理旧数据并创建 E2E 测试所需数据'

    def handle(self, *args, **options):
        from django.conf import settings
        if not settings.DEBUG:
            self.stdout.write(self.style.ERROR('init_p0_data requires DEBUG=True. Refusing to run in production.'))
            return
        self.stdout.write('=' * 60)
        self.stdout.write('P0 数据初始化开始')
        self.stdout.write('=' * 60)

        # ── Step 0.1: 数据清理 ──
        self.stdout.write('\n[Step 0.1] 清理所有业务表...')
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in BUSINESS_TABLES:
                try:
                    cursor.execute(f"TRUNCATE TABLE {table}")
                    self.stdout.write(f'  TRUNCATE {table} OK')
                except Exception as e:
                    self.stdout.write(f'  SKIP {table}: {e}')
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

        # 清理非 admin 用户
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write('  非 admin 用户已清理')

        # ── Step 0.3: 创建 superadmin ──
        self.stdout.write('\n[Step 0.3] 创建 superadmin...')
        admin = User.objects.filter(username='admin').first()
        if admin:
            admin.set_password('admin123')
            admin.is_superuser = True
            admin.is_staff = True
            admin.is_active = True
            admin.save()
            self.stdout.write('  admin 密码已重置为 admin123')
        else:
            User.objects.create_superuser('admin', 'admin@ziggner.com', 'admin123')
            self.stdout.write('  admin 已创建 (admin123)')

        # ── Step 1.2: 创建管理组 ──
        self.stdout.write('\n[Step 1.2] 创建管理组...')
        from apps.goods.models import AdminGroup, AdminGroupMember
        agent_group, _ = AdminGroup.objects.get_or_create(
            slug='agent',
            defaults={'name': 'Agent'}
        )
        service_group, _ = AdminGroup.objects.get_or_create(
            slug='service',
            defaults={'name': 'Service'}
        )
        self.stdout.write(f'  agent 组: id={agent_group.id}')
        self.stdout.write(f'  service 组: id={service_group.id}')

        # ── Step 1.4: 创建组长用户 ──
        self.stdout.write('\n[Step 1.4] 创建组长用户...')
        users_data = [
            ('agent_admin', 'leader', agent_group),
            ('agent1', 'member', agent_group),
            ('agent2', 'member', agent_group),
            ('service_admin', 'leader', service_group),
            ('service1', 'member', service_group),
            ('service2', 'member', service_group),
        ]
        for username, role, group in users_data:
            user = User.objects.create_user(username=username, password='123456', is_staff=True)
            AdminGroupMember.objects.create(user=user, group=group, role=role, status=1)
            self.stdout.write(f'  {username} ({role}) -> {group.slug}')

        # 普通用户
        testuser = User.objects.create_user(username='testuser', password='123456', is_staff=False)
        self.stdout.write(f'  testuser (普通用户)')

        # ── Step 1.5: 创建品牌 ──
        self.stdout.write('\n[Step 1.5] 创建品牌 Ziggner...')
        from apps.goods.models import Brand
        brand, _ = Brand.objects.get_or_create(
            name='Ziggner',
            defaults={
                'logo_url': 'https://example.com/logo.png',
                'description': 'Official Ziggner brand',
                'is_active': True,
            }
        )
        self.stdout.write(f'  品牌: {brand.name} (id={brand.id})')

        # ── Step 1.6: 创建类目 ──
        self.stdout.write('\n[Step 1.6] 创建类目...')
        from apps.goods.models import Category
        agent_cat, _ = Category.objects.get_or_create(
            name='Agent', parent=None, level=1,
            defaults={'admin_group': agent_group, 'is_active': True}
        )
        service_cat, _ = Category.objects.get_or_create(
            name='Service', parent=None, level=1,
            defaults={'admin_group': service_group, 'is_active': True}
        )
        self.stdout.write(f'  Agent 类目: id={agent_cat.id}')
        self.stdout.write(f'  Service 类目: id={service_cat.id}')

        # ── Step 1.7: 创建优惠券 ──
        self.stdout.write('\n[Step 1.7] 创建优惠券...')
        from apps.promotion.models import Coupon
        now = timezone.now()
        Coupon.objects.get_or_create(
            code='GREEN-FULL',
            defaults={
                'discount_type': 'fixed',
                'amount': 10,
                'min_amount': 20,
                'max_discount': None,
                'stackable': False,
                'is_active': True,
                'total_count': 100,
                'claimed_count': 0,
                'used_count': 0,
                'start_time': now,
                'end_time': now + timezone.timedelta(days=365),
            }
        )
        Coupon.objects.get_or_create(
            code='GREEN-REDUCE',
            defaults={
                'discount_type': 'percent',
                'amount': 30,
                'min_amount': 0,
                'max_discount': 10,
                'stackable': False,
                'is_active': True,
                'total_count': 100,
                'claimed_count': 0,
                'used_count': 0,
                'start_time': now,
                'end_time': now + timezone.timedelta(days=365),
            }
        )
        self.stdout.write('  GREEN-FULL, GREEN-REDUCE')

        # ── 创建测试商品 ──
        self.stdout.write('\n[创建测试商品]...')
        from apps.goods.models import SPU, SKU
        spu_agent = SPU.objects.create(
            name='Agent Video Pro', brand=brand, category=agent_cat,
            status='on_sale', description='Professional video editing software',
        )
        SKU.objects.create(spu=spu_agent, price=20.00, stock=5, shelf_status='on', spec_values={'type': 'Standard'})
        SKU.objects.create(spu=spu_agent, price=35.00, stock=3, shelf_status='on', spec_values={'type': 'Premium'})

        spu_agent2 = SPU.objects.create(
            name='Agent Cloud Sync', brand=brand, category=agent_cat,
            status='on_sale', description='Cloud synchronization service',
        )
        SKU.objects.create(spu=spu_agent2, price=10.00, stock=100, shelf_status='on', spec_values={'type': 'Basic'})

        spu_service = SPU.objects.create(
            name='Service Repair Kit', brand=brand, category=service_cat,
            status='on_sale', description='Professional repair toolkit',
        )
        SKU.objects.create(spu=spu_service, price=50.00, stock=10, shelf_status='on', spec_values={'type': 'Standard'})

        self.stdout.write(f'  Agent 组: 2 个 SPU')
        self.stdout.write(f'  Service 组: 1 个 SPU')

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('P0 数据初始化完成!')
        self.stdout.write('=' * 60)
        self.stdout.write('')
        self.stdout.write('  账号列表:')
        self.stdout.write('  admin / admin123 (Super Admin)')
        self.stdout.write('  agent_admin / 123456 (Agent 组长)')
        self.stdout.write('  service_admin / 123456 (Service 组长)')
        self.stdout.write('  agent1 / 123456 (Agent 组员)')
        self.stdout.write('  agent2 / 123456 (Agent 组员)')
        self.stdout.write('  service1 / 123456 (Service 组员)')
        self.stdout.write('  service2 / 123456 (Service 组员)')
        self.stdout.write('  testuser / 123456 (普通用户)')