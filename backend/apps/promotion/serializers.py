from decimal import Decimal

from rest_framework import serializers
from .models import (
    Coupon,
    CouponApplication,
    CouponApprovalHistory,
    CouponTargetAudience,
    DiscountActivity,
    UserCoupon,
)


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
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    min_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    total_count = serializers.IntegerField(default=1000, min_value=1)
    stackable = serializers.BooleanField(default=False)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()


class CouponApprovalHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True, allow_null=True)

    class Meta:
        model = CouponApprovalHistory
        fields = [
            'id', 'actor_name', 'from_status', 'to_status', 'comment',
            'snapshot', 'created_at',
        ]


class CouponApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source='applicant.username', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True, allow_null=True)
    admin_group_name = serializers.CharField(source='admin_group.name', read_only=True, allow_null=True)
    approval_history = CouponApprovalHistorySerializer(many=True, read_only=True)

    class Meta:
        model = CouponApplication
        fields = [
            'id', 'coupon_name', 'coupon_code', 'discount_type', 'amount',
            'min_amount', 'max_discount', 'stackable', 'total_count',
            'per_user_limit', 'start_time', 'end_time',
            'applicable_categories', 'applicable_products', 'applicable_brands',
            'applicable_category_names', 'applicable_product_names',
            'applicable_brand_names', 'expected_cost', 'expected_usage_count',
            'target_audience', 'campaign_purpose', 'reason', 'status',
            'applicant_name', 'admin_group', 'admin_group_name', 'reviewer_name',
            'review_comment', 'submitted_at', 'reviewed_at', 'coupon',
            'approval_history', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'applicant_name', 'admin_group', 'admin_group_name',
            'reviewer_name', 'review_comment', 'submitted_at', 'reviewed_at',
            'coupon', 'approval_history', 'created_at', 'updated_at',
        ]


class CouponApplicationDraftSerializer(serializers.ModelSerializer):
    admin_group_id = serializers.IntegerField(min_value=1, write_only=True)

    class Meta:
        model = CouponApplication
        fields = [
            'admin_group_id', 'coupon_name', 'coupon_code', 'discount_type',
            'amount', 'min_amount', 'max_discount', 'stackable', 'total_count',
            'per_user_limit', 'start_time', 'end_time',
            'applicable_categories', 'applicable_products', 'applicable_brands',
            'expected_cost', 'expected_usage_count', 'target_audience',
            'campaign_purpose', 'reason',
        ]

    def validate(self, attrs):
        if attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError({'end_time': '结束时间必须晚于开始时间。'})
        if attrs['per_user_limit'] > attrs['total_count']:
            raise serializers.ValidationError({'per_user_limit': '每人限领不能超过发行总量。'})
        if attrs['discount_type'] == 'percent' and attrs['amount'] > 100:
            raise serializers.ValidationError({'amount': '百分比优惠不能超过 100。'})
        return attrs


class CouponApplicationRevisionSerializer(serializers.Serializer):
    coupon_name = serializers.CharField(max_length=100, required=False)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    discount_type = serializers.ChoiceField(choices=['fixed', 'percent'], required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False)
    min_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False)
    max_discount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False, allow_null=True)
    stackable = serializers.BooleanField(required=False)
    total_count = serializers.IntegerField(min_value=1, required=False)
    per_user_limit = serializers.IntegerField(min_value=1, required=False)
    start_time = serializers.DateTimeField(required=False)
    end_time = serializers.DateTimeField(required=False)
    applicable_categories = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False)
    applicable_products = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False)
    applicable_brands = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False)
    expected_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)
    expected_usage_count = serializers.IntegerField(min_value=0, required=False)
    target_audience = serializers.ChoiceField(
        choices=CouponTargetAudience.choices,
        required=False,
    )
    campaign_purpose = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class CouponApplicationReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comment = serializers.CharField(required=False, allow_blank=True, default='')
