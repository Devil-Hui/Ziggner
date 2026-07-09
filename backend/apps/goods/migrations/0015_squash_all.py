"""
0015_squash_all — MySQL 幂等迁移。

策略：SeparateDatabaseAndState
- database_operations: RunPython 用 raw SQL 逐字段添加（遇到重复列静默跳过）
- state_operations: 标准的 AddField（Django 只记录状态，不操作数据库）

这样 Django ORM 知道自己添加了这些字段（状态层），
但实际数据库由幂等 SQL 处理（数据库层）。
"""
from django.db import migrations, models
from django.db.utils import OperationalError, ProgrammingError


COLUMNS_BY_TABLE = {
    'goods_tag': [
        ('color', "`color` varchar(7) NOT NULL DEFAULT '#e74c3c'"),
    ],
    'goods_product_media': [
        ('alt_text', "`alt_text` varchar(200) NOT NULL DEFAULT ''"),
    ],
    'goods_spu': [
        ('product_kind', "`product_kind` varchar(10) NOT NULL DEFAULT 'physical'"),
        ('meta_title', "`meta_title` varchar(120) NOT NULL DEFAULT ''"),
    ],
    'goods_sku': [
        ('barcode', "`barcode` varchar(128) NOT NULL DEFAULT ''"),
        ('cost_price', "`cost_price` decimal(10,2) NULL"),
        ('weight', "`weight` decimal(8,2) NOT NULL DEFAULT 0.00"),
        ('alert_threshold', "`alert_threshold` int unsigned NOT NULL DEFAULT 0"),
        ('sku_code', "`sku_code` varchar(128) NOT NULL DEFAULT ''"),
        ('track_inventory', "`track_inventory` tinyint(1) NOT NULL DEFAULT 1"),
    ],
}


def add_missing_columns(apps, schema_editor):
    """MySQL 幂等：检查列是否存在，不存在才 ADD COLUMN。"""
    connection = schema_editor.connection
    if connection.vendor != 'mysql':
        return

    with connection.cursor() as cursor:
        for table, columns in COLUMNS_BY_TABLE.items():
            cursor.execute(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s",
                [table]
            )
            existing = {r[0] for r in cursor.fetchall()}
            for col_name, col_ddl in columns:
                if col_name not in existing:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_ddl}")


class Migration(migrations.Migration):

    dependencies = [
        ('goods', '0014_sku_version'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_missing_columns, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='tag', name='color',
                    field=models.CharField(default='#e74c3c', help_text='HEX色值', max_length=7, verbose_name='标签颜色'),
                ),
                migrations.AddField(
                    model_name='productmedia', name='alt_text',
                    field=models.CharField(blank=True, default='', max_length=200, verbose_name='Alt替代文本'),
                ),
                migrations.AddField(
                    model_name='spu', name='product_kind',
                    field=models.CharField(choices=[('physical','Physical'),('virtual','Virtual')], default='physical', max_length=10, verbose_name='商品类型'),
                ),
                migrations.AddField(
                    model_name='spu', name='meta_title',
                    field=models.CharField(blank=True, default='', max_length=120, verbose_name='SEO 标题'),
                ),
                migrations.AddField(
                    model_name='sku', name='barcode',
                    field=models.CharField(blank=True, default='', max_length=128, verbose_name='条形码'),
                ),
                migrations.AddField(
                    model_name='sku', name='cost_price',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='成本价'),
                ),
                migrations.AddField(
                    model_name='sku', name='weight',
                    field=models.DecimalField(decimal_places=2, default=0.00, max_digits=8, verbose_name='重量'),
                ),
                migrations.AddField(
                    model_name='sku', name='alert_threshold',
                    field=models.PositiveIntegerField(default=0, verbose_name='库存预警'),
                ),
                migrations.AddField(
                    model_name='sku', name='sku_code',
                    field=models.CharField(blank=True, default='', max_length=128, verbose_name='SKU编码'),
                ),
                migrations.AddField(
                    model_name='sku', name='track_inventory',
                    field=models.BooleanField(default=True, verbose_name='跟踪库存'),
                ),
            ],
        ),
    ]
