from rest_framework import serializers
from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    spu_name = serializers.CharField(source='spu.name', read_only=True)
    spu_image = serializers.CharField(source='spu.main_image', read_only=True)
    min_price = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = ['id', 'spu_id', 'spu_name', 'spu_image', 'min_price', 'created_at']

    def get_min_price(self, obj):
        # 适配 dict（缓存数据）和 model 实例
        if isinstance(obj, dict):
            return obj.get('min_price')
        skus = obj.spu.skus.filter(shelf_status='on', stock__gt=0)
        if skus:
            return float(min(s.price for s in skus))
        return None
