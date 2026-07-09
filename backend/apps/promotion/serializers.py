from rest_framework import serializers
from .models import Coupon, UserCoupon, DiscountActivity


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'name', 'code', 'discount_type', 'amount', 'min_amount',
                  'max_discount', 'stackable', 'per_user_limit',
                  'total_count', 'claimed_count',
                  'start_time', 'end_time', 'is_active', 'created_at']


class CouponAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'name', 'code', 'discount_type', 'amount', 'min_amount',
                  'max_discount', 'stackable', 'per_user_limit',
                  'total_count', 'claimed_count',
                  'start_time', 'end_time', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        """兼容 discount_value → amount 字段别名"""
        if 'discount_value' in self.initial_data and 'amount' not in attrs:
            attrs['amount'] = self.initial_data['discount_value']
        if 'discount' in self.initial_data and 'amount' not in attrs:
            attrs['amount'] = self.initial_data['discount']
        return attrs


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountActivity
        fields = ['id', 'name', 'type', 'rule', 'start_time', 'end_time', 'created_at']


class ActivityAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountActivity
        fields = ['id', 'name', 'type', 'rule', 'start_time', 'end_time', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserCouponSerializer(serializers.ModelSerializer):
    coupon = CouponSerializer(read_only=True)

    class Meta:
        model = UserCoupon
        fields = ['id', 'coupon', 'status', 'claimed_at', 'used_at', 'used_order_no']


class ClaimCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)


class GenerateCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=False)
    discount_type = serializers.ChoiceField(choices=['fixed', 'percent'])
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    min_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    total_count = serializers.IntegerField(default=1000, min_value=1)
    stackable = serializers.BooleanField(default=False)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()