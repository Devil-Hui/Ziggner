# Generated manually for SPU online preview URL (网页搭建类虚拟商品在线预览)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('goods', '0022_spu_multilingual_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='spu',
            name='preview_url',
            field=models.CharField(blank=True, default='', max_length=500, verbose_name='在线预览 URL'),
        ),
    ]