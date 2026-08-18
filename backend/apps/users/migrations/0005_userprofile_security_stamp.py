from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_remove_smsverificationcode_and_phone_verified'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='security_stamp',
            field=models.CharField(
                blank=True,
                default='',
                editable=False,
                max_length=64,
                help_text='安全戳：角色/密码等安全变更时旋转，使旧会话失效',
            ),
        ),
    ]
