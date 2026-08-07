"""
订单管理后台 API — 替代 Django Admin 中的订单列表/发货/售后审核。
对齐 promotion/admin_views.py 与 goods Admin 权限体系。
"""
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.rbac.permissions import HasPerm
from utils.api_base_view import BaseApiView
from utils.exceptions import ErrorCodes, api_error_response

from .models import AfterSale, AfterSaleStatus, Order, OrderStatus
from .policies import OrderAdminAccessPolicy
from .serializers import (
    AfterSaleSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    ShipOrderSerializer,
    AfterSaleReviewSerializer,
)


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'size'
    page_query_param = 'page'


class OrderAdminListView(BaseApiView):
    """管理端订单列表：支持状态/支付状态/关键字搜索。"""
    permission_classes = [HasPerm('order.read')]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='status', type=str, required=False),
            OpenApiParameter(name='payment_status', type=str, required=False),
            OpenApiParameter(name='search', type=str, required=False, description='order_no/shipping_name/phone'),
            OpenApiParameter(name='page', type=int, required=False),
            OpenApiParameter(name='size', type=int, required=False),
        ],
        responses={200: OrderListSerializer(many=True)},
    )
    def get(self, request):
        qs = Order.objects.select_related('user').annotate(
            _item_count=Count('items')
        ).all().order_by('-created_at')
        qs = OrderAdminAccessPolicy.scope_orders(qs, request.user)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        payment_status = request.query_params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status=payment_status)

        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(order_no__icontains=search)
                | Q(shipping_name__icontains=search)
                | Q(shipping_phone__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = OrderListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class OrderAdminDetailView(BaseApiView):
    """管理端订单详情。"""
    permission_classes = [HasPerm('order.read')]

    @extend_schema(responses={200: OrderDetailSerializer})
    def get(self, request, order_no):
        order = OrderAdminAccessPolicy.get_order(
            order_no,
            request.user,
            Order.objects.select_related('user')
            .prefetch_related('items', 'after_sales'),
        )
        if not order:
            return api_error_response(ErrorCodes.ORDER_NOT_FOUND)
        redact_sensitive = OrderAdminAccessPolicy.redact_sensitive(request.user)
        data = OrderDetailSerializer(order, context={
            'redact_sensitive': redact_sensitive,
        }).data
        data['user_id'] = None if redact_sensitive else order.user_id
        data['username'] = '' if redact_sensitive else getattr(order.user, 'username', '')
        return Response(data)


class OrderAdminShipView(BaseApiView):
    """管理端发货：paid → shipped。"""
    permission_classes = [HasPerm('order.ship')]

    @extend_schema(request=ShipOrderSerializer, responses={200: OpenApiResponse(description='Shipped')})
    def post(self, request, order_no):
        serializer = ShipOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tracking_no = serializer.validated_data['tracking_no']

        order = OrderAdminAccessPolicy.get_order(order_no, request.user)
        if not order:
            return api_error_response(ErrorCodes.ORDER_NOT_FOUND)
        try:
            order.ship(tracking_no=tracking_no)
        except ValueError as e:
            return api_error_response(ErrorCodes.BAD_REQUEST, detail=str(e))
        return Response({'detail': 'Order shipped', 'order_no': order.order_no, 'tracking_no': tracking_no})


class OrderAdminCancelView(BaseApiView):
    """管理端取消订单（pending_payment / paid）。"""
    permission_classes = [HasPerm('order.cancel')]

    @extend_schema(responses={200: OpenApiResponse(description='Cancelled')})
    def post(self, request, order_no):
        reason = request.data.get('reason', 'Cancelled by admin')
        order = OrderAdminAccessPolicy.get_order(order_no, request.user)
        if not order:
            return api_error_response(ErrorCodes.ORDER_NOT_FOUND)
        try:
            order.cancel(reason=reason)
        except ValueError as e:
            return api_error_response(ErrorCodes.BAD_REQUEST, detail=str(e))
        return Response({'detail': 'Order cancelled', 'order_no': order.order_no})


class AfterSaleAdminListView(BaseApiView):
    """管理端售后列表。"""
    permission_classes = [HasPerm('order.read')]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='status', type=str, required=False),
            OpenApiParameter(name='type', type=str, required=False),
            OpenApiParameter(name='search', type=str, required=False),
        ],
        responses={200: AfterSaleSerializer(many=True)},
    )
    def get(self, request):
        qs = AfterSale.objects.select_related('order').all().order_by('-created_at')
        qs = OrderAdminAccessPolicy.scope_after_sales(qs, request.user)
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        type_filter = request.query_params.get('type')
        if type_filter:
            qs = qs.filter(type=type_filter)
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(after_sale_no__icontains=search) | Q(order__order_no__icontains=search)
            )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(AfterSaleSerializer(
            page,
            many=True,
            context={
                'redact_sensitive': OrderAdminAccessPolicy.redact_sensitive(request.user),
            },
        ).data)


class AfterSaleAdminReviewView(BaseApiView):
    """管理端售后审核：approve / reject / complete_refund。"""
    permission_classes = [HasPerm('order.aftersale.review')]

    @extend_schema(request=AfterSaleReviewSerializer, responses={200: AfterSaleSerializer})
    def post(self, request, after_sale_no):
        serializer = AfterSaleReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']
        admin_remark = serializer.validated_data.get('admin_remark', '')

        after_sale = OrderAdminAccessPolicy.scope_after_sales(
            AfterSale.objects.select_related('order'), request.user,
        ).filter(after_sale_no=after_sale_no).first()
        if not after_sale:
            return api_error_response(ErrorCodes.AFTER_SALE_NOT_FOUND)

        try:
            if action == 'approve':
                after_sale.approve(admin_remark=admin_remark)
            elif action == 'reject':
                after_sale.reject(admin_remark=admin_remark)
            elif action == 'complete_refund':
                after_sale.complete_refund()
            else:
                return api_error_response(ErrorCodes.BAD_REQUEST, detail=f'Unknown action: {action}')
        except ValueError as e:
            return api_error_response(ErrorCodes.BAD_REQUEST, detail=str(e))

        return Response(AfterSaleSerializer(after_sale, context={
            'redact_sensitive': OrderAdminAccessPolicy.redact_sensitive(request.user),
        }).data)
