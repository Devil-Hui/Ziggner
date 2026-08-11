import time as _time
import uuid
import logging

from django.conf import settings
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.storage import get_storage
from utils.api_permission import ApiPermission
from utils.upload_security import UploadValidationError, validate_media_upload
from apps.rbac.services import has_perm, has_role
from apps.rbac.constants import Role
from .models import Conversation, Message
from .policies import ConversationAccessPolicy
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    CreateConversationSerializer, SendMessageSerializer,
    UpdateConversationSerializer, MessageSerializer,
    ProductSearchSerializer, SPUCardSerializer,
    AgentSerializer, ProductDetailSerializer,
    optimize_conversation_list_qs,
)

logger = logging.getLogger(__name__)

# ── 限流配置（从 Django settings 读取） ──
_CS_WINDOW = getattr(settings, 'CS_RATE_LIMIT_WINDOW', 60)       # 窗口 60 秒
_CS_MAX = getattr(settings, 'CS_RATE_LIMIT_MAX', 30)           # 用户端每分钟最多 30 条

def _check_user_rate_limit(user_id: int) -> bool:
    """用户消息限流（Redis ZSET 或 DatabaseCache 桶，MySQL-only 可用）。"""
    from utils.sliding_window import check_sliding_window

    return check_sliding_window(
        f'cs:rate_limit:user:{user_id}',
        window_seconds=_CS_WINDOW,
        max_count=_CS_MAX,
        fail_open=True,
    )

# ── 文件上传配置（从 Django settings 读取） ──
_IMG_SIZE = getattr(settings, 'CS_IMAGE_MAX_SIZE', 10 * 1024 * 1024)   # 10 MB
_VID_SIZE = getattr(settings, 'CS_VIDEO_MAX_SIZE', 50 * 1024 * 1024)   # 50 MB


# ═══════════════════════════════════════════════════════════════
# 权限 & 组工具函数
# ═══════════════════════════════════════════════════════════════

def _is_cs_staff(user) -> bool:
    """用户是否是客服人员（拥有管理组角色或超管）"""
    return ConversationAccessPolicy.is_agent(user)


def _is_superuser(user) -> bool:
    return has_role(user, Role.SUPERADMIN.value)


def _is_cs_manager(user) -> bool:
    """客服主管 / 超管 — 可强制接手被占用的会话"""
    return has_role(user, Role.SUPERADMIN.value) or has_role(user, Role.ADMIN_LEADER.value)


def _assign_timeout_minutes() -> int:
    """占线自动释放时限（分钟），运维可在 settings 热改"""
    return getattr(settings, 'CS_ASSIGN_TIMEOUT_MINUTES', 30)


def _is_assignment_expired(conv) -> bool:
    ttl = _assign_timeout_minutes()
    return bool(
        conv.handled_at
        and (timezone.now() - conv.handled_at).total_seconds() > ttl * 60
    )


def _lock_check(conv, user):
    """会话占线检查（一对一接待保护）。

    返回 None 表示允许操作（含：超管/主管强接、会话未占用、占线已超时自动释放）；
    返回 Response 表示拒绝（409）。
    """
    # 超管 / 主管 永远可强制接手
    if _is_cs_manager(user):
        return None
    # 未占用 → 可直接认领
    if not conv.handled_by_id:
        return None
    # 自己正在处理 → 放行
    if conv.handled_by_id == user.id:
        return None
    # 占线已超时 → 自动释放，允许当前用户接手
    if _is_assignment_expired(conv):
        conv.handled_by = None
        conv.handled_at = None
        conv.save(update_fields=['handled_by', 'handled_at'])
        return None
    return Response(
        {'detail': f'该会话正在由 {conv.handled_by.username} 接待中，暂不可接手（占线保护）'},
        status=status.HTTP_409_CONFLICT,
    )


def _get_user_admin_group(user):
    """返回用户所属 AdminGroup，如果不在任何组返回 None"""
    if not user.is_authenticated:
        return None
    from apps.goods.models import AdminGroupMember
    membership = AdminGroupMember.objects.filter(
        user=user, status=1
    ).select_related('group').first()
    return membership.group if membership else None


def _get_group_member_user_ids(group):
    """获取管理组内所有活跃成员的 user id 列表"""
    if not group:
        return []
    from apps.goods.models import AdminGroupMember
    return list(
        AdminGroupMember.objects
        .filter(group=group, status=1)
        .values_list('user_id', flat=True)
    )


def _apply_group_filter(qs, user):
    """
    对会话 queryset 应用组级过滤：
    - Superuser: 返回全部
    - 管理组成员: 仅返回本组会话
    - 普通用户: 由调用方自行过滤（仅自己的会话）
    """
    return ConversationAccessPolicy.scope_queryset(qs, user)


def _get_conv_for_user(conv_id, user):
    """
    获取会话 — 组级权限隔离：
    - Superuser: 可访问全部
    - Admin（管理组成员）: 仅本组会话
    - 普通用户: 仅自己的会话
    """
    return ConversationAccessPolicy.get_conversation(conv_id, user)


def _strip_card_data_to_refs(card_data: dict) -> dict:
    """
    将 card_data 精简为仅引用字段（spu_id + order_id）。
    product_name/price/status 等展示时从 SPU 实时查询，不存储 snapshot。
    """
    if not card_data or not isinstance(card_data, dict):
        return card_data or {}
    refs = {}
    spu_id = card_data.get('spu_id') or card_data.get('product_id') or card_data.get('id')
    if spu_id:
        refs['spu_id'] = spu_id
    order_id = card_data.get('order_id')
    if order_id:
        refs['order_id'] = order_id
    sku_id = card_data.get('sku_id')
    if sku_id:
        refs['sku_id'] = sku_id
    return refs


def _create_attachment_messages(conv, user, sender_type: str, attachments: list) -> int:
    """为会话批量创建附件消息（图片/视频）。返回创建的消息条数。"""
    created = 0
    for att in attachments or []:
        if isinstance(att, dict):
            url = att.get('url')
            msg_type = att.get('msg_type', 'image')
        else:
            url = att
            msg_type = 'image'
        if not url:
            continue
        if msg_type not in ('image', 'video'):
            msg_type = 'image'
        Message.objects.create(
            conversation=conv,
            sender=user,
            sender_type=sender_type,
            content='',
            msg_type=msg_type,
            file_url=url,
            metadata={'is_attachment': True},
        )
        if sender_type == 'user':
            conv.increment_msg_count()
        created += 1
    return created


def _broadcast_new_message(conv_id, message_obj, sender_type: str) -> None:
    """
    通过 Channel Layer 将新消息实时推送给会话组内所有 WebSocket 连接。

    关键：REST 由 gunicorn 处理、WS 由 daphne 处理，二者跨进程，
    必须用 Redis Channel Layer 才能把「保存成功的消息」实时投递到对方 WS。
    失败仅告警（消息已落库），不影响发送主流程。
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        layer = get_channel_layer()
        if not layer:
            return
        payload = MessageSerializer(message_obj).data
        async_to_sync(layer.group_send)(f'chat_{conv_id}', {
            'type': 'chat.message',
            'payload': payload,
            'msg_id': str(message_obj.id),
            'timestamp': message_obj.created_at.isoformat(),
            'sender_type': sender_type,
        })
    except Exception as e:
        logger.warning(f'Broadcast new message (conv={conv_id}) failed: {e}')


# ═══════════════════════════════════════════════════════════════
# 文件上传
# ═══════════════════════════════════════════════════════════════

class UploadFileView(BaseApiView):
    """上传图片/视频文件"""

    @extend_schema(
        description='上传客服消息附件（图片 JPG/PNG/GIF ≤10MB，视频 MP4 ≤50MB）',
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='File uploaded successfully')},
    )
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': '请选择文件'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extension, content_type = validate_media_upload(
                file,
                image_max_bytes=_IMG_SIZE,
                video_max_bytes=_VID_SIZE,
            )
        except UploadValidationError:
            return Response(
                {'detail': '文件扩展名、真实内容或大小不符合要求'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        folder = (
            getattr(settings, 'CS_IMAGE_UPLOAD_FOLDER', 'chat/images')
            if content_type.startswith('image/')
            else getattr(settings, 'CS_VIDEO_UPLOAD_FOLDER', 'chat/videos')
        )

        # 生成唯一文件名
        filename = f'{folder}/{uuid.uuid4().hex}{extension}'

        try:
            storage = get_storage()
            result = storage.upload(filename, file.read(), content_type=content_type)
            if result.get('url'):
                return Response({
                    'url': result['url'],
                    'filename': filename,
                    'content_type': content_type,
                    'size': file.size,
                })
            return Response(
                {'detail': result.get('message', '上传失败')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.error(f'文件上传失败: {e}')
            return Response(
                {'detail': f'上传失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ═══════════════════════════════════════════════════════════════
# 商品搜索（Admin 端）
# ═══════════════════════════════════════════════════════════════

class ProductSearchView(BaseApiView):
    """Admin 搜索商品，返回可发送为卡片的 SPU 列表"""

    @extend_schema(
        description='管理员搜索商品 SPU，用于发送商品卡片消息。返回 SPU 列表及其 SKU 信息。',
        parameters=[ProductSearchSerializer],
        responses={200: SPUCardSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        if not _is_cs_staff(request.user):
            return Response({'detail': '无权限'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProductSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        q = serializer.validated_data['q']

        from apps.goods.models import SPU, SKU

        spus = (
            SPU.objects
            .filter(
                Q(name__icontains=q) | Q(description__icontains=q),
                deleted_at__isnull=True,
            )
            .select_related('category', 'brand')
            .prefetch_related('skus')
            .order_by('-id')[:getattr(settings, 'CS_PRODUCT_SEARCH_LIMIT', 50)]
        )

        results = []
        for spu in spus:
            skus = spu.skus.filter(shelf_status='on')
            # 价格范围
            sku_prices = [s.price for s in skus if s.price is not None]
            price = min(sku_prices) if sku_prices else 0
            discount_prices = [s.discount_price for s in skus if s.discount_price is not None]
            display_price = min(discount_prices) if discount_prices else price

            results.append({
                'spu_id': spu.id,
                'spu_name': spu.name,
                'main_image': spu.main_image or '',
                'price': str(display_price),
                'category_path': spu.category_path,
                'status': spu.status,
                'skus': [
                    {
                        'sku_id': sku.id,
                        'sku_code': sku.sku_code,
                        'spec_values': sku.spec_values,
                        'price': str(sku.price),
                        'discount_price': str(sku.discount_price) if sku.discount_price else None,
                        'stock': sku.stock,
                        'image_url': sku.image_url,
                    }
                    for sku in skus
                ],
            })

        return Response(results)


# ═══════════════════════════════════════════════════════════════
# 商品详情（实时查询）
# ═══════════════════════════════════════════════════════════════

class ProductDetailView(BaseApiView):
    """
    实时查询商品当前状态，返回 product_name/price/status — 不做 snapshot。
    GET /api/chat/product/{spu_id}/detail
    """

    @extend_schema(
        description='查询商品当前状态（on_sale/off_sale/suspended 等），展示时实时调用，避免数据不一致',
        responses={200: ProductDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request, spu_id):
        from apps.goods.models import SPU

        spu = SPU.objects.filter(id=spu_id, deleted_at__isnull=True).select_related('category', 'brand').first()
        if not spu:
            return Response({'detail': '商品不存在'}, status=status.HTTP_404_NOT_FOUND)

        skus = spu.skus.filter(shelf_status='on')
        sku_prices = [s.price for s in skus if s.price is not None]
        discount_prices = [s.discount_price for s in skus if s.discount_price is not None]
        price_min = min(discount_prices) if discount_prices else (min(sku_prices) if sku_prices else 0)

        return Response({
            'spu_id': spu.id,
            'spu_name': spu.name,
            'main_image': spu.main_image or '',
            'status': spu.status,
            'status_display': spu.get_status_display(),
            'description': spu.description or '',
            'category_path': spu.category_path or '',
            'brand_name': spu.brand.name if spu.brand else '',
            'price_min': str(price_min),
            'skus': [
                {
                    'sku_id': sku.id,
                    'sku_code': sku.sku_code,
                    'spec_values': sku.spec_values,
                    'price': str(sku.price),
                    'discount_price': str(sku.discount_price) if sku.discount_price else None,
                    'stock': sku.stock,
                    'image_url': sku.image_url,
                }
                for sku in skus
            ],
        })


# ═══════════════════════════════════════════════════════════════
# 客服列表（组级）
# ═══════════════════════════════════════════════════════════════

class AgentListView(BaseApiView):
    """
    返回当前用户所在管理组的客服列表，供分配给会话使用。
    GET /api/chat/agents/
    """

    @extend_schema(
        description='返回当前用户所在管理组的客服列表（含分配中会话数）',
        responses={200: AgentSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        if not _is_cs_staff(request.user):
            return Response({'detail': '无权限'}, status=status.HTTP_403_FORBIDDEN)

        from apps.goods.models import AdminGroupMember

        # Superuser: 返回所有管理组成员
        if _is_superuser(request.user):
            memberships = AdminGroupMember.objects.filter(
                status=1
            ).select_related('user', 'group').order_by('group', 'id')
        else:
            group = _get_user_admin_group(request.user)
            if not group:
                return Response([], status=status.HTTP_200_OK)
            memberships = AdminGroupMember.objects.filter(
                group=group, status=1
            ).select_related('user', 'group').order_by('id')

        # 统计每个客服当前处理的会话数
        member_user_ids = [m.user_id for m in memberships]
        assignment_counts = dict(
            Conversation.objects
            .filter(admin_id__in=member_user_ids, status='open')
            .values('admin_id')
            .annotate(count=Count('id'))
            .values_list('admin_id', 'count')
        )

        results = []
        for m in memberships:
            results.append({
                'id': m.user_id,
                'username': m.user.username,
                'email': m.user.email or '',
                'role': m.role,
                'status': m.status,
                'status_display': m.get_status_display(),
                'assignment_count': assignment_counts.get(m.user_id, 0),
            })

        return Response(results)


# ═══════════════════════════════════════════════════════════════
# 会话列表 & 创建
# ═══════════════════════════════════════════════════════════════

class ConversationListView(BaseApiView):
    """会话列表 / 创建"""

    @extend_schema(
        description='用户端：我的会话列表；Admin 端：本组会话（Super Admin 可看全部）。支持搜索和按状态筛选。返回 unread_count。',
        responses={200: ConversationListSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        is_staff = _is_cs_staff(request.user) or ConversationAccessPolicy.is_ops(request.user)
        if is_staff:
            # Admin: 组级过滤
            qs = _apply_group_filter(Conversation.objects.all(), request.user)

            # 搜索：按用户名 / 主题
            search = request.query_params.get('search', '').strip()
            if search:
                qs = qs.filter(
                    Q(user__username__icontains=search) |
                    Q(user__email__icontains=search) |
                    Q(subject__icontains=search)
                )

            # 按状态筛选
            status_filter = request.query_params.get('status', '').strip()
            if status_filter in ('open', 'closed'):
                qs = qs.filter(status=status_filter)

            qs = qs.select_related('user', 'admin', 'group', 'spu', 'handled_by')
        else:
            qs = Conversation.objects.filter(user=request.user).select_related(
                'user', 'admin', 'group', 'spu', 'handled_by',
            )

        qs = optimize_conversation_list_qs(qs, is_staff=is_staff).order_by('-updated_at')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ConversationListSerializer(page, many=True, context={
                'request': request,
                'redact_sensitive': ConversationAccessPolicy.redact_sensitive(request.user),
            })
            return self.get_paginated_response(serializer.data)

        serializer = ConversationListSerializer(qs, many=True, context={
            'request': request,
            'redact_sensitive': ConversationAccessPolicy.redact_sensitive(request.user),
        })
        return Response(serializer.data)

    @extend_schema(
        description='创建新会话（可选附带首条消息，支持 product_card 类型）。自动绑定用户所属管理组。',
        request=CreateConversationSerializer,
        responses={201: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request):
        serializer = CreateConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # 自动绑定管理组：通过用户查找关联的管理组
        # 常规用户也可能在某管理组下（如果项目结构支持），尝试绑定
        group = _get_user_admin_group(request.user)

        conv = Conversation.objects.create(
            user=request.user,
            subject=data.get('subject', ''),
            group=group,
            spu_id=data.get('spu_id'),
        )

        # 创建首条消息（如果有内容）
        content = data.get('content', '')
        file_url = data.get('file_url', '')
        raw_card_data = data.get('card_data', {})
        if content or file_url or raw_card_data:
            # 精简 card_data 为引用（spu_id + order_id）
            card_data = _strip_card_data_to_refs(raw_card_data)
            Message.objects.create(
                conversation=conv,
                sender=request.user,
                sender_type='user',
                content=content,
                msg_type=data.get('msg_type', 'text'),
                file_url=file_url,
                card_data=card_data,
                metadata=data.get('metadata', {}),
            )
            conv.increment_msg_count()

        # 首条消息之外的附件（图片/视频）单独成消息
        attachments = data.get('attachments') or []
        if attachments:
            _create_attachment_messages(conv, request.user, 'user', attachments)

        return Response(
            ConversationDetailSerializer(conv).data,
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════
# 释放对话（管理员主动释放）
# ═══════════════════════════════════════════════════════════════

class ConversationReleaseView(BaseApiView):
    """释放对话（管理员主动释放），允许其他管理员接听。"""
    permission_classes = [ApiPermission]

    @extend_schema(
        description='释放对话（管理员主动释放），允许其他管理员接听',
        responses={200: OpenApiResponse(description='Conversation released')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Release')})
    def post(self, request, conv_id):
        if not _is_cs_staff(request.user):
            return Response({'detail': '无权限'}, status=status.HTTP_403_FORBIDDEN)

        try:
            conv = Conversation.objects.get(id=conv_id, status='open')
        except Conversation.DoesNotExist:
            return Response({'detail': '对话不存在'}, status=status.HTTP_404_NOT_FOUND)

        if conv.handled_by != request.user and not has_perm(request.user, 'cs.conversation.takeover'):
            return Response({'detail': '无权释放此对话'}, status=status.HTTP_403_FORBIDDEN)

        conv.handled_by = None
        conv.handled_at = None
        conv.save(update_fields=['handled_by', 'handled_at'])
        return Response({'detail': '已释放，其他客服可接听'})


class ConversationCloseView(BaseApiView):
    """关闭对话（用户本人或客服均可）"""

    @extend_schema(
        description='关闭对话（用户本人或客服均可关闭）',
        responses={200: OpenApiResponse(description='Conversation closed')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Close')})
    def post(self, request, conv_id):
        if ConversationAccessPolicy.is_ops(request.user):
            return Response({'detail': '只读运维不能关闭会话'}, status=status.HTTP_403_FORBIDDEN)

        conv = _get_conv_for_user(conv_id, request.user)
        if not conv:
            return Response({'detail': '会话不存在'}, status=status.HTTP_404_NOT_FOUND)
        if conv.status == 'closed':
            return Response({'detail': '会话已关闭'}, status=status.HTTP_400_BAD_REQUEST)

        conv.status = 'closed'
        conv.handled_by = None
        conv.handled_at = None
        conv.save(update_fields=['status', 'handled_by', 'handled_at'])

        Message.objects.create(
            conversation=conv,
            sender=request.user,
            sender_type='admin',
            content='对话已关闭，如有需要请开启新对话。',
            metadata={'is_system': True},
        )
        return Response({'detail': '对话已关闭'})


# ═══════════════════════════════════════════════════════════════
# 会话详情 & 更新
# ═══════════════════════════════════════════════════════════════

class ConversationDetailView(BaseApiView):
    """会话详情 / 更新"""

    @extend_schema(
        description='获取会话详情（含消息列表），Admin 仅能查看本组会话',
        responses={200: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request, conv_id):
        conv = _get_conv_for_user(conv_id, request.user)
        if not conv:
            return Response({'detail': '会话不存在'}, status=status.HTTP_404_NOT_FOUND)
        # 预取处理人，避免序列化器 N+1
        conv = Conversation.objects.select_related(
            'user', 'admin', 'group', 'spu', 'handled_by',
        ).get(id=conv.id)
        return Response(ConversationDetailSerializer(conv, context={
            'request': request,
            'redact_sensitive': ConversationAccessPolicy.redact_sensitive(request.user),
        }).data)

    @extend_schema(
        description='更新会话状态 / 分配客服（仅 Admin，且目标客服需在同一管理组）',
        request=UpdateConversationSerializer,
        responses={200: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Partial update')})
    def patch(self, request, conv_id):
        if not _is_cs_staff(request.user):
            return Response({'detail': '无权限'}, status=status.HTTP_403_FORBIDDEN)

        conv = _get_conv_for_user(conv_id, request.user)
        if not conv:
            return Response({'detail': '会话不存在'}, status=status.HTTP_404_NOT_FOUND)

        # 占线保护：若会话被其他客服占用（未超时且非超管/主管），拒绝分配操作
        lock_resp = _lock_check(conv, request.user)
        if lock_resp is not None:
            return lock_resp

        serializer = UpdateConversationSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_fields = []
        if 'status' in data:
            conv.status = data['status']
            update_fields.append('status')
            # 关闭会话时清除处理人
            if data['status'] == 'closed':
                conv.handled_by = None
                conv.handled_at = None
                update_fields.extend(['handled_by', 'handled_at'])

        if 'admin_id' in data:
            from django.contrib.auth import get_user_model
            User = get_user_model()

            # 验证目标客服与管理组关系
            new_admin = User.objects.filter(id=data['admin_id']).first()
            if not new_admin or not _is_cs_staff(new_admin):
                return Response({'detail': '指定客服不存在或不是管理员'}, status=status.HTTP_400_BAD_REQUEST)

            # 组级校验：分配的客服必须与当前操作者在同一管理组
            if not _is_superuser(request.user) and conv.group:
                new_admin_group = _get_user_admin_group(new_admin)
                if not new_admin_group or new_admin_group.id != conv.group_id:
                    return Response(
                        {'detail': '只能分配同一管理组的客服'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            conv.admin = new_admin
            update_fields.append('admin')

        # 占线归属：未占用则认领；超管/主管强制接手则重设处理人
        if conv.handled_by_id != request.user.id:
            conv.handled_by = request.user
            conv.handled_at = timezone.now()
            update_fields.extend(['handled_by', 'handled_at'])

        if update_fields:
            conv.save(update_fields=update_fields)

        return Response(ConversationDetailSerializer(conv, context={
            'request': request,
            'redact_sensitive': ConversationAccessPolicy.redact_sensitive(request.user),
        }).data)


# ═══════════════════════════════════════════════════════════════
# 消息列表 & 发送
# ═══════════════════════════════════════════════════════════════

class MessageView(BaseApiView):
    """消息列表 & 发送"""

    @extend_schema(
        description='获取会话历史消息（分页，按时间正序）。支持 ?since=<ISO timestamp> 拉取离线消息。',
        responses={200: MessageSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request, conv_id):
        conv = _get_conv_for_user(conv_id, request.user)
        if not conv:
            return Response({'detail': '会话不存在'}, status=status.HTTP_404_NOT_FOUND)

        qs = conv.messages.all().order_by('created_at')

        # ── 离线消息支持：?since=<ISO timestamp> ──
        since = request.query_params.get('since', '').strip()
        if since:
            from django.utils.dateparse import parse_datetime
            since_dt = parse_datetime(since)
            if since_dt:
                qs = qs.filter(created_at__gt=since_dt)

        # ── 向上翻更早历史：?before_id=<id>（返回比该 id 更早的消息，按时间倒序分页后转正序）──
        before_id = request.query_params.get('before_id', '').strip()
        if before_id:
            try:
                before_id = int(before_id)
                qs = qs.filter(id__lt=before_id).order_by('-created_at', '-id')
            except ValueError:
                before_id = None

        page = self.paginate_queryset(qs)
        if page is not None:
            items = list(reversed(page)) if before_id else page
            serializer = MessageSerializer(items, many=True, context={
                'redact_sensitive': ConversationAccessPolicy.redact_sensitive(request.user),
            })
            resp = self.get_paginated_response(serializer.data)
            if before_id:
                resp.data['has_more_older'] = len(page) == self.paginator.get_page_size(request)
            return resp

        serializer = MessageSerializer(qs, many=True, context={
            'redact_sensitive': ConversationAccessPolicy.redact_sensitive(request.user),
        })
        return Response(serializer.data)

    @extend_schema(
        description='发送消息。Admin 回复时自动分配为当前会话的客服。支持 product_card 类型（card_data 仅存 spu_id+order_id 引用）。',
        request=SendMessageSerializer,
        responses={201: MessageSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request, conv_id):
        if ConversationAccessPolicy.is_ops(request.user):
            return Response({'detail': '只读运维不能发送消息'}, status=status.HTTP_403_FORBIDDEN)
        conv = _get_conv_for_user(conv_id, request.user)
        if not conv:
            return Response({'detail': '会话不存在'}, status=status.HTTP_404_NOT_FOUND)
        if conv.status == 'closed':
            return Response({'detail': '对话已关闭'}, status=status.HTTP_400_BAD_REQUEST)

        # 占线保护：admin 发送前检查会话是否被其他客服占用
        if _is_cs_staff(request.user):
            lock_resp = _lock_check(conv, request.user)
            if lock_resp is not None:
                return lock_resp

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ── 限流检查（仅用户端，Redis 滑动窗口） ──
        if not _is_cs_staff(request.user):
            if not _check_user_rate_limit(request.user.id):
                return Response(
                    {'detail': '消息发送过于频繁，请稍后再试（每分钟最多 30 条）'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # ── 5 条消息限制（仅用户端生效） ──
        if not _is_cs_staff(request.user):
            if conv.has_admin_reply:
                # 客服已回复 → 重置计数器
                conv.reset_msg_count()
            elif conv.user_msg_count >= getattr(settings, 'CS_USER_MSG_LIMIT_BEFORE_REPLY', 5):
                return Response(
                    {'detail': '客服尚未回复，您最多只能发送 5 条消息，请耐心等待'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        sender_type = 'admin' if _is_cs_staff(request.user) else 'user'

        # ── Admin 回复时认领 / 刷新占线 ──
        if sender_type == 'admin':
            if not conv.admin:
                conv.admin = request.user
                conv.save(update_fields=['admin'])
            # 占线归属：若非当前处理人则接管（含超管强接 / 超时释放后），并刷新时间戳
            if conv.handled_by_id != request.user.id:
                conv.handled_by = request.user
            conv.handled_at = timezone.now()
            conv.save(update_fields=['handled_by', 'handled_at'])

        # ── card_data 精简为引用（spu_id + order_id） ──
        # 前端语义字段 product_card = {id,name,main_image,price,order_id} 兜底兼容
        raw_card_data = data.get('card_data') or data.get('product_card') or {}
        card_data = _strip_card_data_to_refs(raw_card_data)

        # ── 管理员发送商品卡片时，自动补充订单信息 ──
        if sender_type == 'admin' and data.get('msg_type') == 'product_card' and card_data:
            card_data = self._enrich_admin_card_data(conv, card_data)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            sender_type=sender_type,
            content=data.get('content', ''),
            msg_type=data.get('msg_type', 'text'),
            file_url=data.get('file_url', ''),
            card_data=card_data,
            metadata=data.get('metadata', {}),
        )

        # 用户消息 → 递增计数；admin 消息不计数
        if sender_type == 'user':
            conv.increment_msg_count()

        # 本条消息之外的附件（图片/视频）单独成消息
        attachments = data.get('attachments') or []
        if attachments:
            _create_attachment_messages(conv, request.user, sender_type, attachments)

        # 实时推送：让对方（买家/客服）的 WebSocket 立即收到新消息并刷新
        _broadcast_new_message(conv.id, msg, sender_type)

        return Response(
            MessageSerializer(msg).data,
            status=status.HTTP_201_CREATED,
        )

    def _enrich_admin_card_data(self, conv, card_data: dict) -> dict:
        """
        管理员发送商品卡片时，自动补充用户订单信息。
        card_data 仅存储 spu_id + order_id + sku_id 引用。
        """
        spu_id = card_data.get('spu_id') or card_data.get('product_id') or card_data.get('id')
        if not spu_id or not conv:
            return card_data

        try:
            from apps.order.models import OrderItem
            order_item = (
                OrderItem.objects
                .filter(
                    sku__spu_id=spu_id,
                    order__user=conv.user,
                )
                .select_related('order', 'sku')
                .order_by('-order__created_at')
                .first()
            )

            if order_item:
                card_data['spu_id'] = order_item.sku.spu_id
                card_data['sku_id'] = order_item.sku_id
                card_data['order_id'] = order_item.order_id
                card_data['order_status'] = order_item.order.status
        except Exception as e:
            logger.warning(f'Enrich card_data error: {e}')

        return card_data
