from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import PublicApiView, BaseApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from .serializers import CreateReviewSerializer, ReviewSerializer, UpdateReviewSerializer
from .services import ReviewService


class ReviewListView(PublicApiView):
    """SPU 评价查询（公开）"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='spu_id', type=int, required=True, description='SPU ID'),
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='Review list')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        spu_id = request.query_params.get('spu_id')
        if not spu_id:
            return Response({'detail': Messages.MISSING_SPU_ID}, status=status.HTTP_400_BAD_REQUEST)
        results, total = ReviewService.list_by_spu(
            int(spu_id),
            *parse_pagination(request),
        )
        avg_rating = ReviewService.get_spu_stats(int(spu_id)).get('avg_rating', 0)
        return Response({
            'count': total,
            'results': ReviewSerializer(results, many=True).data,
            'avg_rating': avg_rating,
        })


class ReviewableItemsView(BaseApiView):
    """获取用户可评价的订单项（已签收/已完成且未评价）"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='spu_id', type=int, required=True, description='SPU ID'),
        ],
        responses={200: OpenApiResponse(description='Reviewable order items')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        spu_id = request.query_params.get('spu_id')
        if not spu_id:
            return Response({'detail': Messages.MISSING_SPU_ID}, status=status.HTTP_400_BAD_REQUEST)
        items = ReviewService.get_reviewable_items(request.user, int(spu_id))
        return Response({'order_items': items})


class CreateReviewView(BaseApiView):
    """创建评价（需登录）"""

    @extend_schema(request=CreateReviewSerializer, responses={201: ReviewSerializer})
    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            review = ReviewService.create(user=request.user, **serializer.validated_data)
        except ValueError as e:
            error_map = {
                'NOT_PURCHASED': (Messages.REVIEW_NOT_PURCHASED, 400),
                'ORDER_NOT_DELIVERED': (Messages.REVIEW_ORDER_NOT_DELIVERED, 400),
                'ALREADY_REVIEWED': (Messages.REVIEW_ALREADY_EXISTS, 409),
            }
            msg, code = error_map.get(str(e), (None, None))
            if msg:
                return Response({'detail': msg}, status=code)
            raise
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class MyReviewView(BaseApiView):
    """当前用户的评价列表"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='My review list')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        results, total = ReviewService.list_by_user(
            request.user,
            *parse_pagination(request),
        )
        return Response({'count': total, 'results': ReviewSerializer(results, many=True).data})


class EditReviewView(BaseApiView):
    """修改评价（仅一次）"""

    @extend_schema(request=UpdateReviewSerializer, responses={200: ReviewSerializer})
    def patch(self, request, review_id):
        serializer = UpdateReviewSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            review = ReviewService.update(request.user, review_id, **serializer.validated_data)
        except ValueError as e:
            error_map = {
                'REVIEW_NOT_FOUND': (Messages.REVIEW_NOT_FOUND, 404),
                'ALREADY_EDITED': (Messages.REVIEW_ALREADY_EDITED, 400),
            }
            if str(e) in error_map:
                msg, code = error_map[str(e)]
                return Response({'detail': msg}, status=code)
            raise
        return Response(ReviewSerializer(review).data)


class DeleteReviewView(BaseApiView):
    """删除评价（软删除，仅作者可删）"""

    @extend_schema(responses={200: OpenApiResponse(description='Review deleted')})
    def delete(self, request, review_id):
        try:
            ReviewService.delete(request.user, review_id)
        except ValueError as e:
            if str(e) == 'REVIEW_NOT_FOUND':
                return Response({'detail': Messages.REVIEW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            raise
        return Response({'detail': 'Review deleted successfully.'})


class ReplyReviewView(BaseApiView):
    """回复评价（商家或用户）"""

    @extend_schema(
        request=CreateReviewSerializer,
        responses={201: ReviewSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request, review_id):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reply = ReviewService.create_reply(
                user=request.user,
                parent_id=review_id,
                **{k: v for k, v in serializer.validated_data.items() if k not in ('spu_id', 'order_item_id')},
            )
        except ValueError as e:
            error_map = {
                'REVIEW_NOT_FOUND': (Messages.REVIEW_NOT_FOUND, 404),
                'CANNOT_REPLY_SELF': ('Cannot reply to your own review.', 400),
            }
            if str(e) in error_map:
                msg, code = error_map[str(e)]
                return Response({'detail': msg}, status=code)
            raise
        return Response(ReviewSerializer(reply).data, status=status.HTTP_201_CREATED)
