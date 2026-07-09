from rest_framework import serializers
from .models import PaymentLog, PaymentMethod, RefundLog


class CreatePaymentSerializer(serializers.Serializer):
    order_no = serializers.CharField(max_length=32)
    method = serializers.ChoiceField(choices=PaymentMethod.choices)
    success_url = serializers.CharField(max_length=500, required=False, default='')
    cancel_url = serializers.CharField(max_length=500, required=False, default='')


class CreateRefundSerializer(serializers.Serializer):
    order_no = serializers.CharField(max_length=32)
    reason = serializers.CharField(max_length=500, required=False, default='')
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=None,
                                       help_text='退款金额，不传则全额退款')


class RefundStatusSerializer(serializers.ModelSerializer):
    """退款状态查询序列化器"""
    refund_no = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    gateway_refund_id = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()

    def get_status_display(self, obj):
        status_map = {
            'pending': '待处理',
            'processing': '处理中',
            'success': '退款成功',
            'failed': '退款失败',
        }
        return status_map.get(obj.status, obj.status)

    class Meta:
        model = RefundLog
        fields = ['refund_no', 'amount', 'reason', 'status', 'status_display',
                 'gateway_refund_id', 'created_at', 'updated_at']


class PaymentStatusSerializer(serializers.Serializer):
    paid = serializers.BooleanField()
    status = serializers.CharField(allow_null=True)
    method = serializers.CharField()
    payment_no = serializers.CharField()
    amount = serializers.FloatField()


class PaymentLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentLog
        fields = ['id', 'payment_no', 'amount', 'method', 'status', 'remark', 'created_at']
