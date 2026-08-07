from django.utils import timezone
from django.db import models
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utils.api_base_view import BaseApiView
from ..models_notification import AdminNotification
from apps.rbac.permissions import HasPerm


class NotificationListView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        qs = AdminNotification.objects.filter(user=request.user).order_by('-created_at')

        # 过期状态过滤
        expired_filter = request.query_params.get('expired')
        if expired_filter is not None:
            now = timezone.now()
            if expired_filter.lower() == 'true':
                qs = qs.filter(expires_at__isnull=False, expires_at__lt=now)
            elif expired_filter.lower() == 'false':
                qs = qs.filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gte=now))

        total = qs.count()
        items = []
        for n in qs[start:end]:
            items.append({
                'id': n.id, 'type': n.type, 'title': n.title,
                'content': n.content, 'is_read': n.is_read,
                'related_type': n.related_type, 'related_id': n.related_id,
                'created_at': n.created_at, 'read_at': n.read_at,
                'expires_at': n.expires_at,
            })
        return Response({'total': total, 'page': page, 'items': items})


class NotificationUnreadCountView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        count = AdminNotification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class NotificationReadView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Marked as read')}
    )
    def post(self, request, notification_id):
        try:
            n = AdminNotification.objects.get(id=notification_id, user=request.user)
        except AdminNotification.DoesNotExist:
            return Response({'detail': 'Notification not found.'}, status=404)
        n.is_read = True
        n.read_at = timezone.now()
        n.save(update_fields=['is_read', 'read_at'])
        return Response({'message': 'Marked as read.'})


class NotificationReadAllView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='All marked as read')}
    )
    def post(self, request):
        AdminNotification.objects.filter(user=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({'message': 'All marked as read.'})