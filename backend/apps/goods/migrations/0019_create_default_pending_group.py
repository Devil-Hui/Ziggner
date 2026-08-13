from django.db import migrations


def create_pending_group(apps, schema_editor):
    """创建系统默认「待定组」，作为删除其他分组时成员的自动转移收容所。"""
    AdminGroup = apps.get_model('goods', 'AdminGroup')
    AdminGroup.objects.get_or_create(
        slug='pending',
        defaults={
            'name': '待定组',
            'description': '系统默认收容组：删除其他管理组时，原有活跃成员会自动转移至此。',
        },
    )


def remove_pending_group(apps, schema_editor):
    AdminGroup = apps.get_model('goods', 'AdminGroup')
    AdminGroup.objects.filter(slug='pending').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('goods', '0018_delete_couponapplication'),
    ]

    operations = [
        migrations.RunPython(create_pending_group, remove_pending_group),
    ]
