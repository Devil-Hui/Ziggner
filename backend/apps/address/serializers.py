from rest_framework import serializers
from .models import Address


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'name', 'phone', 'country', 'region', 'city',
                  'address_line', 'postal_code', 'is_default',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AddressCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100, default='China')
    region = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100)
    address_line = serializers.CharField(max_length=300)
    postal_code = serializers.CharField(max_length=20, required=False, default='')
    is_default = serializers.BooleanField(default=False)


class AddressUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    country = serializers.CharField(max_length=100, required=False)
    region = serializers.CharField(max_length=100, required=False)
    city = serializers.CharField(max_length=100, required=False)
    address_line = serializers.CharField(max_length=300, required=False)
    postal_code = serializers.CharField(max_length=20, required=False)
    is_default = serializers.BooleanField(required=False)
