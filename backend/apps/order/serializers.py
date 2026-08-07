from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from .models import Order, OrderItem, AfterSale


def validate_shipping_address(value):
    """校验 shipping_address JSON 结构，必须包含国家/省/市/详细地址"""
    if not isinstance(value, dict):
        raise DjangoValidationError('shipping_address must be a JSON object')
    required_fields = ['country', 'region', 'city', 'address_line']
    missing = [f for f in required_fields if not value.get(f)]
    if missing:
        raise DjangoValidationError(
            'shipping_address missing required fields: %s' % ', '.join(missing)
        )
    # 校验字段长度
    for field in ['name', 'phone', 'country', 'region', 'city', 'address_line']:
        if field in value and isinstance(value[field], str) and len(value[field]) > 100:
            raise DjangoValidationError(
                'shipping_address.%s exceeds max length of 100' % field
            )


class OrderItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'spu_name', 'sku_code', 'spec_snapshot',
                  'price', 'quantity', 'subtotal', 'image_url']

    def get_image_url(self, obj) -> str:
        return obj.sku.image_url or obj.sku.spu.main_image or ''


class AfterSaleSerializer(serializers.ModelSerializer):
    order_no = serializers.CharField(source='order.order_no', read_only=True)

    class Meta:
        model = AfterSale
        fields = ['id', 'after_sale_no', 'order_no', 'type', 'reason', 'amount',
                  'status', 'evidence', 'admin_remark', 'refunded_at',
                  'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data['reason'] = '已脱敏'
            data['evidence'] = []
        return data


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'order_no', 'status', 'total_amount',
                  'actual_amount', 'payment_status', 'item_count',
                  'created_at']

    def get_item_count(self, obj) -> int:
        if isinstance(obj, dict):
            return obj.get('_item_count', 0)
        return getattr(obj, '_item_count', obj.items.count())


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    after_sales = AfterSaleSerializer(many=True, read_only=True)
    payment_remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'order_no', 'status', 'total_amount',
                  'actual_amount', 'discount_amount', 'coupon_snapshot',
                  'payment_deadline', 'payment_remaining_seconds', 'user_coupon_id',
                  'shipping_name', 'shipping_phone',
                  'shipping_address', 'payment_method', 'payment_status',
                  'payment_no', 'paid_at', 'tracking_no', 'shipped_at',
                  'delivered_at', 'completed_at', 'cancelled_at',
                  'cancel_reason', 'buyer_remark',
                  'items', 'after_sales', 'created_at', 'updated_at']

    def get_payment_remaining_seconds(self, obj) -> int:
        if obj.status != 'pending_payment' or obj.payment_deadline is None:
            return 0
        return max(0, int((obj.payment_deadline - timezone.now()).total_seconds()))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data.update({
                'shipping_name': '已脱敏',
                'shipping_phone': '',
                'shipping_address': {},
                'payment_no': '',
                'buyer_remark': '',
            })
        return data


class CheckoutSerializer(serializers.Serializer):
    cart_item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=1, max_length=50,
        help_text='List of cart item IDs to checkout (max 50)',
    )
    shipping_name = serializers.CharField(max_length=50)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.JSONField(validators=[validate_shipping_address])
    payment_method = serializers.CharField(max_length=20, required=False, default='')
    buyer_remark = serializers.CharField(max_length=500, required=False, default='')
    user_coupon_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    coupon_code = serializers.CharField(max_length=50, required=False, default='')
    idempotency_key = serializers.CharField(max_length=64, required=False, default='', help_text='幂等键，防止重复提交')

    def validate(self, attrs):
        if attrs.get('user_coupon_id') and attrs.get('coupon_code'):
            raise serializers.ValidationError('user_coupon_id and coupon_code are mutually exclusive')
        return attrs


class CancelOrderSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, default='')


class ApplyAfterSaleSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[
        ('return', '退货退款'),
        ('exchange', '换货'),
        ('reship', '补发'),
    ])
    reason = serializers.CharField(max_length=1000)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    evidence = serializers.ListField(
        child=serializers.URLField(),
        required=False, default=list, max_length=5,
    )


class ShipOrderSerializer(serializers.Serializer):
    tracking_no = serializers.CharField(max_length=50, allow_blank=False)


class AfterSaleReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject', 'complete_refund'])
    admin_remark = serializers.CharField(max_length=500, required=False, default='', allow_blank=True)
