# Generated manually for customer_service app

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(blank=True, default='', max_length=255, verbose_name='主题')),
                ('status', models.CharField(choices=[('open', '进行中'), ('closed', '已关闭')], default='open', max_length=16, verbose_name='状态')),
                ('user_msg_count', models.PositiveIntegerField(default=0, verbose_name='用户消息计数')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('admin', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cs_assigned_conversations', to=settings.AUTH_USER_MODEL, verbose_name='处理客服')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cs_conversations', to=settings.AUTH_USER_MODEL, verbose_name='用户')),
            ],
            options={
                'verbose_name': '客服会话',
                'verbose_name_plural': '客服会话',
                'db_table': 'customer_service_conversation',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sender_type', models.CharField(choices=[('user', '用户'), ('admin', '客服')], max_length=8, verbose_name='发送者类型')),
                ('content', models.TextField(blank=True, default='', verbose_name='文字内容')),
                ('msg_type', models.CharField(choices=[('text', '文字'), ('image', '图片'), ('video', '视频'), ('product_link', '商品链接'), ('cart_share', '购物车分享')], default='text', max_length=16, verbose_name='消息类型')),
                ('file_url', models.CharField(blank=True, default='', max_length=500, verbose_name='文件URL')),
                ('metadata', models.JSONField(blank=True, default=dict, verbose_name='附加数据')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='发送时间')),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='customer_service.conversation', verbose_name='对话')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cs_messages', to=settings.AUTH_USER_MODEL, verbose_name='发送者')),
            ],
            options={
                'verbose_name': '客服消息',
                'verbose_name_plural': '客服消息',
                'db_table': 'customer_service_message',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['user', 'status'], name='cs_conv_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['status'], name='cs_conv_status_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['admin', 'status'], name='cs_conv_admin_status_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['conversation', 'created_at'], name='cs_msg_conv_created_idx'),
        ),
    ]
