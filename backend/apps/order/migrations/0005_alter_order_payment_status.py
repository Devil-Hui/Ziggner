from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('order', '0004_order_coupon_snapshot'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('unpaid', 'Unpaid'),
                    ('paid', 'Paid'),
                    ('refunding', 'Refunding'),
                    ('partially_refunded', 'Partially Refunded'),
                    ('refunded', 'Refunded'),
                ],
                default='unpaid',
                max_length=20,
                verbose_name='支付状态',
            ),
        ),
    ]
