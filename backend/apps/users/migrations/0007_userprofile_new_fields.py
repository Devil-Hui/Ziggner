"""
Add new UserProfile fields for the "新增管理员" redesign.

纯 additive 迁移：所有新字段均带默认值（department/note 空串、email_verified False、
locale 'zh-CN'、must_reset_password True），旧数据自动取默认值，无需数据回填。
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_userprofile_account_no'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='department',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='note',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='locale',
            field=models.CharField(blank=True, default='zh-CN', max_length=10),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='must_reset_password',
            field=models.BooleanField(default=True),
        ),
    ]
