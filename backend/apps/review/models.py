from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Review(models.Model):
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='reviews',
        verbose_name='用户',
    )
    spu = models.ForeignKey(
        'goods.SPU', on_delete=models.CASCADE, related_name='reviews',
        verbose_name='商品',
    )
    order_item = models.ForeignKey(
        'order.OrderItem', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reviews', verbose_name='订单项',
    )
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE,
        related_name='replies', verbose_name='父评价（回复）',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='评分',
    )
    content = models.TextField(blank=True, default='', verbose_name='评价内容')
    images = models.JSONField(default=list, verbose_name='晒图')
    is_anonymous = models.BooleanField(default=False, verbose_name='匿名')
    is_active = models.BooleanField(default=True, verbose_name='显示')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='评价时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'review_review'
        verbose_name = '商品评价'
        verbose_name_plural = verbose_name
        unique_together = [('user', 'order_item')]
        app_label = 'review'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['spu', 'is_active']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f'{self.user.username} → {self.spu.name} ({self.rating}★)'
