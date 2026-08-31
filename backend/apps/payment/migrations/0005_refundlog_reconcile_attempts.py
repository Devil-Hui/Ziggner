from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('payment', '0004_refund_idempotency')]

    operations = [
        migrations.AddField(
            model_name='refundlog',
            name='reconcile_attempts',
            field=models.PositiveIntegerField(
                default=0,
                help_text='UNKNOWN 退款被 reconcile_unknown_refunds 重试的次数，超过上限后标记为 FAILED，防止无限重试',
                verbose_name='对账重试次数',
            ),
        ),
    ]