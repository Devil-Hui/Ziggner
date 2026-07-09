from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'content', 'attachments',
            'product_snapshot', 'is_system', 'created_at',
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'subject', 'status', 'spu_id',
            'last_message', 'unread_count', 'created_at', 'updated_at',
        ]

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'content': last.content[:100],
                'sender': last.sender,
                'created_at': last.created_at,
            }
        return None

    def get_unread_count(self, obj):
        # 用户端：客服发的未读消息；管理员端：用户发的未读消息
        request = self.context.get('request')
        if request and request.user.is_staff:
            return obj.messages.filter(sender='user', is_system=False).count()
        return obj.messages.filter(sender='admin', is_system=False).count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    spu_info = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'subject', 'status', 'spu_id', 'spu_info',
            'cart_snapshot', 'messages', 'created_at', 'updated_at',
        ]

    def get_spu_info(self, obj):
        if obj.spu:
            return {
                'id': obj.spu.id,
                'name': obj.spu.name,
                'main_image': obj.spu.main_image,
                'price': str(obj.spu.skus.first().price) if obj.spu.skus.exists() else '0',
            }
        return None


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True, default='')
    attachments = serializers.ListField(required=False, default=list)
    product_snapshot = serializers.JSONField(required=False)
    cart_snapshot = serializers.ListField(required=False, default=list)


class CreateConversationSerializer(serializers.Serializer):
    subject = serializers.CharField(required=False, allow_blank=True, default='')
    spu_id = serializers.IntegerField(required=False)
    content = serializers.CharField(required=False, allow_blank=True, default='')
    attachments = serializers.ListField(required=False, default=list)
    product_snapshot = serializers.JSONField(required=False)
    cart_snapshot = serializers.ListField(required=False, default=list)