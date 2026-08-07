# Generated manually: add group FK to Conversation for group-level permission isolation

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('customer_service', '0002_add_card_data_and_is_read'),
        ('goods', '0001_initial'),  # AdminGroup 定义在 goods app
    ]

    operations = [
        # 1. 新增 group FK — nullable for backward compatibility
        migrations.AddField(
            model_name='conversation',
            name='group',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cs_conversations',
                to='goods.admingroup',
                verbose_name='归属管理组',
            ),
        ),
        # 2. 新增复合索引 (group, status)
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(
                fields=['group', 'status'],
                name='cs_conv_group_status_idx',
            ),
        ),
    ]
