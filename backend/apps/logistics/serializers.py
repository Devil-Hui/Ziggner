from rest_framework import serializers
from .models import Carrier, Shipment


class CarrierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrier
        fields = ['id', 'name', 'code', 'tracking_url_template', 'is_active']


class ShippingCostRequest(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1, required=False)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    weight = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)


class ShippingCostResponse(serializers.Serializer):
    cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    carrier_name = serializers.CharField()
    estimated_days = serializers.IntegerField()


class TrackShipmentRequest(serializers.Serializer):
    tracking_no = serializers.CharField(max_length=100)


class TrackingHistorySerializer(serializers.Serializer):
    time = serializers.DateTimeField()
    status = serializers.CharField()
    description = serializers.CharField()


class ShipmentStatusSerializer(serializers.ModelSerializer):
    tracking_history = TrackingHistorySerializer(many=True, required=False)

    class Meta:
        model = Shipment
        fields = ['id', 'tracking_no', 'status', 'shipped_at', 'estimated_delivery',
                   'actual_delivery', 'tracking_history']
        read_only_fields = fields
