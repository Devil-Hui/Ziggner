import random
import string

from django.db import models
from django.utils import timezone


def generate_payment_no():
    return timezone.now().strftime('%Y%m%d%H%M%S') + ''.join(random.choices(string.digits, k=6))


class PaymentMethod(models.TextChoices):
    PAYPAL = 'paypal', 'PayPal'
    STRIPE = 'stripe', 'Stripe'
    ALIPAY = 'alipay', 'Alipay'


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SUCCESS = 'success', 'Success'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'
    CANCELLED = 'cancelled', 'Cancelled'


class PaymentLog(models.Model):
    user = models.ForeignKey(
        'auth.User', on_delete=models.PROTECT, related_name='payments',
        verbose_name='用户',
    )
    order = models.ForeignKey(
        'order.Order', on_delete=models.PROTECT, related_name='payment_logs',
        verbose_name='订单',
    )
    payment_no = models.CharField(max_length=32, unique=True, default=generate_payment_no,
                                  verbose_name='支付流水号')
    currency = models.CharField(max_length=3, default='USD', verbose_name='支付币种')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='支付金额')
    method = models.CharField(max_length=20, choices=PaymentMethod.choices,
                              verbose_name='支付方式')
    status = models.CharField(max_length=20, choices=PaymentStatus.choices,
                              default=PaymentStatus.PENDING, verbose_name='支付状态')
    gateway_payment_id = models.CharField(max_length=255, blank=True, default='',
                                          verbose_name='网关支付ID')
    gateway_data = models.JSONField(default=dict, verbose_name='网关原始数据')
    remark = models.CharField(max_length=200, blank=True, default='', verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'payment_payment_log'
        verbose_name = '支付记录'
        verbose_name_plural = verbose_name
        app_label = 'payment'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['order']),
            models.Index(fields=['gateway_payment_id']),
        ]

    def __str__(self):
        return f'Payment #{self.payment_no} [{self.get_method_display()}] — {self.amount}'


def generate_refund_no():
    return 'RF' + timezone.now().strftime('%Y%m%d%H%M%S') + ''.join(random.choices(string.digits, k=6))


class RefundLog(models.Model):
    """退款记录"""
    payment = models.ForeignKey(
        PaymentLog, on_delete=models.PROTECT, related_name='refunds',
        verbose_name='原支付记录',
    )
    refund_no = models.CharField(max_length=32, unique=True, default=generate_refund_no,
                                 verbose_name='退款流水号')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='退款金额')
    reason = models.CharField(max_length=500, default='', verbose_name='退款原因')
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('processing', 'Processing'), ('success', 'Success'), ('failed', 'Failed')],
        default='pending',
        verbose_name='退款状态',
    )
    gateway_refund_id = models.CharField(max_length=255, blank=True, default='', verbose_name='网关退款ID')
    gateway_data = models.JSONField(default=dict, verbose_name='网关原始数据')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'payment_refund_log'
        verbose_name = '退款记录'
        verbose_name_plural = verbose_name
        app_label = 'payment'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment']),
            models.Index(fields=['refund_no']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'Refund #{self.refund_no} [{self.status}] — {self.amount}'
