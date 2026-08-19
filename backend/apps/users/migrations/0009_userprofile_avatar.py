from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_seed_admin_welcome_template'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='avatar',
            field=models.CharField(blank=True, default='', help_text='用户头像（R2/本地存储的完整 URL）', max_length=500, verbose_name='头像 URL'),
        ),
    ]
