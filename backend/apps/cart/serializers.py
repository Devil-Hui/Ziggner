from rest_framework import serializers
from .models import CartItem


class CartItemSerializer(serializers.ModelSerializer):
    sku_id = serializers.IntegerField(source='sku.id', read_only=True)
    sku_code = serializers.CharField(source='sku.sku_code', read_only=True)
    spu_name = serializers.CharField(source='sku.spu.name', read_only=True)
    price = serializers.DecimalField(source='sku.price', max_digits=10, decimal_places=2, read_only=True)
    stock = serializers.IntegerField(source='sku.stock', read_only=True)
    image = serializers.CharField(source='sku.image', read_only=True, default='')
    spec_values = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'sku_id', 'sku_code', 'spu_name', 'price',
            'stock', 'image', 'spec_values', 'quantity', 'selected',
            'created_at',
        ]

    def get_spec_values(self, obj):
        return [
            {'spec_name': sv.spec_value.spec_name.name, 'spec_value': sv.spec_value.value}
            for sv in obj.sku.sku_spec_values.select_related('spec_value__spec_name').all()
        ]


class AddCartItemSerializer(serializers.Serializer):
    sku_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(default=1, min_value=1, max_value=999)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0, max_value=999)


class SelectCartItemsSerializer(serializers.Serializer):
    item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=True,
    )
