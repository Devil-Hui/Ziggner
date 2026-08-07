from django.db.models import Count, OuterRef, Q, Subquery
from rest_framework import serializers
from apps.rbac.services import has_role
from apps.rbac.constants import Role
from .models import Conversation, Message


def optimize_conversation_list_qs(qs, *, is_staff: bool):
    """
    列表接口一次 annotate 出 last_message + unread_count，避免 serializer 逐行 N+1。
    support 端语义保持不变：无 is_read 字段，按对端消息条数计「未读」。
    """
    latest = Message.objects.filter(conversation_id=OuterRef('pk')).order_by('-created_at')
    unread_q = (
        Q(messages__sender='user', messages__is_system=False)
        if is_staff else
        Q(messages__sender='admin', messages__is_system=False)
    )
    return qs.annotate(
        list_unread_count=Count('messages', filter=unread_q),
        list_last_msg_content=Subquery(latest.values('content')[:1]),
        list_last_msg_sender=Subquery(latest.values('sender')[:1]),
        list_last_msg_created_at=Subquery(latest.values('created_at')[:1]),
    )


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'content', 'attachments',
            'product_snapshot', 'is_system', 'created_at',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data.update({
                'content': '已脱敏',
                'attachments': [],
                'product_snapshot': None,
            })
        return data


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
        # 优先用 annotate 结果（列表路径）；回退到单查（兼容未优化 queryset）
        if hasattr(obj, 'list_last_msg_created_at'):
            if obj.list_last_msg_created_at is None and obj.list_last_msg_sender is None:
                return None
            return {
                'content': (obj.list_last_msg_content or '')[:100],
                'sender': obj.list_last_msg_sender,
                'created_at': obj.list_last_msg_created_at,
            }
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'content': last.content[:100],
                'sender': last.sender,
                'created_at': last.created_at,
            }
        return None

    def get_unread_count(self, obj):
        annotated = getattr(obj, 'list_unread_count', None)
        if annotated is not None:
            return annotated
        # 回退：用户端看客服消息；管理员端看用户消息
        request = self.context.get('request')
        if request and any(
            has_role(request.user, r)
            for r in (Role.SUPERADMIN.value, Role.ADMIN_LEADER.value, Role.ADMIN_MEMBER.value)
        ):
            return obj.messages.filter(sender='user', is_system=False).count()
        return obj.messages.filter(sender='admin', is_system=False).count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data['subject'] = '已脱敏'
            if data.get('last_message'):
                data['last_message']['content'] = '已脱敏'
        return data


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
        if not obj.spu_id:
            return None
        spu = obj.spu
        if spu is None:
            return None
        # 一次 values_list，避免 exists() + first() 两次查询
        price = spu.skus.order_by('id').values_list('price', flat=True).first()
        return {
            'id': spu.id,
            'name': spu.name,
            'main_image': spu.main_image,
            'price': str(price) if price is not None else '0',
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data['subject'] = '已脱敏'
            data['cart_snapshot'] = []
        return data


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
