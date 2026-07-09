import random
import string

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


def generate_coupon_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


# ==================== 优惠券 ====================

class DiscountType(models.TextChoices):
    FIXED = 'fixed', 'Fixed Amount'
    PERCENT = 'percent', 'Percentage Off'


class Coupon(models.Model):
    name = models.CharField(
        max_length=128, default='', blank=True, verbose_name='优惠券名称',
    )
    code = models.CharField(
        max_length=50, unique=True, default=generate_coupon_code, verbose_name='券码',
    )
    discount_type = models.CharField(
        max_length=20, choices=DiscountType.choices,
        default=DiscountType.FIXED,
        verbose_name='优惠类型',
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='优惠值',
    )
    min_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        verbose_name='最低消费门槛',
    )
    max_discount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name='最高折扣上限（百分比券用）',
    )
    stackable = models.BooleanField(default=False, verbose_name='可叠加')
    per_user_limit = models.PositiveIntegerField(default=1, verbose_name='每人限领数量')
    total_count = models.PositiveIntegerField(default=0, verbose_name='发行总量')
    claimed_count = models.PositiveIntegerField(default=0, verbose_name='已领取数量')
    used_count = models.PositiveIntegerField(default=0, verbose_name='已使用数量')
    start_time = models.DateTimeField(verbose_name='开始时间')
    end_time = models.DateTimeField(verbose_name='结束时间')
    is_active = models.BooleanField(default=True, verbose_name='启用')
    created_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_coupons',
        verbose_name='创建人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'promotion_coupon'
        verbose_name = '优惠券'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active', 'start_time', 'end_time']),
        ]

    def __str__(self):
        return f'{self.code} [{self.get_discount_type_display()}]'

    @property
    def remaining(self):
        return max(0, self.total_count - self.claimed_count)

    @property
    def is_available(self):
        now = timezone.now()
        return self.is_active and self.remaining > 0 and self.start_time <= now <= self.end_time


# ==================== 优惠券适用范围 ====================

class CouponScope(models.Model):
    class ScopeType(models.TextChoices):
        SPU = 'spu', 'SPU'
        CATEGORY = 'category', 'Category'
        BRAND = 'brand', 'Brand'

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name='scopes',
        verbose_name='优惠券',
    )
    scope_type = models.CharField(
        max_length=20,
        choices=ScopeType.choices,
        verbose_name='范围类型',
    )
    target_id = models.PositiveIntegerField(verbose_name='目标 ID')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(default=timezone.now, verbose_name='更新时间')

    class Meta:
        db_table = 'promotion_coupon_scope'
        verbose_name = '优惠券适用范围'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        unique_together = [('coupon', 'scope_type', 'target_id')]
        indexes = [
            models.Index(fields=['coupon']),
            models.Index(fields=['scope_type', 'target_id']),
        ]

    def __str__(self):
        return f'{self.coupon.code} → {self.get_scope_type_display()}#{self.target_id}'


# ==================== 用户优惠券 ====================

class UserCoupon(models.Model):
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='user_coupons',
        verbose_name='用户',
    )
    coupon = models.ForeignKey(
        Coupon, on_delete=models.CASCADE, related_name='user_coupons',
        verbose_name='优惠券',
    )
    status = models.CharField(
        max_length=20,
        choices=[('unused', 'Unused'), ('used', 'Used'), ('expired', 'Expired')],
        default='unused',
        verbose_name='状态',
    )
    claimed_at = models.DateTimeField(auto_now_add=True, verbose_name='领取时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    used_at = models.DateTimeField(null=True, blank=True, verbose_name='使用时间')
    used_order_no = models.CharField(max_length=20, blank=True, default='',
                                     verbose_name='使用订单号')

    class Meta:
        db_table = 'promotion_user_coupon'
        verbose_name = '用户优惠券'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        unique_together = [('user', 'coupon')]
        ordering = ['-claimed_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_uc_user_status'),
            models.Index(fields=['coupon'], name='idx_uc_coupon'),
            models.Index(fields=['used_order_no'], name='idx_uc_order_no'),
        ]

    def __str__(self):
        return f'{self.user.username} — {self.coupon.code}'


# ==================== 折扣活动 ====================

class ActivityType(models.TextChoices):
    FULL_REDUCTION = 'full_reduction', 'Full Reduction'
    PERCENT_OFF = 'percent_off', 'Percent Off'
    EACH_FULL = 'each_full', 'Each Full'


class DiscountActivity(models.Model):
    name = models.CharField(max_length=200, verbose_name='活动名称')
    type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
        verbose_name='活动类型',
    )
    rule = models.JSONField(default=list, verbose_name='活动规则')
    start_time = models.DateTimeField(verbose_name='开始时间')
    end_time = models.DateTimeField(verbose_name='结束时间')
    created_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_activities',
        verbose_name='创建人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'promotion_activity'
        verbose_name = '折扣活动'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['start_time', 'end_time']),
        ]

    def __str__(self):
        return f'{self.name} [{self.get_type_display()}]'

    @property
    def is_active(self):
        now = timezone.now()
        return self.start_time <= now <= self.end_time


# ==================== 活动 SKU 关联 ====================

class ActivitySKURelation(models.Model):
    activity = models.ForeignKey(
        DiscountActivity,
        on_delete=models.CASCADE,
        related_name='sku_relations',
        verbose_name='活动',
    )
    sku = models.ForeignKey(
        'goods.SKU',
        on_delete=models.CASCADE,
        related_name='activity_relations',
        verbose_name='SKU',
    )
    activity_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='活动价',
    )
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(default=timezone.now, verbose_name='更新时间')

    class Meta:
        db_table = 'promotion_activity_sku'
        verbose_name = '活动 SKU 关联'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        unique_together = [('activity', 'sku')]
        indexes = [
            models.Index(fields=['activity']),
            models.Index(fields=['sku']),
        ]

    def __str__(self):
        return f'{self.activity.name} → SKU#{self.sku_id} ¥{self.activity_price}'