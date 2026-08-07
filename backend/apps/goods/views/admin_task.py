from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from apps.rbac.permissions import HasPerm


class TaskProgressView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request, task_id):
        from django.core.cache import cache
        progress = cache.get(f'task:{task_id}:progress', {})
        return Response({
            'task_id': task_id,
            'state': progress.get('state', 'PENDING'),
            'current': progress.get('current', 0),
            'total': progress.get('total', 0),
            'percent': progress.get('percent', 0),
            'result': progress.get('result'),
        })


class TaskListView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        return Response({'items': []})