from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('order', '0005_alter_order_payment_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='checkout_idempotency_key',
            field=models.CharField(
                blank=True,
                default=None,
                max_length=64,
                null=True,
                verbose_name='Checkout idempotency key',
            ),
        ),
        migrations.AddConstraint(
            model_name='order',
            constraint=models.UniqueConstraint(
                fields=('user', 'checkout_idempotency_key'),
                name='uniq_order_user_checkout_idempotency',
            ),
        ),
    ]
