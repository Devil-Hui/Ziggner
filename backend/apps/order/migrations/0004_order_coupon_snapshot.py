from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('order', '0003_order_version_alter_order_payment_method'),
        ('promotion', '0006_coupon_lifecycle'),
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
        migrations.AddField(model_name='order', name='discount_amount', field=models.DecimalField(decimal_places=2, default=0, max_digits=10)),
        migrations.AddField(model_name='order', name='coupon_snapshot', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='order', name='payment_deadline', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(
            model_name='order', name='user_coupon',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='promotion.usercoupon'),
        ),
    ]
