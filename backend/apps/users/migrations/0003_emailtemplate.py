import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_socialaccount'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('template_type', models.CharField(choices=[('verify_code', '邮箱验证码'), ('order_notice', '订单通知'), ('reset_password', '密码重置')], max_length=32, unique=True, verbose_name='模板类型')),
                ('subject', models.CharField(max_length=200, verbose_name='邮件主题')),
                ('html_body', models.TextField(help_text='支持 {code} 占位符', verbose_name='HTML 正文')),
                ('text_body', models.TextField(blank=True, help_text='支持 {code} 占位符', verbose_name='纯文本正文')),
                ('is_active', models.BooleanField(default=True, verbose_name='启用')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '邮件模板',
                'verbose_name_plural': '邮件模板',
                'db_table': 'users_email_template',
            },
        ),
    ]
