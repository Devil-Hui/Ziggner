import secrets
import string
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

_SECURE_RANDOM = secrets.SystemRandom()


def generate_coupon_code():
    return ''.join(_SECURE_RANDOM.choices(string.ascii_uppercase + string.digits, k=8))


# 排除易混淆字符，保证推广码可人工读/念
_PROMO_ALPHABET = string.ascii_uppercase + string.digits
_PROMO_ALPHABET = _PROMO_ALPHABET.translate(str.maketrans('', '', 'O0I1L'))


def generate_promo_code(prefix='', length=6):
    """生成一个全局唯一的推广码（专属券入口）。"""
    for _ in range(20):
        c = (prefix or '') + ''.join(_SECURE_RANDOM.choices(_PROMO_ALPHABET, k=length))
        if not PromoCode.objects.filter(code=c).exists():
            return c
    raise RuntimeError('无法生成唯一的推广码，请稍后重试')


# ==================== 优惠券 ====================

class DiscountType(models.TextChoices):
    FIXED = 'fixed', 'Fixed Amount'
    PERCENT = 'percent', 'Percentage Off'


class CouponTargetAudience(models.TextChoices):
    ALL = 'all', 'All customers'
    NEW_USERS = 'new-users', 'New customers without payment history'
    RETURNING_USERS = 'returning-users', 'Returning customers with payment history'


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
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='优惠值',
    )
    min_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='最低消费门槛',
    )
    max_discount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name='最高折扣上限（百分比券用）',
    )
    stackable = models.BooleanField(default=False, verbose_name='可叠加')
    target_audience = models.CharField(
        max_length=32,
        choices=CouponTargetAudience.choices,
        default=CouponTargetAudience.ALL,
    )
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


class CouponApplication(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending approval'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        SCHEDULED = 'scheduled', 'Scheduled'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        EXPIRED = 'expired', 'Expired'

    coupon_name = models.CharField(max_length=100, default='')
    coupon_code = models.CharField(max_length=50, blank=True, default='')
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    min_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stackable = models.BooleanField(default=False)
    total_count = models.PositiveIntegerField(default=1000)
    per_user_limit = models.PositiveIntegerField(default=1)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    applicable_categories = models.JSONField(default=list, blank=True)
    applicable_products = models.JSONField(default=list, blank=True)
    applicable_brands = models.JSONField(default=list, blank=True)
    applicable_category_names = models.TextField(blank=True, default='')
    applicable_product_names = models.TextField(blank=True, default='')
    applicable_brand_names = models.TextField(blank=True, default='')
    expected_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_usage_count = models.PositiveIntegerField(default=0)
    target_audience = models.CharField(
        max_length=32,
        choices=CouponTargetAudience.choices,
        default=CouponTargetAudience.ALL,
    )
    campaign_purpose = models.TextField(blank=True, default='')
    reason = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    applicant = models.ForeignKey(
        'auth.User', on_delete=models.PROTECT, related_name='coupon_applications',
    )
    admin_group = models.ForeignKey(
        'goods.AdminGroup', null=True, blank=True, on_delete=models.PROTECT,
        related_name='coupon_applications',
    )
    reviewer = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reviewed_coupon_applications',
    )
    coupon = models.OneToOneField(
        Coupon, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='application',
    )
    review_comment = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promotion_coupon_application'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='idx_ca_status_created'),
            models.Index(fields=['applicant', '-created_at'], name='idx_ca_app_created'),
            models.Index(fields=['admin_group', 'status'], name='idx_ca_group_status'),
        ]


class CouponApprovalHistory(models.Model):
    application = models.ForeignKey(
        CouponApplication, on_delete=models.CASCADE, related_name='approval_history',
    )
    actor = models.ForeignKey('auth.User', null=True, on_delete=models.SET_NULL)
    from_status = models.CharField(max_length=20, blank=True, default='')
    to_status = models.CharField(max_length=20)
    comment = models.TextField(blank=True, default='')
    snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promotion_coupon_approval_history'
        ordering = ['created_at', 'id']


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


# ==================== 专属推广码（引流追踪） ====================

class PromoCode(models.Model):
    """推广码：一个基础券可挂多个推广码，按码追踪领取/下单/GMV。

    不同推广人（或渠道）持有不同推广码，但都指向同一张基础券的
    抵消效果。通过本表可统计每个推广码带来的独立用户数、付款订单数
    与引流 GMV（对应需求「专属优惠券 / 引流追踪」）。
    """

    coupon = models.ForeignKey(
        Coupon, on_delete=models.CASCADE, related_name='promo_codes',
        verbose_name='基础券',
    )
    code = models.CharField(
        max_length=32, unique=True, verbose_name='推广码',
        help_text='用户凭此码领取对应基础券',
    )
    name = models.CharField(
        max_length=128, default='', blank=True, verbose_name='渠道/推广人',
    )
    note = models.TextField(blank=True, default='', verbose_name='备注')
    is_active = models.BooleanField(default=True, verbose_name='启用')
    claim_count = models.PositiveIntegerField(default=0, verbose_name='领取数')
    paid_order_count = models.PositiveIntegerField(default=0, verbose_name='付款订单数')
    gmv = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        verbose_name='引流 GMV',
    )
    created_by = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='created_promo_codes', verbose_name='创建人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'promotion_promocode'
        verbose_name = '专属推广码'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['coupon']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f'{self.code} → {self.coupon.code}'


# ==================== 用户优惠券 ====================

class UserCoupon(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        LOCKED = 'locked', 'Locked'
        USED = 'used', 'Used'
        EXPIRED = 'expired', 'Expired'
        RETURNED = 'returned', 'Returned'

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
        choices=Status.choices,
        default=Status.AVAILABLE,
        verbose_name='状态',
    )
    claimed_at = models.DateTimeField(auto_now_add=True, verbose_name='领取时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    used_at = models.DateTimeField(null=True, blank=True, verbose_name='使用时间')
    locked_at = models.DateTimeField(null=True, blank=True, verbose_name='锁定时间')
    lock_expires_at = models.DateTimeField(null=True, blank=True, verbose_name='锁定过期时间')
    used_order_no = models.CharField(max_length=20, blank=True, default='',
                                     verbose_name='使用订单号')
    promo_code = models.ForeignKey(
        'PromoCode', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='user_coupons', verbose_name='推广码',
    )

    class Meta:
        db_table = 'promotion_user_coupon'
        verbose_name = '用户优惠券'
        verbose_name_plural = verbose_name
        app_label = 'promotion'
        ordering = ['-claimed_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_uc_user_status'),
            models.Index(fields=['coupon'], name='idx_uc_coupon'),
            models.Index(fields=['used_order_no'], name='idx_uc_order_no'),
            models.Index(fields=['promo_code'], name='idx_uc_promo_code'),
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
        validators=[MinValueValidator(Decimal('0.00'))],
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
