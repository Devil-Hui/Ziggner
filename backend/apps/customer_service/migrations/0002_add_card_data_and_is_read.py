# Generated manually: add product_card msg_type, card_data, is_read

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customer_service', '0001_initial'),
    ]

    operations = [
        # 1. 新增 card_data JSONField
        migrations.AddField(
            model_name='message',
            name='card_data',
            field=models.JSONField(
                blank=True, default=dict,
                verbose_name='卡片数据',
                help_text='商品卡片结构化数据: {product_name, product_image, price, product_id, order_id, order_status, spu_id, sku_id}',
            ),
        ),
        # 2. 新增 is_read 布尔字段
        migrations.AddField(
            model_name='message',
            name='is_read',
            field=models.BooleanField(default=False, verbose_name='已读'),
        ),
        # 3. 更新 msg_type 字段，添加 product_card 选项
        migrations.AlterField(
            model_name='message',
            name='msg_type',
            field=models.CharField(
                choices=[
                    ('text', '文字'),
                    ('image', '图片'),
                    ('video', '视频'),
                    ('product_link', '商品链接'),
                    ('cart_share', '购物车分享'),
                    ('product_card', '商品卡片'),
                ],
                default='text',
                max_length=16,
                verbose_name='消息类型',
            ),
        ),
        # 4. 新增复合索引 (conversation, is_read, sender_type)
        migrations.AddIndex(
            model_name='message',
            index=models.Index(
                fields=['conversation', 'is_read', 'sender_type'],
                name='cs_msg_conv_read_sender_idx',
            ),
        ),
    ]
