# Generated manually for SPU multilingual fields (name_en/name_ar/description_en/description_ar)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('goods', '0021_tag_tag_type_alter_tag_color_tag_idx_tag_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='spu',
            name='name_en',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='商品名称（英文）'),
        ),
        migrations.AddField(
            model_name='spu',
            name='description_en',
            field=models.TextField(blank=True, default='', verbose_name='商品描述（英文）'),
        ),
        migrations.AddField(
            model_name='spu',
            name='name_ar',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='商品名称（阿拉伯语）'),
        ),
        migrations.AddField(
            model_name='spu',
            name='description_ar',
            field=models.TextField(blank=True, default='', verbose_name='商品描述（阿拉伯语）'),
        ),
    ]