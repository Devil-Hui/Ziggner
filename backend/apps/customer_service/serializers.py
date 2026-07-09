import logging

from rest_framework import serializers
from .models import Conversation, Message

logger = logging.getLogger(__name__)


def _resolve_card_data(card_data: dict) -> dict:
    """
    将 card_data 中的 spu_id 引用解析为实时 SPU 数据。
    card_data 仅存储 spu_id + order_id（引用），product_name/price/status 实时查询。
    """
    if not card_data or not isinstance(card_data, dict):
        return card_data or {}

    spu_id = card_data.get('spu_id') or card_data.get('product_id')
    resolved = dict(card_data)  # shallow copy

    if spu_id:
        try:
            from apps.goods.models import SPU, SKU
            spu = SPU.objects.filter(id=spu_id, deleted_at__isnull=True).first()
            if spu:
                resolved['product_name'] = spu.name
                resolved['status'] = spu.status
                resolved['main_image'] = spu.main_image or ''

                # 价格：取在售 SKU 最低折扣价
                skus = spu.skus.filter(shelf_status='on')
                discount_prices = [
                    s.discount_price for s in skus
                    if s.discount_price is not None
                ]
                regular_prices = [s.price for s in skus if s.price is not None]
                if discount_prices:
                    resolved['price'] = str(min(discount_prices))
                elif regular_prices:
                    resolved['price'] = str(min(regular_prices))
                else:
                    resolved['price'] = '0'
            else:
                resolved['product_name'] = card_data.get('product_name', '(已删除)')
                resolved['status'] = 'deleted'
                resolved['price'] = card_data.get('price', '0')
        except Exception as e:
            logger.warning(f'Failed to resolve card_data for spu_id={spu_id}: {e}')
            # 降级：保留原始数据
            resolved['product_name'] = card_data.get('product_name', '')
            resolved['status'] = card_data.get('status', 'unknown')
            resolved['price'] = card_data.get('price', '0')

    return resolved


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    card_data = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'sender_type', 'content',
            'msg_type', 'file_url', 'card_data', 'metadata',
            'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'card_data', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.username if obj.sender else ''

    def get_card_data(self, obj):
        """product_card 类型实时解析 SPU 数据，其他类型原样返回"""
        if obj.msg_type == 'product_card' and obj.card_data:
            return _resolve_card_data(obj.card_data)
        return obj.card_data


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    group_id = serializers.IntegerField(read_only=True, allow_null=True)
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'user', 'user_name', 'admin', 'agent_name', 'subject', 'status',
            'user_msg_count', 'last_message', 'unread_count',
            'group_id', 'group_name',
            'created_at', 'updated_at',
        ]

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            result = {
                'id': last.id,
                'content': last.content[:100],
                'sender_type': last.sender_type,
                'msg_type': last.msg_type,
                'created_at': last.created_at,
            }
            if last.msg_type == 'product_card' and last.card_data:
                result['card_data'] = _resolve_card_data(last.card_data)
            return result
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_staff:
            return obj.messages.filter(sender_type='user', is_read=False).count()
        return obj.messages.filter(sender_type='admin', is_read=False).count()

    def get_user_name(self, obj):
        return obj.user.username if obj.user else ''

    def get_agent_name(self, obj):
        return obj.admin.username if obj.admin else ''

    def get_group_name(self, obj):
        return obj.group.name if obj.group else ''


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    group_id = serializers.IntegerField(read_only=True, allow_null=True)
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'user', 'user_name', 'admin', 'admin_name', 'agent_name',
            'subject', 'status', 'user_msg_count', 'messages',
            'group_id', 'group_name',
            'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        return obj.user.username if obj.user else ''

    def get_admin_name(self, obj):
        return obj.admin.username if obj.admin else ''

    def get_agent_name(self, obj):
        return obj.admin.username if obj.admin else ''

    def get_group_name(self, obj):
        return obj.group.name if obj.group else ''


class CreateConversationSerializer(serializers.Serializer):
    subject = serializers.CharField(required=False, allow_blank=True, default='')
    content = serializers.CharField(required=False, allow_blank=True, default='')
    msg_type = serializers.ChoiceField(
        choices=Message.MSG_TYPE_CHOICES, required=False, default='text',
    )
    file_url = serializers.CharField(required=False, allow_blank=True, default='')
    card_data = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True, default='')
    msg_type = serializers.ChoiceField(
        choices=Message.MSG_TYPE_CHOICES, required=False, default='text',
    )
    file_url = serializers.CharField(required=False, allow_blank=True, default='')
    card_data = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_card_data(self, value):
        if value and not isinstance(value, dict):
            raise serializers.ValidationError('card_data 必须是一个 JSON 对象')
        return value


class UpdateConversationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Conversation.STATUS_CHOICES, required=False,
    )
    admin_id = serializers.IntegerField(required=False)

    def validate_admin_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(id=value, is_staff=True).exists():
            raise serializers.ValidationError('指定的管理员不存在或不是管理员')
        return value


class ConversationSearchSerializer(serializers.Serializer):
    """Admin 搜索参数"""
    search = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.ChoiceField(
        choices=Conversation.STATUS_CHOICES, required=False,
    )
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=20)


# ── 商品搜索序列化器 ──

class ProductSearchSerializer(serializers.Serializer):
    """商品搜索查询参数"""
    q = serializers.CharField(required=True, min_length=1, max_length=200)


class SPUCardSerializer(serializers.Serializer):
    """商品卡片搜索结果"""
    spu_id = serializers.IntegerField()
    spu_name = serializers.CharField()
    main_image = serializers.CharField(allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    category_path = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    skus = serializers.ListField(child=serializers.DictField())


# ── 客服列表序列化器 ──

class AgentSerializer(serializers.Serializer):
    """客服（Admin）信息"""
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.CharField(allow_blank=True)
    role = serializers.CharField()          # leader / member
    status = serializers.IntegerField()      # 1=Active, 2=Away, 3=Leave
    status_display = serializers.CharField()
    assignment_count = serializers.IntegerField()  # 当前处理中的会话数


# ── 商品详情序列化器（实时查询） ──

class ProductDetailSerializer(serializers.Serializer):
    """商品实时详情 — 从 SPU 查询，不做 snapshot"""
    spu_id = serializers.IntegerField()
    spu_name = serializers.CharField()
    main_image = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    status_display = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    category_path = serializers.CharField(allow_blank=True)
    brand_name = serializers.CharField(allow_blank=True)
    price_min = serializers.CharField()     # 最低在售价格
    skus = serializers.ListField(child=serializers.DictField())
