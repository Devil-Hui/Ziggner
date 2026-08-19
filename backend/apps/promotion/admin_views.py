"""Promotion admin CRUD views for Coupon and DiscountActivity."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from apps.rbac.permissions import HasPerm
from .models import Coupon, DiscountActivity, ActivitySKURelation, PromoCode, CouponScope
from .serializers import (
    CouponAdminSerializer, ActivityAdminSerializer,
    CouponSerializer, ActivitySerializer,
    PromoCodeCreateSerializer, PromoCodeDetailSerializer, PromoCodeSerializer,
)
from .services import PromoCodeService


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
        # 硬删除：优惠券的 is_active 字段同时承担「启用/停用」开关语义，
        # 若此处做软删除（is_active=False）会与「停用」彻底混淆，且列表接口
        # 返回全量券，导致删除后券仍以「已停用」残留列表、用户误以为「删不掉」。
        # 真正的「停用」由更新接口的 is_active 开关处理，删除即移除记录。
        coupon.delete()
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

        if scope_type == 'all':
            CouponScope.objects.filter(coupon=coupon).delete()
        else:
            type_map = {
                'spu': CouponScope.ScopeType.SPU,
                'product': CouponScope.ScopeType.SPU,
                'category': CouponScope.ScopeType.CATEGORY,
                'brand': CouponScope.ScopeType.BRAND,
            }
            st = type_map.get(scope_type)
            if st is None:
                return Response({'detail': 'Invalid scope_type.'}, status=status.HTTP_400_BAD_REQUEST)
            CouponScope.objects.filter(coupon=coupon, scope_type=st).delete()
            CouponScope.objects.bulk_create([
                CouponScope(coupon=coupon, scope_type=st, target_id=tid)
                for tid in (target_ids or [])
            ])

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


# ── 专属推广码（引流追踪） ──────────────────────────

class PromoCodeAdminListView(BaseApiView):
    """管理端：某基础券下的推广码列表 / 批量创建。"""

    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: PromoCodeDetailSerializer(many=True)})
    def get(self, request, pk=None):
        # 路由 coupon/<int:pk>/promo-codes 优先用 pk，兼容 query 参数
        coupon_id = request.query_params.get('coupon_id') or pk
        qs = PromoCodeService.dashboard(coupon_id=coupon_id)
        return Response(PromoCodeDetailSerializer(qs, many=True).data)

    @extend_schema(request=PromoCodeCreateSerializer, responses={201: PromoCodeSerializer(many=True)})
    def post(self, request, pk=None):
        serializer = PromoCodeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # 路由 coupon/<int:pk>/promo-codes 优先用 pk，兼容 body 中的 coupon_id
        coupon_id = request.data.get('coupon_id') or pk
        if not coupon_id:
            return Response({'detail': 'coupon_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            created = PromoCodeService.create_codes(
                int(coupon_id),
                request.user,
                codes=data.get('codes') or None,
                name=data.get('name', ''),
                note=data.get('note', ''),
                count=data.get('count', 1),
                prefix=data.get('prefix', ''),
            )
        except ValueError as e:
            msg = str(e)
            if msg.startswith('PROMO_CODE_EXISTS:'):
                return Response(
                    {'detail': f'推广码已存在：{msg.split(":", 1)[1]}'},
                    status=status.HTTP_409_CONFLICT,
                )
            mapping = {
                'COUPON_NOT_FOUND': (Messages.COUPON_NOT_FOUND, status.HTTP_404_NOT_FOUND),
                'EMPTY_PROMO_CODES': ('推广码列表不能为空。', status.HTTP_400_BAD_REQUEST),
                'DUPLICATE_PROMO_CODE_IN_REQUEST': ('推广码列表中存在重复。', status.HTTP_400_BAD_REQUEST),
                'TOO_MANY_PROMO_CODES': ('单次创建推广码数量过多。', status.HTTP_400_BAD_REQUEST),
            }
            if msg in mapping:
                m, c = mapping[msg]
                return Response({'detail': m}, status=c)
            raise
        return Response(PromoCodeSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class PromoCodeDashboardView(BaseApiView):
    """管理端：专属券引流看板（领取/独立用户/付款订单/GMV）。"""

    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: PromoCodeDetailSerializer(many=True)})
    def get(self, request, pk=None):
        # 路由 coupon/<int:pk>/promo-dashboard 优先用 pk，兼容 query 参数
        coupon_id = request.query_params.get('coupon_id') or pk
        qs = PromoCodeService.dashboard(coupon_id=coupon_id)
        return Response(PromoCodeDetailSerializer(qs, many=True).data)


class PromoCodeAdminDetailView(BaseApiView):
    """管理端：单个推广码的启用/停用、改名改备注、删除。"""

    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(request=PromoCodeSerializer, responses={200: PromoCodeDetailSerializer})
    def patch(self, request, pk):
        try:
            pc = PromoCode.objects.get(pk=pk)
        except PromoCode.DoesNotExist:
            return Response({'detail': 'Promo code not found.'}, status=status.HTTP_404_NOT_FOUND)
        # 仅允许修改业务字段；码值(code)/归属(coupon)等只读字段会被序列化器忽略
        serializer = PromoCodeSerializer(pc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PromoCodeDetailSerializer(pc).data)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Deleted')})
    def delete(self, request, pk):
        try:
            pc = PromoCode.objects.get(pk=pk)
        except PromoCode.DoesNotExist:
            return Response({'detail': 'Promo code not found.'}, status=status.HTTP_404_NOT_FOUND)
        pc.delete()
        return Response({'message': 'Promo code deleted.'})