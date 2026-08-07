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
        # 列表路径应走 FavoriteService（已 prefetch + 缓存 dict）。
        # 这里只做兼容：遍历已缓存的 related manager，避免再 filter 绕过 prefetch。
        skus = [
            s for s in obj.spu.skus.all()
            if s.shelf_status == 'on' and s.stock > 0
        ]
        if skus:
            return float(min(s.price for s in skus))
        return None
