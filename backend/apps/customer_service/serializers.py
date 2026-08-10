import logging

from django.conf import settings
from django.db.models import Count, OuterRef, Q, Subquery
from django.utils import timezone
from rest_framework import serializers
from apps.rbac.services import has_role, has_perm
from apps.rbac.constants import Role
from .models import Conversation, Message


# ── 占线状态辅助（与 views._lock_check 保持同一套判定） ──
def _cs_is_superuser(user) -> bool:
    return has_role(user, Role.SUPERADMIN.value)


def _cs_is_staff(user) -> bool:
    """镜像 views._is_cs_staff：拥有 cs.conversation.read 且非只读运维"""
    return (not has_role(user, Role.OPS.value)) and has_perm(user, 'cs.conversation.read')


def _cs_assign_expired(conv) -> bool:
    ttl = getattr(settings, 'CS_ASSIGN_TIMEOUT_MINUTES', 30)
    return bool(
        conv.handled_at
        and (timezone.now() - conv.handled_at).total_seconds() > ttl * 60
    )


def _cs_can_reply(conv, user) -> bool:
    """当前用户是否可在此会话发言（权威判定，供前端禁用输入）。"""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if conv.status == 'closed':
        return False
    if not _cs_is_staff(user):          # 买家侧：永远可发
        return True
    if _cs_is_superuser(user):          # 超管：强接
        return True
    if not conv.handled_by_id:          # 未占用：可认领
        return True
    if conv.handled_by_id == user.id:   # 本人接待中
        return True
    if _cs_assign_expired(conv):        # 占线已超时：可接手
        return True
    return False                         # 被其他客服占用且未超时

logger = logging.getLogger(__name__)


def optimize_conversation_list_qs(qs, *, is_staff: bool):
    """
    列表接口一次 annotate 出 last_message 字段 + unread_count，避免 serializer 逐行 N+1。
    customer_service 用 is_read + sender_type 计未读。
    product_card 的 card_data 仍走 fallback 单查（列表中极少出现）。
    """
    latest = Message.objects.filter(conversation_id=OuterRef('pk')).order_by('-created_at')
    unread_q = (
        Q(messages__sender_type='user', messages__is_read=False)
        if is_staff else
        Q(messages__sender_type='admin', messages__is_read=False)
    )
    return qs.annotate(
        list_unread_count=Count('messages', filter=unread_q),
        list_last_msg_id=Subquery(latest.values('id')[:1]),
        list_last_msg_content=Subquery(latest.values('content')[:1]),
        list_last_msg_sender_type=Subquery(latest.values('sender_type')[:1]),
        list_last_msg_type=Subquery(latest.values('msg_type')[:1]),
        list_last_msg_created_at=Subquery(latest.values('created_at')[:1]),
    )


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


def _resolve_spu_info(spu) -> dict | None:
    """将 SPU 实时解析为精简信息（id/name/main_image/price），用于会话商品上下文展示。"""
    if not spu:
        return None
    try:
        skus = spu.skus.filter(shelf_status='on')
        discount_prices = [s.discount_price for s in skus if s.discount_price is not None]
        regular_prices = [s.price for s in skus if s.price is not None]
        if discount_prices:
            price = str(min(discount_prices))
        elif regular_prices:
            price = str(min(regular_prices))
        else:
            price = '0'
        return {
            'id': spu.id,
            'name': spu.name,
            'main_image': spu.main_image or '',
            'price': price,
        }
    except Exception:
        return {
            'id': spu.id,
            'name': getattr(spu, 'name', ''),
            'main_image': getattr(spu, 'main_image', '') or '',
            'price': '0',
        }


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data.update({
                'sender': None,
                'sender_name': '已脱敏',
                'content': '已脱敏',
                'file_url': '',
                'card_data': {},
                'metadata': {},
            })
        return data


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    group_id = serializers.IntegerField(read_only=True, allow_null=True)
    group_name = serializers.SerializerMethodField()
    spu_id = serializers.IntegerField(read_only=True, allow_null=True)
    spu_info = serializers.SerializerMethodField()
    handled_by = serializers.SerializerMethodField()
    handled_by_name = serializers.SerializerMethodField()
    can_reply = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'user', 'user_name', 'admin', 'agent_name', 'subject', 'status',
            'user_msg_count', 'last_message', 'unread_count',
            'group_id', 'group_name', 'spu_id', 'spu_info',
            'handled_by', 'handled_by_name', 'can_reply',
            'created_at', 'updated_at',
        ]

    def get_last_message(self, obj):
        # 优先用 annotate 结果；product_card 需 card_data 时再单查一次
        if hasattr(obj, 'list_last_msg_id'):
            if obj.list_last_msg_id is None:
                return None
            result = {
                'id': obj.list_last_msg_id,
                'content': (obj.list_last_msg_content or '')[:100],
                'sender_type': obj.list_last_msg_sender_type,
                'msg_type': obj.list_last_msg_type,
                'created_at': obj.list_last_msg_created_at,
            }
            if obj.list_last_msg_type == 'product_card':
                last = (
                    obj.messages.filter(id=obj.list_last_msg_id).first()
                    or Message.objects.filter(id=obj.list_last_msg_id).first()
                )
                if last and last.card_data:
                    result['card_data'] = _resolve_card_data(last.card_data)
            if self.context.get('redact_sensitive'):
                result['content'] = '已脱敏'
                result.pop('card_data', None)
            return result
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
        annotated = getattr(obj, 'list_unread_count', None)
        if annotated is not None:
            return annotated
        request = self.context.get('request')
        if request and any(
            has_role(request.user, r)
            for r in (Role.SUPERADMIN.value, Role.ADMIN_LEADER.value, Role.ADMIN_MEMBER.value)
        ):
            return obj.messages.filter(sender_type='user', is_read=False).count()
        return obj.messages.filter(sender_type='admin', is_read=False).count()

    def get_user_name(self, obj):
        if self.context.get('redact_sensitive'):
            return '已脱敏'
        return obj.user.username if obj.user else ''

    def get_agent_name(self, obj):
        if self.context.get('redact_sensitive'):
            return '已脱敏' if obj.admin else ''
        return obj.admin.username if obj.admin else ''

    def get_group_name(self, obj):
        return obj.group.name if obj.group else ''

    def get_spu_info(self, obj):
        return _resolve_spu_info(obj.spu)

    def get_handled_by(self, obj):
        return obj.handled_by_id

    def get_handled_by_name(self, obj):
        return obj.handled_by.username if obj.handled_by else ''

    def get_can_reply(self, obj):
        return _cs_can_reply(obj, self.context.get('request').user
                             if self.context.get('request') else None)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data.update({'user': None, 'admin': None, 'subject': '已脱敏'})
        return data


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    group_id = serializers.IntegerField(read_only=True, allow_null=True)
    group_name = serializers.SerializerMethodField()
    spu_id = serializers.IntegerField(read_only=True, allow_null=True)
    spu_info = serializers.SerializerMethodField()
    handled_by = serializers.SerializerMethodField()
    handled_by_name = serializers.SerializerMethodField()
    can_reply = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'user', 'user_name', 'admin', 'admin_name', 'agent_name',
            'subject', 'status', 'user_msg_count', 'messages',
            'group_id', 'group_name', 'spu_id', 'spu_info',
            'handled_by', 'handled_by_name', 'can_reply',
            'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        if self.context.get('redact_sensitive'):
            return '已脱敏'
        return obj.user.username if obj.user else ''

    def get_admin_name(self, obj):
        if self.context.get('redact_sensitive'):
            return '已脱敏' if obj.admin else ''
        return obj.admin.username if obj.admin else ''

    def get_agent_name(self, obj):
        return self.get_admin_name(obj)

    def get_group_name(self, obj):
        return obj.group.name if obj.group else ''

    def get_spu_info(self, obj):
        return _resolve_spu_info(obj.spu)

    def get_handled_by(self, obj):
        return obj.handled_by_id

    def get_handled_by_name(self, obj):
        return obj.handled_by.username if obj.handled_by else ''

    def get_can_reply(self, obj):
        return _cs_can_reply(obj, self.context.get('request').user
                             if self.context.get('request') else None)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('redact_sensitive'):
            data.update({'user': None, 'admin': None, 'subject': '已脱敏'})
        return data


class CreateConversationSerializer(serializers.Serializer):
    subject = serializers.CharField(required=False, allow_blank=True, default='', max_length=255)
    content = serializers.CharField(required=False, allow_blank=True, default='', max_length=5000)
    spu_id = serializers.IntegerField(required=False, allow_null=True)
    msg_type = serializers.ChoiceField(
        choices=Message.MSG_TYPE_CHOICES, required=False, default='text',
    )
    file_url = serializers.CharField(required=False, allow_blank=True, default='')
    attachments = serializers.ListField(required=False, default=list)
    card_data = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_spu_id(self, value):
        if value is None:
            return value
        from apps.goods.models import SPU
        if not SPU.objects.filter(id=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('关联商品不存在')
        return value


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True, default='', max_length=5000)
    msg_type = serializers.ChoiceField(
        choices=Message.MSG_TYPE_CHOICES, required=False, default='text',
    )
    file_url = serializers.CharField(required=False, allow_blank=True, default='')
    attachments = serializers.ListField(required=False, default=list)
    card_data = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_card_data(self, value):
        if value and not isinstance(value, dict):
            raise serializers.ValidationError('card_data 必须是一个 JSON 对象')
        return value

    def validate_attachments(self, value):
        """Normalize attachments to a list of {url, msg_type}.

        Accepts either:
          - ["https://.../a.jpg", ...]            (plain URL strings → treated as image)
          - [{"url": "...", "msg_type": "image"|"video"}, ...]
        """
        normalized = []
        for item in value or []:
            if isinstance(item, str):
                normalized.append({'url': item, 'msg_type': 'image'})
            elif isinstance(item, dict) and item.get('url'):
                mt = item.get('msg_type', 'image')
                if mt not in ('image', 'video'):
                    mt = 'image'
                normalized.append({'url': item['url'], 'msg_type': mt})
        return normalized


class UpdateConversationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Conversation.STATUS_CHOICES, required=False,
    )
    admin_id = serializers.IntegerField(required=False)

    def validate_admin_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=value).first()
        if not user or not any(has_role(user, r) for r in (Role.SUPERADMIN.value, Role.ADMIN_LEADER.value, Role.ADMIN_MEMBER.value)):
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
