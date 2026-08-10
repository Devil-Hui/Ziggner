"""Promotion admin CRUD views for Coupon and DiscountActivity."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from apps.rbac.permissions import HasPerm
from .models import Coupon, DiscountActivity, ActivitySKURelation
from .serializers import (
    CouponAdminSerializer, ActivityAdminSerializer,
    CouponSerializer, ActivitySerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'size'
    page_query_param = 'page'


# ── Coupon Admin ────────────────────────────────────

class CouponAdminListView(BaseApiView):
    """Admin coupon list + create."""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: CouponSerializer(many=True)})
    def get(self, request):
        qs = Coupon.objects.all().order_by('-created_at')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(code__icontains=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CouponSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=CouponAdminSerializer, responses={201: CouponSerializer})
    def post(self, request):
        serializer = CouponAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coupon = serializer.save(created_by=request.user)
        return Response(CouponSerializer(coupon).data, status=status.HTTP_201_CREATED)


class CouponAdminDetailView(BaseApiView):
    """Admin coupon update + delete."""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(request=CouponAdminSerializer, responses={200: CouponSerializer})
    def put(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CouponAdminSerializer(coupon, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CouponSerializer(coupon).data)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Delete')})
    def delete(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)
        coupon.is_active = False
        coupon.save()
        return Response({'message': 'Coupon deleted.'})


# ── Activity Admin ──────────────────────────────────

class ActivityAdminListView(BaseApiView):
    """Admin activity list + create."""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(responses={200: ActivitySerializer(many=True)})
    def get(self, request):
        qs = DiscountActivity.objects.all().order_by('-created_at')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ActivitySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=ActivityAdminSerializer, responses={201: ActivitySerializer})
    def post(self, request):
        serializer = ActivityAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity = serializer.save(created_by=request.user)
        return Response(ActivitySerializer(activity).data, status=status.HTTP_201_CREATED)


class ActivityAdminDetailView(BaseApiView):
    """Admin activity update + delete."""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(request=ActivityAdminSerializer, responses={200: ActivitySerializer})
    def put(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(pk=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ActivityAdminSerializer(activity, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ActivitySerializer(activity).data)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Delete')})
    def delete(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(pk=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        activity.delete()
        return Response({'message': 'Activity deleted.'})


# ── Coupon Scope ──────────────────────────────────

class CouponScopeView(BaseApiView):
    """Set coupon applicable product scope."""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='Scope updated')})
    def post(self, request, pk):
        try:
            coupon = Coupon.objects.get(id=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': Messages.COUPON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        scope_type = request.data.get('scope_type', 'all')
        target_ids = request.data.get('target_ids', [])

        coupon.scope_type = scope_type
        coupon.target_ids = target_ids
        coupon.save(update_fields=['scope_type', 'target_ids'])

        return Response({'message': Messages.SUCCESS, 'scope_type': scope_type})


# ── Activity SKU ──────────────────────────────────

class ActivitySKUView(BaseApiView):
    """Set activity associated SKUs."""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='SKU linked')})
    def post(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(id=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)

        sku_ids = request.data.get('sku_ids', [])
        activity_price = request.data.get('activity_price')
        if activity_price is None or activity_price == '':
            return Response({'detail': 'activity_price is required.'}, status=status.HTTP_400_BAD_REQUEST)

        ActivitySKURelation.objects.filter(activity=activity).delete()

        if sku_ids:
            ActivitySKURelation.objects.bulk_create([
                ActivitySKURelation(
                    activity=activity,
                    sku_id=sku_id,
                    activity_price=activity_price,
                ) for sku_id in sku_ids
            ])

        return Response({
            'message': Messages.SUCCESS,
            'linked_count': len(sku_ids),
        })