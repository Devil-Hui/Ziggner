from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'username', 'spu_id', 'rating', 'content',
                  'images', 'is_anonymous', 'is_active', 'created_at', 'parent_id', 'replies']
        read_only_fields = ['id', 'created_at']

    def get_username(self, obj):
        if isinstance(obj, dict):
            return '***' if obj.get('is_anonymous') else (obj.get('user') or {}).get('username', '')
        if obj.is_anonymous:
            return '***'
        return obj.user.username

    def get_replies(self, obj):
        if isinstance(obj, dict):
            return []
        return ReviewSerializer(obj.replies.filter(is_active=True), many=True).data


class CreateReviewSerializer(serializers.Serializer):
    spu_id = serializers.IntegerField(min_value=1)
    order_item_id = serializers.IntegerField(min_value=1)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    content = serializers.CharField(required=False, default='', max_length=2000)
    images = serializers.ListField(child=serializers.URLField(), required=False, default=list, max_length=5)
    is_anonymous = serializers.BooleanField(default=False)


class UpdateReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    content = serializers.CharField(required=False, max_length=2000)
    images = serializers.ListField(child=serializers.URLField(), required=False, max_length=5)
    is_anonymous = serializers.BooleanField(required=False)
