from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from utils.cache import Cache

from utils.api_base_view import BaseApiView, PublicApiView
from apps.goods.admin_permissions import IsStaffOrAbove
from utils.response_codes import Messages
from .models import Coupon, DiscountActivity
from .serializers import (
    ClaimCouponSerializer, CouponSerializer,
    GenerateCouponSerializer, UserCouponSerializer,
    ActivitySerializer, ActivityAdminSerializer,
)
from .services import PromotionService


class CouponListView(PublicApiView):
    """可领取的优惠券列表，公开访问。"""

    @extend_schema(responses={200: CouponSerializer(many=True)})
    def get(self, request):
        return Response(CouponSerializer(PromotionService.list_available(), many=True).data)


class MyCouponView(BaseApiView):
    """当前用户已领取的优惠券。"""

    @extend_schema(
        responses={200: UserCouponSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        status_filter = request.query_params.get('status')
        user_coupons = PromotionService.list_user_coupons(request.user, status=status_filter)
        return Response(UserCouponSerializer(user_coupons, many=True).data)


class ClaimCouponView(BaseApiView):
    """通过券码领取优惠券。"""

    @extend_schema(request=None, responses={200: OpenApiResponse(description='coupon claimed')})
    def post(self, request, code):
        try:
            PromotionService.claim(request.user, code)
        except ValueError as e:
            error_map = {
                'COUPON_NOT_FOUND': (Messages.COUPON_NOT_FOUND, status.HTTP_404_NOT_FOUND),
                'COUPON_UNAVAILABLE': (Messages.COUPON_UNAVAILABLE, status.HTTP_400_BAD_REQUEST),
                'COUPON_LIMIT_REACHED': (Messages.COUPON_LIMIT_REACHED, status.HTTP_400_BAD_REQUEST),
            }
            if str(e) in error_map:
                msg, code = error_map[str(e)]
                return Response({'detail': msg}, status=code)
            raise
        return Response({'detail': Messages.COUPON_CLAIMED})


class GenerateCouponView(BaseApiView):
    """生成优惠券并返回折扣信息（仅管理员可用）。"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=GenerateCouponSerializer,
        responses={201: OpenApiResponse(description='coupon created')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request):
        serializer = GenerateCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        coupon = Coupon.objects.create(
            code=data.get('code') or None,
            discount_type=data['discount_type'],
            amount=data['amount'],
            min_amount=data['min_amount'],
            max_discount=data.get('max_discount'),
            total_count=data['total_count'],
            stackable=data.get('stackable', False),
            start_time=data['start_time'],
            end_time=data['end_time'],
            created_by=request.user,
        )
        Cache('promotion').delete('available')
        return Response(CouponSerializer(coupon).data, status=status.HTTP_201_CREATED)


# ==================== 折扣活动 ====================

class ActivityListView(PublicApiView):
    """折扣活动列表（公开）"""

    @extend_schema(responses={200: ActivitySerializer(many=True)})
    def get(self, request):
        from django.utils import timezone
        now = timezone.now()
        activities = DiscountActivity.objects.filter(
            start_time__lte=now, end_time__gte=now,
        ).order_by('-created_at')
        return Response(ActivitySerializer(activities, many=True).data)


class ActivityCreateView(BaseApiView):
    """创建折扣活动（仅管理员）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(request=ActivityAdminSerializer, responses={201: ActivitySerializer})
    def post(self, request):
        serializer = ActivityAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        activity = DiscountActivity.objects.create(
            name=data['name'],
            type=data['type'],
            rule=data.get('rule', []),
            start_time=data['start_time'],
            end_time=data['end_time'],
            created_by=request.user,
        )
        return Response(ActivitySerializer(activity).data, status=status.HTTP_201_CREATED)


class ActivityUpdateView(BaseApiView):
    """更新折扣活动（仅管理员）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(request=ActivityAdminSerializer, responses={200: ActivitySerializer})
    def patch(self, request, pk):
        activity = DiscountActivity.objects.filter(pk=pk).first()
        if not activity:
            return Response({'detail': Messages.COUPON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        serializer = ActivityAdminSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for k, v in serializer.validated_data.items():
            setattr(activity, k, v)
        activity.save()
        return Response(ActivitySerializer(activity).data)


class ActivityDeleteView(BaseApiView):
    """删除折扣活动（仅管理员）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(responses={200: OpenApiResponse(description='Activity deleted')})
    def delete(self, request, pk):
        activity = DiscountActivity.objects.filter(pk=pk).first()
        if not activity:
            return Response({'detail': Messages.COUPON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        activity.delete()
        return Response({'detail': 'Activity deleted successfully.'})
