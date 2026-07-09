from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    SendMessageSerializer, CreateConversationSerializer,
)


class ConversationListView(BaseApiView):
    """获取当前用户的对话列表，或创建新对话"""

    @extend_schema(
        responses={200: ConversationListSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        if request.user.is_staff:
            # staff 只能看到分配给自己的会话
            qs = Conversation.objects.filter(admin=request.user).order_by('-updated_at')
        else:
            qs = Conversation.objects.filter(user=request.user).order_by('-updated_at')
        serializer = ConversationListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        request=CreateConversationSerializer,
        responses={201: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request):
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
        if user.is_staff:
            return Conversation.objects.filter(id=conv_id, admin=user).first()
        return Conversation.objects.filter(id=conv_id, user=user).first()

    @extend_schema(responses={200: ConversationDetailSerializer})
    def get(self, request, conv_id):
        conv = self._get_conv(conv_id, request.user)
        if not conv:
            return Response({'detail': '对话不存在'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ConversationDetailSerializer(conv).data)

    @extend_schema(
        request=SendMessageSerializer,
        responses={201: ConversationDetailSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request, conv_id):
        conv = self._get_conv(conv_id, request.user)
        if not conv:
            return Response({'detail': '对话不存在'}, status=status.HTTP_404_NOT_FOUND)
        if conv.status == 'closed':
            return Response({'detail': '对话已关闭'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        sender = 'admin' if request.user.is_staff else 'user'
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
        if request.user.is_staff:
            conv = Conversation.objects.filter(id=conv_id, admin=request.user).first()
        else:
            conv = Conversation.objects.filter(id=conv_id, user=request.user).first()
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
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': '请选择文件'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
                         'video/mp4', 'video/webm', 'video/quicktime']
        if file.content_type not in allowed_types:
            return Response({'detail': '不支持的文件类型'}, status=status.HTTP_400_BAD_REQUEST)

        # 最大 20MB
        if file.size > 20 * 1024 * 1024:
            return Response({'detail': '文件大小不能超过 20MB'}, status=status.HTTP_400_BAD_REQUEST)

        # 保存到 media/support/
        from django.core.files.storage import default_storage
        from django.conf import settings
        import uuid, os

        ext = os.path.splitext(file.name)[1]
        filename = f'support/{uuid.uuid4().hex}{ext}'
        path = default_storage.save(filename, file)
        url = f'{settings.MEDIA_URL}{path}'

        return Response({'url': url, 'filename': file.name})