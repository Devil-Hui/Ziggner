from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('goods', '0013_add_spu_specs_json'),
    ]

    operations = [
        migrations.AddField(
            model_name='sku',
            name='version',
            field=models.PositiveIntegerField(default=0, verbose_name='版本号'),
        ),
    ]
