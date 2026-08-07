"""
P0 数据初始化管理命令
用法: docker exec django-app python3 manage.py init_p0_data

说明: 本命令只负责把数据库清空为「全新空库」(TRUNCATE 业务表 + 删除非超管用户)，
      不再创建任何测试账号 / 测试商品 / 优惠券等演示数据。
      超级管理员请改用 `python manage.py createsuperuser` 手动创建。
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection

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
    help = 'P0 数据初始化 — 清空业务表为全新空库 (不创建任何测试数据)'

    def handle(self, *args, **options):
        from django.conf import settings
        if not settings.DEBUG:
            self.stdout.write(self.style.ERROR('init_p0_data requires DEBUG=True. Refusing to run in production.'))
            return
        self.stdout.write('=' * 60)
        self.stdout.write('P0 数据初始化开始 (清空为全新空库)')
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

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('P0 数据已清空为全新空库（未创建任何测试数据）')
        self.stdout.write('=' * 60)
        self.stdout.write('')
        self.stdout.write('  下一步请手动创建超级管理员：')
        self.stdout.write('  python manage.py createsuperuser')
