from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('promotion', '0008_alter_coupon_amount'),
    ]

    operations = [
        migrations.AlterField(
            model_name='coupon',
            name='target_audience',
            field=models.CharField(
                choices=[
                    ('all', 'All customers'),
                    ('new-users', 'New customers without payment history'),
                    ('returning-users', 'Returning customers with payment history'),
                ],
                default='all',
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name='couponapplication',
            name='target_audience',
            field=models.CharField(
                choices=[
                    ('all', 'All customers'),
                    ('new-users', 'New customers without payment history'),
                    ('returning-users', 'Returning customers with payment history'),
                ],
                default='all',
                max_length=32,
            ),
        ),
    ]
