from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.http import Http404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from utils.cache import Cache

from utils.api_base_view import BaseApiView, PublicApiView
from utils.api_permission import ApiPermission
from apps.rbac.permissions import HasPerm, IsSuperAdmin
from utils.response_codes import Messages
from .models import Coupon, CouponApplication, DiscountActivity
from .serializers import (
    ClaimCouponSerializer, CouponSerializer,
    GenerateCouponSerializer, UserCouponSerializer,
    ActivitySerializer, ActivityAdminSerializer,
    CouponApplicationDraftSerializer, CouponApplicationReviewSerializer,
    CouponApplicationRevisionSerializer, CouponApplicationSerializer,
)
from .services import CouponApplicationService, PromotionService


def _application_error(exc):
    if isinstance(exc, PermissionError):
        raise PermissionDenied(str(exc))
    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class CouponApplicationCreateView(BaseApiView):
    permission_classes = [ApiPermission]

    @extend_schema(request=CouponApplicationDraftSerializer, responses={201: CouponApplicationSerializer})
    def post(self, request):
        serializer = CouponApplicationDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        group_id = data.pop('admin_group_id')
        try:
            application = CouponApplicationService.create_draft(request.user, group_id, data)
        except (PermissionError, ValueError) as exc:
            return _application_error(exc)
        return Response(CouponApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class MyCouponApplicationView(BaseApiView):
    permission_classes = [ApiPermission]

    @extend_schema(responses={200: CouponApplicationSerializer(many=True)})
    def get(self, request):
        applications = CouponApplication.objects.filter(applicant=request.user).select_related(
            'applicant', 'admin_group', 'reviewer', 'coupon',
        ).prefetch_related('approval_history__actor')
        return Response({'items': CouponApplicationSerializer(applications, many=True).data})


class CouponApplicationDetailView(BaseApiView):
    permission_classes = [ApiPermission]

    @extend_schema(request=CouponApplicationRevisionSerializer, responses={200: CouponApplicationSerializer})
    def patch(self, request, application_id):
        serializer = CouponApplicationRevisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not CouponApplication.objects.filter(pk=application_id, applicant=request.user).exists():
            raise Http404
        try:
            application = CouponApplicationService.revise(
                request.user, application_id, serializer.validated_data,
            )
        except ValueError as exc:
            return _application_error(exc)
        return Response(CouponApplicationSerializer(application).data)


class CouponApplicationSubmitView(BaseApiView):
    permission_classes = [ApiPermission]

    @extend_schema(request=None, responses={200: CouponApplicationSerializer})
    def post(self, request, application_id):
        if not CouponApplication.objects.filter(pk=application_id, applicant=request.user).exists():
            raise Http404
        try:
            application = CouponApplicationService.submit(request.user, application_id)
        except ValueError as exc:
            return _application_error(exc)
        return Response(CouponApplicationSerializer(application).data)


class PendingCouponApplicationView(BaseApiView):
    permission_classes = [IsSuperAdmin]

    @extend_schema(responses={200: CouponApplicationSerializer(many=True)})
    def get(self, request):
        applications = CouponApplication.objects.filter(
            status=CouponApplication.Status.PENDING,
        ).select_related('applicant', 'admin_group', 'reviewer', 'coupon')
        return Response({'items': CouponApplicationSerializer(applications, many=True).data})


class CouponApplicationReviewView(BaseApiView):
    permission_classes = [IsSuperAdmin]

    @extend_schema(request=CouponApplicationReviewSerializer, responses={200: CouponApplicationSerializer})
    def post(self, request, application_id):
        serializer = CouponApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not CouponApplication.objects.filter(pk=application_id).exists():
            raise Http404
        try:
            coupon = CouponApplicationService.review(
                request.user, application_id, **serializer.validated_data,
            )
        except (PermissionError, ValueError) as exc:
            return _application_error(exc)
        application = CouponApplication.objects.select_related(
            'applicant', 'admin_group', 'reviewer', 'coupon',
        ).get(pk=application_id)
        payload = CouponApplicationSerializer(application).data
        payload['coupon'] = CouponSerializer(coupon).data if coupon else None
        return Response(payload)


class CouponListView(PublicApiView):
    """可领取的优惠券列表，公开访问。"""

    @extend_schema(responses={200: CouponSerializer(many=True)})
    def get(self, request):
        return Response(CouponSerializer(PromotionService.list_available(), many=True).data)


class CouponDetailView(PublicApiView):
    """公开优惠券分享详情，游客可查看。"""

    @extend_schema(responses={200: CouponSerializer})
    def get(self, request, code):
        try:
            detail = PromotionService.get_public_detail(code)
        except ValueError as exc:
            if str(exc) == 'COUPON_NOT_FOUND':
                return Response(
                    {'detail': Messages.COUPON_NOT_FOUND},
                    status=status.HTTP_404_NOT_FOUND,
                )
            raise
        return Response(detail)


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
                'COUPON_AUDIENCE_MISMATCH': (
                    Messages.COUPON_AUDIENCE_MISMATCH,
                    status.HTTP_403_FORBIDDEN,
                ),
            }
            if str(e) in error_map:
                msg, code = error_map[str(e)]
                return Response({'detail': msg}, status=code)
            raise
        return Response({'detail': Messages.COUPON_CLAIMED})


class GenerateCouponView(BaseApiView):
    """生成优惠券并返回折扣信息（仅管理员可用）。"""
    permission_classes = [HasPerm('promotion.coupon.write')]

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
    permission_classes = [HasPerm('promotion.activity.write')]

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
    permission_classes = [HasPerm('promotion.activity.write')]

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
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Activity deleted')})
    def delete(self, request, pk):
        activity = DiscountActivity.objects.filter(pk=pk).first()
        if not activity:
            return Response({'detail': Messages.COUPON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        activity.delete()
        return Response({'detail': 'Activity deleted successfully.'})
