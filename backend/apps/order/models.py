import secrets
import string
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from apps.goods.models import SKU
from apps.promotion.models import UserCoupon

_SECURE_RANDOM = secrets.SystemRandom()


def generate_order_no():
    today = timezone.now().strftime('%Y%m%d')
    suffix = ''.join(_SECURE_RANDOM.choices(string.digits, k=6))
    return f'{today}{suffix}'


def generate_after_sale_no():
    today = timezone.now().strftime('%Y%m%d')
    suffix = ''.join(_SECURE_RANDOM.choices(string.digits, k=6))
    return f'AS{today}{suffix}'


# ==================== Order ====================

class OrderStatus(models.TextChoices):
    PENDING_PAYMENT = 'pending_payment', 'Pending Payment'
    PAID = 'paid', 'Paid'
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class PaymentStatus(models.TextChoices):
    UNPAID = 'unpaid', 'Unpaid'
    PAID = 'paid', 'Paid'
    REFUNDING = 'refunding', 'Refunding'
    PARTIALLY_REFUNDED = 'partially_refunded', 'Partially Refunded'
    REFUNDED = 'refunded', 'Refunded'


class PaymentMethod(models.TextChoices):
    ALIPAY = 'alipay', 'Alipay'
    WECHAT = 'wechat', 'WeChat Pay'
    CARD = 'card', 'Bank Card'
    PAYPAL = 'paypal', 'PayPal'
    STRIPE = 'stripe', 'Credit/Debit Card (Stripe)'


class Order(models.Model):
    order_no = models.CharField(
        max_length=20, unique=True, default=generate_order_no,
        verbose_name='订单号',
    )
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.PROTECT,
        related_name='orders',
        verbose_name='用户',
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING_PAYMENT,
        verbose_name='订单状态',
    )

    # 金额
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='商品总价',
    )
    actual_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='实付金额',
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    user_coupon = models.ForeignKey(
        'promotion.UserCoupon', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='orders',
    )
    coupon_snapshot = models.JSONField(default=dict, blank=True)
    payment_deadline = models.DateTimeField(null=True, blank=True)
    checkout_idempotency_key = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        default=None,
        verbose_name='Checkout idempotency key',
    )

    # 收货信息
    shipping_name = models.CharField(max_length=50, verbose_name='收货人')
    shipping_phone = models.CharField(max_length=20, verbose_name='收货电话')
    shipping_address = models.JSONField(default=dict, verbose_name='收货地址')

    # 币种
    currency = models.CharField(max_length=3, default='USD', verbose_name='结算币种')

    # 支付信息
    payment_method = models.CharField(
        max_length=20, blank=True, default='',
        choices=PaymentMethod.choices,
        verbose_name='支付方式',
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        verbose_name='支付状态',
    )
    payment_no = models.CharField(max_length=64, blank=True, default='', verbose_name='支付流水号')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='付款时间')

    # 物流
    tracking_no = models.CharField(max_length=50, blank=True, default='', verbose_name='快递单号')
    shipped_at = models.DateTimeField(null=True, blank=True, verbose_name='发货时间')
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name='签收时间')

    # 时间节点
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name='取消时间')

    # 备注
    cancel_reason = models.CharField(max_length=500, blank=True, default='', verbose_name='取消原因')
    buyer_remark = models.CharField(max_length=500, blank=True, default='', verbose_name='买家备注')
    seller_remark = models.CharField(max_length=500, blank=True, default='', verbose_name='卖家备注')
    version = models.PositiveIntegerField(default=0, verbose_name='乐观锁版本号')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'order_order'
        verbose_name = '订单'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['order_no']),
            models.Index(fields=['status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'checkout_idempotency_key'],
                name='uniq_order_user_checkout_idempotency',
            ),
        ]

    def __str__(self):
        return f'Order #{self.order_no}'

    # ---------- 状态流转 ----------

    @transaction.atomic
    def pay(self, payment_method, payment_no=''):
        if self.status != OrderStatus.PENDING_PAYMENT:
            raise ValueError(
                f'Cannot pay from status "{self.get_status_display()}". '
                f'Only Pending Payment orders can be paid.'
            )
        self.status = OrderStatus.PAID
        self.payment_status = PaymentStatus.PAID
        self.payment_method = payment_method
        self.payment_no = payment_no
        self.paid_at = timezone.now()
        self.save()
        from apps.promotion.services import PromotionService
        PromotionService.consume_for_order(self.order_no)

    @transaction.atomic
    def ship(self, tracking_no):
        if self.status != OrderStatus.PAID:
            raise ValueError(
                f'Cannot ship from status "{self.get_status_display()}". '
                f'Only Paid orders can be shipped.'
            )
        self.status = OrderStatus.SHIPPED
        self.tracking_no = tracking_no
        self.shipped_at = timezone.now()
        self.save()

    @transaction.atomic
    def deliver(self):
        if self.status != OrderStatus.SHIPPED:
            raise ValueError(
                f'Cannot deliver from status "{self.get_status_display()}". '
                f'Only Shipped orders can be delivered.'
            )
        self.status = OrderStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save()

    @transaction.atomic
    def complete(self):
        if self.status != OrderStatus.DELIVERED:
            raise ValueError(
                f'Cannot complete from status "{self.get_status_display()}". '
                f'Only Delivered orders can be completed.'
            )
        self.status = OrderStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save()

    @transaction.atomic
    def cancel(self, reason=''):
        if self.status != OrderStatus.PENDING_PAYMENT:
            raise ValueError(
                f'Cannot cancel from status "{self.get_status_display()}". '
                f'Only Pending Payment orders can be cancelled; paid orders require a refund.'
            )
        self._restore_stock()
        from apps.promotion.services import PromotionService
        PromotionService.release_for_order(self.order_no)
        self.status = OrderStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancel_reason = reason
        self.save()

    def _restore_stock(self):
        # 锁定 SKU 行防止并发恢复库存
        sku_ids = list(self.items.values_list('sku_id', flat=True))
        locked_skus = {
            s.id: s
            for s in SKU.objects.select_for_update().filter(id__in=sku_ids)
        }
        for item in self.items.all():
            sku = locked_skus.get(item.sku_id)
            if sku:
                sku.stock = models.F('stock') + item.quantity
                sku.save(update_fields=['stock'])

# ==================== OrderItem ====================

class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='订单',
    )
    sku = models.ForeignKey(
        'goods.SKU',
        on_delete=models.PROTECT,
        related_name='order_items',
        verbose_name='SKU',
    )
    spu_name = models.CharField(max_length=200, verbose_name='商品名称')
    sku_code = models.CharField(max_length=100, verbose_name='SKU 编码')
    spec_snapshot = models.JSONField(default=list, verbose_name='规格快照')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='下单时单价')
    quantity = models.PositiveIntegerField(verbose_name='数量')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='小计')

    class Meta:
        db_table = 'order_order_item'
        verbose_name = '订单项'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['order'], name='idx_orderitem_order'),
            models.Index(fields=['sku'], name='idx_orderitem_sku'),
        ]

    def __str__(self):
        return f'{self.spu_name} [{self.sku_code}] × {self.quantity}'


# ==================== AfterSale ====================

class AfterSaleType(models.TextChoices):
    RETURN = 'return', '退货退款'
    EXCHANGE = 'exchange', '换货'
    RESHIP = 'reship', '补发'


class AfterSaleStatus(models.TextChoices):
    PENDING_REVIEW = 'pending_review', 'Pending Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'


class AfterSale(models.Model):
    after_sale_no = models.CharField(
        max_length=20, unique=True, default=generate_after_sale_no,
        verbose_name='售后单号',
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name='after_sales',
        verbose_name='订单',
    )
    type = models.CharField(
        max_length=20, choices=AfterSaleType.choices,
        verbose_name='售后类型',
    )
    reason = models.TextField(verbose_name='申请原因')
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='退款金额',
    )
    status = models.CharField(
        max_length=20,
        choices=AfterSaleStatus.choices,
        default=AfterSaleStatus.PENDING_REVIEW,
        verbose_name='售后状态',
    )
    evidence = models.JSONField(default=list, verbose_name='凭证图片')
    admin_remark = models.CharField(max_length=500, blank=True, default='', verbose_name='审核意见')
    refunded_at = models.DateTimeField(null=True, blank=True, verbose_name='退款完成时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'order_after_sale'
        verbose_name = '售后单'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'AfterSale #{self.after_sale_no}'

    @transaction.atomic
    def approve(self, admin_remark=''):
        if self.status != AfterSaleStatus.PENDING_REVIEW:
            raise ValueError(
                f'Cannot approve from status "{self.get_status_display()}". '
                f'Only Pending Review after-sales can be approved.'
            )
        self.status = AfterSaleStatus.APPROVED
        self.admin_remark = admin_remark
        self.save()

    @transaction.atomic
    def reject(self, admin_remark=''):
        if self.status != AfterSaleStatus.PENDING_REVIEW:
            raise ValueError(
                f'Cannot reject from status "{self.get_status_display()}". '
                f'Only Pending Review after-sales can be rejected.'
            )
        self.status = AfterSaleStatus.REJECTED
        self.admin_remark = admin_remark
        self.save()

    @transaction.atomic
    def complete_refund(self):
        if self.status != AfterSaleStatus.APPROVED:
            raise ValueError(
                f'Cannot complete refund from status "{self.get_status_display()}". '
                f'Only Approved after-sales can be completed.'
            )
        self.status = AfterSaleStatus.COMPLETED
        self.refunded_at = timezone.now()
        # 恢复库存（退货场景）
        if self.type == AfterSaleType.RETURN:
            for item in self.order.items.all():
                item.sku.stock = models.F('stock') + item.quantity
                item.sku.save(update_fields=['stock'])
        # 更新订单支付状态
        self.order.payment_status = PaymentStatus.REFUNDED
        self.order.save(update_fields=['payment_status'])
        self.save()
