from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('payment', '0001_initial')]
    operations = [
        migrations.CreateModel(
            name='PaymentEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gateway', models.CharField(max_length=20)),
                ('event_id', models.CharField(max_length=255)),
                ('event_type', models.CharField(max_length=80)),
                ('payload', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('payment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='payment.paymentlog')),
            ],
            options={
                'db_table': 'payment_event',
                'indexes': [models.Index(fields=['gateway', 'event_id'], name='payment_eve_gateway_47b762_idx')],
                'constraints': [models.UniqueConstraint(fields=('gateway', 'event_id'), name='uniq_payment_gateway_event')],
            },
        ),
    ]
