from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import BaseApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from apps.rbac.constants import Role
from apps.rbac.permissions import HasPerm
from apps.rbac.services import has_role
from .serializers import NotificationSerializer
from .services import NotificationService
from .models import Notification, OperationLog, OperationLogCategory


class NotificationListView(BaseApiView):
    """获取通知列表。可按未读和过期状态筛选。"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='unread', type=str, required=False, description='1=只看未读'),
            OpenApiParameter(name='expired', type=str, required=False, description='true=只看过期, false=只看未过期'),
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='Notification list with unread count')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        from django.utils import timezone

        unread_only = request.query_params.get('unread') == '1'
        expired_filter = request.query_params.get('expired')
        page, per_page = parse_pagination(request)
        results, total = NotificationService.list_for_user(request.user, unread_only=unread_only, page=page, per_page=per_page)

        # 过期状态过滤
        if expired_filter is not None:
            now = timezone.now()
            if expired_filter.lower() == 'true':
                results = [n for n in results if n.expires_at is not None and now >= n.expires_at]
            elif expired_filter.lower() == 'false':
                results = [n for n in results if n.expires_at is None or now < n.expires_at]
            total = len(results)

        data = NotificationSerializer(results, many=True).data
        return Response({'count': total, 'unread': NotificationService.unread_count(request.user), 'results': data})


class NotificationReadView(BaseApiView):
    """标记指定通知为已读。"""

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Marked as read')})
    def post(self, request, notification_id):
        NotificationService.mark_read(request.user, notification_id)
        return Response({'detail': Messages.NOTIFICATION_READ})


class NotificationReadAllView(BaseApiView):
    """全部标记为已读。"""

    @extend_schema(request=None, responses={200: OpenApiResponse(description='All marked as read')})
    def post(self, request):
        NotificationService.mark_all_read(request.user)
        return Response({'detail': Messages.NOTIFICATION_ALL_READ})


class OperationLogCategoryView(BaseApiView):
    """获取操作日志分类列表"""

    permission_classes = [HasPerm('rbac.audit.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List of log categories')})
    def get(self, request):
        categories = [
            {'value': c.value, 'label': c.label}
            for c in OperationLogCategory
        ]
        return Response(categories)


class OperationLogListView(BaseApiView):
    """操作日志列表（运维核查 / 超管）"""

    permission_classes = [HasPerm('rbac.audit.read')]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='category', type=str, required=False, description='按分类筛选: system/operation/notification/security/error'),
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='page_size', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='Paginated operation log list')},
    )
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        qs = OperationLog.objects.all()
        category = request.query_params.get('category', '').strip()
        if category:
            qs = qs.filter(category=category)

        total = qs.count()
        items = list(qs[start:end].values(
            'id', 'user_id', 'category', 'action', 'resource_type',
            'resource_id', 'detail', 'ip_address', 'created_at',
        ))
        if (
            has_role(request.user, Role.OPS.value)
            and not has_role(request.user, Role.SUPERADMIN.value)
        ):
            for item in items:
                item.update({
                    'user_id': None,
                    'resource_id': '',
                    'detail': {},
                    'ip_address': None,
                })

        return Response({'items': items, 'total': total, 'page': page})
