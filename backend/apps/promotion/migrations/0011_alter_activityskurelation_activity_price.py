from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('promotion', '0010_promocode_usercoupon_promo_code_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='activityskurelation',
            name='activity_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=10,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal('0.00'))],
                verbose_name='活动价（留空=不参与直降）',
            ),
        ),
    ]
