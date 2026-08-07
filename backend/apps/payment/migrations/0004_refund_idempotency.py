import apps.payment.models
from django.db import migrations, models


def prepare_refund_rows(apps, schema_editor):
    RefundLog = apps.get_model('payment', 'RefundLog')
    for refund in RefundLog.objects.all().iterator(chunk_size=200):
        refund.idempotency_key = f'legacy-{refund.pk}-{refund.refund_no}'
        refund.gateway_request_id = f'legacy-{refund.refund_no}'
        if refund.status == 'success':
            refund.status = 'succeeded'
        elif refund.status == 'processing':
            refund.status = 'unknown'
        refund.save(update_fields=['idempotency_key', 'gateway_request_id', 'status'])


def restore_legacy_statuses(apps, schema_editor):
    RefundLog = apps.get_model('payment', 'RefundLog')
    RefundLog.objects.filter(status='succeeded').update(status='success')
    RefundLog.objects.filter(status='unknown').update(status='processing')


class Migration(migrations.Migration):
    dependencies = [('payment', '0003_refundlog_and_more')]

    operations = [
        migrations.AddField(
            model_name='refundlog',
            name='idempotency_key',
            field=models.CharField(max_length=128, null=True, verbose_name='客户端幂等键'),
        ),
        migrations.AddField(
            model_name='refundlog',
            name='gateway_request_id',
            field=models.CharField(max_length=64, null=True, verbose_name='网关请求ID'),
        ),
        migrations.RunPython(prepare_refund_rows, restore_legacy_statuses),
        migrations.AlterField(
            model_name='refundlog',
            name='idempotency_key',
            field=models.CharField(max_length=128, verbose_name='客户端幂等键'),
        ),
        migrations.AlterField(
            model_name='refundlog',
            name='gateway_request_id',
            field=models.CharField(
                default=apps.payment.models.generate_gateway_request_id,
                max_length=64,
                unique=True,
                verbose_name='网关请求ID',
            ),
        ),
        migrations.AlterField(
            model_name='refundlog',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('succeeded', 'Succeeded'),
                    ('failed', 'Failed'),
                    ('unknown', 'Unknown'),
                ],
                default='pending',
                max_length=20,
                verbose_name='退款状态',
            ),
        ),
        migrations.AddConstraint(
            model_name='refundlog',
            constraint=models.UniqueConstraint(
                fields=('payment', 'idempotency_key'),
                name='uniq_refund_payment_idempotency',
            ),
        ),
    ]
