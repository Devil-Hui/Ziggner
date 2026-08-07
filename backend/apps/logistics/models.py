from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Carrier(models.Model):
    """物流承运商"""
    name = models.CharField(max_length=100, verbose_name='承运商名称')
    code = models.CharField(max_length=50, unique=True, verbose_name='编码')
    api_base_url = models.URLField(blank=True, default='', verbose_name='API 地址')
    tracking_url_template = models.URLField(blank=True, default='', verbose_name='追踪页模板')
    is_active = models.BooleanField(default=True, verbose_name='启用')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'logistics_carrier'
        verbose_name = '物流承运商'
        verbose_name_plural = verbose_name
        app_label = 'logistics'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class ShippingRate(models.Model):
    """运费规则"""
    class RateType(models.TextChoices):
        WEIGHT = 'weight', '按重量'
        PRICE = 'price', '按价格'
        FIXED = 'fixed', '固定费用'

    carrier = models.ForeignKey(Carrier, on_delete=models.CASCADE, related_name='rates')
    rate_type = models.CharField(max_length=20, choices=RateType.choices, verbose_name='计费方式')
    min_value = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='最小值')
    max_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='最大值')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='费用')
    region = models.CharField(max_length=100, blank=True, default='', verbose_name='地区（空=全国）')
    is_active = models.BooleanField(default=True, verbose_name='启用')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'logistics_shipping_rate'
        verbose_name = '运费规则'
        verbose_name_plural = verbose_name
        app_label = 'logistics'
        ordering = ['carrier', 'min_value']

    def __str__(self):
        return f'{self.carrier.name}: {self.get_rate_type_display()} {self.min_value}→{self.price}'


class Shipment(models.Model):
    """物流发货记录"""
    class Status(models.TextChoices):
        PENDING = 'pending', '待发货'
        SHIPPED = 'shipped', '已发货'
        IN_TRANSIT = 'in_transit', '运输中'
        DELIVERED = 'delivered', '已签收'
        EXCEPTION = 'exception', '异常'

    order = models.OneToOneField(
        'order.Order', on_delete=models.CASCADE,
        related_name='shipment', verbose_name='订单',
    )
    carrier = models.ForeignKey(Carrier, on_delete=models.SET_NULL, null=True, verbose_name='承运商')
    tracking_no = models.CharField(max_length=100, blank=True, default='', verbose_name='运单号')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name='状态')
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='运费')
    shipped_at = models.DateTimeField(null=True, blank=True, verbose_name='发货时间')
    estimated_delivery = models.DateTimeField(null=True, blank=True, verbose_name='预计送达')
    actual_delivery = models.DateTimeField(null=True, blank=True, verbose_name='实际送达')
    tracking_history = models.JSONField(default=list, verbose_name='追踪历史')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'logistics_shipment'
        verbose_name = '物流发货'
        verbose_name_plural = verbose_name
        app_label = 'logistics'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['tracking_no']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Order#{self.order.order_no}: {self.get_status_display()}'
