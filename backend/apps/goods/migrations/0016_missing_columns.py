"""0016 — 补漏迁移：修复 0015 中缺失的 SPU 字段。

当 0015 已应用后，用幂等方式加上遗漏的列。
"""
from django.db import migrations, models


def add_missing_columns(apps, schema_editor):
    """检查列是否存在，只加缺失的。"""
    connection = schema_editor.connection
    if connection.vendor != 'mysql':
        return
    with connection.cursor() as cursor:
        extras = [
            ('goods_spu', 'meta_description', "`meta_description` varchar(320) NOT NULL DEFAULT ''"),
            ('goods_spu', 'product_type', "`product_type` varchar(100) NOT NULL DEFAULT ''"),
            ('goods_spu', 'requires_shipping', "`requires_shipping` tinyint(1) NOT NULL DEFAULT 1"),
            ('goods_spu', 'tags', "`tags` json NOT NULL DEFAULT (JSON_ARRAY())"),
            ('goods_spu', 'taxable', "`taxable` tinyint(1) NOT NULL DEFAULT 1"),
        ]
        for table, col, ddl in extras:
            cursor.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema=database() AND table_name=%s AND column_name=%s",
                [table, col]
            )
            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


class Migration(migrations.Migration):

    dependencies = [
        ('goods', '0015_squash_all'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_missing_columns, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='spu', name='meta_title',
                    field=models.CharField(blank=True, default='', max_length=120, verbose_name='SEO 标题'),
                ),
                migrations.AddField(
                    model_name='spu', name='meta_description',
                    field=models.TextField(blank=True, default='', max_length=320, verbose_name='SEO 描述'),
                ),
                migrations.AddField(
                    model_name='spu', name='product_type',
                    field=models.CharField(blank=True, default='', max_length=100, verbose_name='商品类型'),
                ),
                migrations.AddField(
                    model_name='spu', name='requires_shipping',
                    field=models.BooleanField(default=True, verbose_name='需要配送'),
                ),
                migrations.AddField(
                    model_name='spu', name='tags',
                    field=models.JSONField(blank=True, default=list, verbose_name='标签'),
                ),
                migrations.AddField(
                    model_name='spu', name='taxable',
                    field=models.BooleanField(default=True, verbose_name='是否计税'),
                ),
            ],
        ),
    ]
