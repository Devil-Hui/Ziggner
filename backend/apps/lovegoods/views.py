from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import BaseApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from .serializers import FavoriteSerializer
from .services import FavoriteService


class FavoriteListView(BaseApiView):
    """获取当前用户收藏列表。"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: FavoriteSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        page, per_page = parse_pagination(request)
        results, total = FavoriteService.list_by_user(request.user, page=page, per_page=per_page)
        data = FavoriteSerializer(results, many=True).data
        return Response({'count': total, 'results': data})


class FavoriteToggleView(BaseApiView):
    """切换收藏状态。已收藏则取消，未收藏则添加。"""

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Favorited or unfavorited')})
    def post(self, request, spu_id):
        if spu_id <= 0:
            return Response({'detail': Messages.INVALID_PRODUCT_ID}, status=status.HTTP_400_BAD_REQUEST)
        try:
            favorited = FavoriteService.toggle(request.user, spu_id)
        except ValueError as e:
            if str(e) == 'FAVORITES_LIMIT_REACHED':
                return Response(
                    {'detail': Messages.FAVORITES_LIMIT_REACHED.format(max_count=FavoriteService.MAX_FAVORITES)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise
        return Response({'spu_id': spu_id, 'favorited': favorited})
