from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Carrier',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, verbose_name='承运商名称')),
                ('code', models.CharField(max_length=50, unique=True, verbose_name='编码')),
                ('api_base_url', models.URLField(blank=True, default='', verbose_name='API 地址')),
                ('tracking_url_template', models.URLField(blank=True, default='', verbose_name='追踪页模板')),
                ('is_active', models.BooleanField(default=True, verbose_name='启用')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'logistics_carrier',
                'verbose_name': '物流承运商',
                'verbose_name_plural': '物流承运商',
                'app_label': 'logistics',
            },
        ),
        migrations.CreateModel(
            name='ShippingRate',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('rate_type', models.CharField(choices=[('weight', '按重量'), ('price', '按价格'), ('fixed', '固定费用')], max_length=20, verbose_name='计费方式')),
                ('min_value', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='最小值')),
                ('max_value', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='最大值')),
                ('price', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='费用')),
                ('region', models.CharField(blank=True, default='', max_length=100, verbose_name='地区（空=全国）')),
                ('is_active', models.BooleanField(default=True, verbose_name='启用')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('carrier', models.ForeignKey(on_delete=models.CASCADE, related_name='rates', to='logistics.carrier', verbose_name='承运商')),
            ],
            options={
                'db_table': 'logistics_shipping_rate',
                'verbose_name': '运费规则',
                'verbose_name_plural': '运费规则',
                'app_label': 'logistics',
            },
        ),
        migrations.CreateModel(
            name='Shipment',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('pending', '待发货'), ('shipped', '已发货'), ('in_transit', '运输中'), ('delivered', '已签收'), ('exception', '异常')], default='pending', max_length=20, verbose_name='状态')),
                ('shipping_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='运费')),
                ('tracking_no', models.CharField(blank=True, default='', max_length=100, verbose_name='运单号')),
                ('shipped_at', models.DateTimeField(blank=True, null=True, verbose_name='发货时间')),
                ('estimated_delivery', models.DateTimeField(blank=True, null=True, verbose_name='预计送达')),
                ('actual_delivery', models.DateTimeField(blank=True, null=True, verbose_name='实际送达')),
                ('tracking_history', models.JSONField(default=list, verbose_name='追踪历史')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('carrier', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, to='logistics.carrier', verbose_name='承运商')),
                ('order', models.OneToOneField(on_delete=models.CASCADE, related_name='shipment', to='order.order', verbose_name='订单')),
            ],
            options={
                'db_table': 'logistics_shipment',
                'verbose_name': '物流发货',
                'verbose_name_plural': '物流发货',
                'app_label': 'logistics',
            },
        ),
        migrations.AddIndex(
            model_name='shippingrate',
            index=models.Index(fields=['carrier', 'min_value'], name='idx_sr_carrier_min'),
        ),
        migrations.AddIndex(
            model_name='shipment',
            index=models.Index(fields=['order'], name='idx_ship_order'),
        ),
        migrations.AddIndex(
            model_name='shipment',
            index=models.Index(fields=['tracking_no'], name='idx_ship_tracking'),
        ),
        migrations.AddIndex(
            model_name='shipment',
            index=models.Index(fields=['status'], name='idx_ship_status'),
        ),
    ]
