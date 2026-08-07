from rest_framework import serializers


class ProductSearchSerializer(serializers.Serializer):
    """Product search request serializer."""
    q = serializers.CharField(required=False, allow_blank=True, max_length=200)
    category_id = serializers.IntegerField(required=False)
    brand_id = serializers.IntegerField(required=False)
    min_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    max_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    size = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)
    sort = serializers.CharField(required=False, default='-created_at')
    status = serializers.CharField(required=False, allow_blank=True)