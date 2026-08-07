from rest_framework import serializers
from .models import BrowseHistory


class BrowseHistorySerializer(serializers.ModelSerializer):
    """浏览历史详情（含商品信息）。"""
    spu_id = serializers.IntegerField(source='spu.id', read_only=True)
    spu_name = serializers.CharField(source='spu.name', read_only=True)
    spu_image = serializers.CharField(source='spu.main_image', read_only=True)
    spu_price = serializers.SerializerMethodField(read_only=True)
    category_path = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BrowseHistory
        fields = [
            'id', 'spu_id', 'spu_name', 'spu_image', 'spu_price',
            'category_path', 'viewed_at', 'created_at',
        ]

    @staticmethod
    def get_spu_price(obj):
        """取 SKU 最低价作为展示价格。"""
        skus = getattr(obj.spu, 'skus', None)
        if skus and skus.exists():
            prices = [s.price for s in skus.all() if s.price is not None]
            if prices:
                return str(min(prices))
        return None

    @staticmethod
    def get_category_path(obj):
        return obj.spu.category_path if obj.spu else ''


class RecordBrowseSerializer(serializers.Serializer):
    """记录一次商品浏览。"""
    spu_id = serializers.IntegerField(required=True)


class BrowseHistoryPaginationSerializer(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, required=False, default=1)
    page_size = serializers.IntegerField(min_value=1, required=False, default=20)

    def validate_page_size(self, value):
        return min(value, 100)
