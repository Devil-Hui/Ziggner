"""
用户行为追踪 API。

- GET  /api/tracking/history/       → 分页获取浏览历史
- POST /api/tracking/history/       → 记录一次浏览
- DELETE /api/tracking/history/     → 清空浏览历史
"""
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages

from .models import BrowseHistory
from .serializers import BrowseHistorySerializer, RecordBrowseSerializer


class BrowseHistoryListView(BaseApiView):
    """GET: 浏览历史分页列表 / POST: 记录浏览 / DELETE: 清空历史"""

    @extend_schema(responses={200: OpenApiResponse(description='Paginated browse history')})
    def get(self, request):
        """分页获取当前用户的浏览历史（含商品信息）。"""
        qs = (
            BrowseHistory.objects
            .filter(user=request.user)
            .select_related('spu__category')
            .prefetch_related('spu__skus')
            .order_by('-viewed_at')
        )

        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        start = (page - 1) * page_size
        total = qs.count()
        items = BrowseHistorySerializer(qs[start:start + page_size], many=True).data

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'items': items,
        })

    @extend_schema(request=RecordBrowseSerializer, responses={200: OpenApiResponse(description='Browse record created')})
    def post(self, request):
        """记录/更新一次商品浏览（upsert：重复浏览同一商品只更新时间）。"""
        serializer = RecordBrowseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        spu_id = serializer.validated_data['spu_id']

        try:
            obj, created = BrowseHistory.objects.update_or_create(
                user=request.user,
                spu_id=spu_id,
                defaults={'viewed_at': timezone.now()},
            )
        except IntegrityError:
            return Response(
                {'detail': Messages.BAD_REQUEST},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'id': obj.id,
            'spu_id': obj.spu_id,
            'viewed_at': obj.viewed_at,
            'created': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='History deleted')})
    def delete(self, request):
        """清空当前用户全部浏览历史。"""
        deleted, _ = BrowseHistory.objects.filter(user=request.user).delete()
        return Response({
            'message': Messages.SUCCESS,
            'deleted_count': deleted,
        })
