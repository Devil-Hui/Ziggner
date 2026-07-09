from rest_framework import serializers
from .models import Term


class TermSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Term
        fields = ['id', 'title', 'type', 'type_display', 'content', 'version',
                  'is_active', 'effective_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TermListSerializer(serializers.ModelSerializer):
    """精简列表序列化器"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Term
        fields = ['id', 'title', 'type', 'type_display', 'version',
                  'is_active', 'effective_date', 'created_at']
