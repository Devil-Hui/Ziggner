"""
ABAC 扩展字段：
  - UserRole 增加 expires_at（临时角色到期）、conditions（动态授权条件）
  - RolePermission 增加 conditions（动态授权条件）

generated manually（本地环境缺 pymysql，无法运行 makemigrations）
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rbac', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userrole',
            name='expires_at',
            field=models.DateTimeField(
                null=True, blank=True,
                verbose_name='角色到期时间（空=永久）',
                help_text='ABAC 扩展：到达该时间后角色自动失效，支持临时授权。',
            ),
        ),
        migrations.AddField(
            model_name='userrole',
            name='conditions',
            field=models.JSONField(
                default=dict, blank=True,
                verbose_name='授权条件',
                help_text='ABAC 扩展：预留的动态授权条件，如 {"time": {...}, "risk": {...}, "geo": {...}}。',
            ),
        ),
        migrations.AddField(
            model_name='rolepermission',
            name='conditions',
            field=models.JSONField(
                default=dict, blank=True,
                verbose_name='授权条件',
                help_text='ABAC 扩展：预留的动态授权条件（时间/地点/风险等），空字典表示无条件。',
            ),
        ),
    ]
