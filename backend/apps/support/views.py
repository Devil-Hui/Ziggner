from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.upload_security import (
    UploadValidationError,
    strip_exif,
    validate_media_upload,
)
from .models import Conversation, Message
from .policies import SupportConversationAccessPolicy
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    SendMessageSerializer, CreateConversationSerializer,
    optimize_conversation_list_qs,
)

def _is_support_staff(user) -> bool:
    """客服/管理侧：超管、组长、组员均可处理工单会话。"""
    return SupportConversationAccessPolicy.is_agent(user)


class ConversationListView(BaseApiView):
    """获取当前用户的对话列表，或创建新对话"""

    @extend_schema(
        responses={200: ConversationListSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        is_staff = (
            _is_support_staff(request.user)
            or SupportConversationAccessPolicy.is_ops(request.user)
        )
        if is_staff:
            qs = SupportConversationAccessPolicy.scope_queryset(
                Conversation.objects.all(), request.user,
            ).select_related('user', 'admin')
        else:
            qs = Conversation.objects.filter(user=request.user).select_related('user', 'admin')
        qs = optimize_conversation_list_qs(qs, is_staff=is_staff).order_by('-updated_at')
        serializer = ConversationListSerializer(qs, many=True, context={
            'request': request,
            'redact_sensitive': SupportConversationAccessPolicy.redact_sensitive(request.user),
        })
        return Response(serializer.data)

    @extend_schema(
        request=CreateConversationSerializer,
        responses={201: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request):
        if SupportConversationAccessPolicy.is_ops(request.user):
            return Response({'detail': '只读运维不能创建会话'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CreateConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        conv = Conversation.objects.create(
            user=request.user,
            subject=data.get('subject', ''),
            spu_id=data.get('spu_id'),
            cart_snapshot=data.get('cart_snapshot', []),
        )

        # 创建首条消息
        content = data.get('content', '')
        attachments = data.get('attachments', [])
        product_snapshot = data.get('product_snapshot')
        if content or attachments or product_snapshot:
            Message.objects.create(
                conversation=conv,
                sender='user',
                content=content,
                attachments=attachments,
                product_snapshot=product_snapshot,
            )

        return Response(
            ConversationDetailSerializer(conv).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(BaseApiView):
    """获取对话详情（含消息列表），或发送新消息"""

    def _get_conv(self, conv_id, user):
        return SupportConversationAccessPolicy.get_conversation(conv_id, user)

    @extend_schema(responses={200: ConversationDetailSerializer})
    def get(self, request, conv_id):
        conv = self._get_conv(conv_id, request.user)
        if not conv:
            return Response({'detail': '对话不存在'}, status=status.HTTP_404_NOT_FOUND)
        # 详情：预取 messages + spu，避免 serializer 二次查库
        conv = (
            Conversation.objects
            .filter(pk=conv.pk)
            .select_related('spu', 'user', 'admin')
            .prefetch_related('messages')
            .first()
        )
        return Response(ConversationDetailSerializer(conv, context={
            'request': request,
            'redact_sensitive': SupportConversationAccessPolicy.redact_sensitive(request.user),
        }).data)

    @extend_schema(
        request=SendMessageSerializer,
        responses={201: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request, conv_id):
        if SupportConversationAccessPolicy.is_ops(request.user):
            return Response({'detail': '只读运维不能发送消息'}, status=status.HTTP_403_FORBIDDEN)
        conv = self._get_conv(conv_id, request.user)
        if not conv:
            return Response({'detail': '对话不存在'}, status=status.HTTP_404_NOT_FOUND)
        if conv.status == 'closed':
            return Response({'detail': '对话已关闭'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        sender = 'admin' if _is_support_staff(request.user) else 'user'
        Message.objects.create(
            conversation=conv,
            sender=sender,
            content=data.get('content', ''),
            attachments=data.get('attachments', []),
            product_snapshot=data.get('product_snapshot'),
        )

        conv.updated_at = Message.objects.filter(conversation=conv).order_by('-created_at').first().created_at
        conv.save(update_fields=['updated_at'])

        return Response(
            ConversationDetailSerializer(conv).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationCloseView(BaseApiView):
    """关闭对话"""

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Conversation closed')})
    def post(self, request, conv_id):
        if SupportConversationAccessPolicy.is_ops(request.user):
            return Response({'detail': '只读运维不能关闭会话'}, status=status.HTTP_403_FORBIDDEN)
        conv = SupportConversationAccessPolicy.get_conversation(conv_id, request.user)
        if not conv:
            return Response({'detail': '对话不存在'}, status=status.HTTP_404_NOT_FOUND)
        conv.status = 'closed'
        conv.save(update_fields=['status'])
        Message.objects.create(
            conversation=conv,
            sender='admin',
            content='对话已关闭，如有需要请开启新对话。',
            is_system=True,
        )
        return Response({'detail': '对话已关闭'})


class UploadAttachmentView(BaseApiView):
    """上传附件（图片/视频）"""

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='File uploaded')})
    def post(self, request):
        if SupportConversationAccessPolicy.is_ops(request.user):
            return Response({'detail': '只读运维不能上传附件'}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': '请选择文件'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extension, content_type = validate_media_upload(
                file,
                image_max_bytes=20 * 1024 * 1024,
                video_max_bytes=20 * 1024 * 1024,
            )
        except UploadValidationError:
            return Response(
                {'detail': '文件扩展名、真实内容或大小不符合要求'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file.content_type = content_type

        # 保存到 support/{yyyy}/{mm}/{dd}/（大厂路径规范，见 utils.storage.media_key）
        from django.core.files.storage import default_storage
        from utils.storage import media_key

        filename = media_key('support', extension)
        # 图片剥离 EXIF；视频原样保存
        save_file = strip_exif(file) if content_type.startswith('image/') else file
        path = default_storage.save(filename, save_file)
        # 统一用 default_storage.url()：local 返回 /media/support/... 相对路径，
        # r2 返回 https://cdn.ziggner.com/support/... 绝对 CDN 地址。
        # 注意：不可再用 f'{MEDIA_URL}{path}' —— R2 模式下 MEDIA_URL 含 /media/ 段，
        # 会与对象实际 key（无 /media/）错位，导致附件 404。
        url = default_storage.url(path)

        return Response({'url': url, 'filename': file.name})
