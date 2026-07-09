from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import BaseApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from utils.exceptions import ErrorCodes, api_error_response
from .serializers import (
    ApplyAfterSaleSerializer, CancelOrderSerializer,
    CheckoutSerializer, OrderDetailSerializer, OrderListSerializer,
    AfterSaleSerializer,
)
from .services import OrderService


class OrderCheckoutView(BaseApiView):
    """从购物车结算，创建订单并扣减库存。"""

    @extend_schema(request=CheckoutSerializer, responses={201: OrderDetailSerializer})
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            order = OrderService.checkout(
                user=request.user,
                cart_item_ids=data['cart_item_ids'],
                shipping_name=data['shipping_name'],
                shipping_phone=data['shipping_phone'],
                shipping_address=data['shipping_address'],
                payment_method=data.get('payment_method', ''),
                buyer_remark=data.get('buyer_remark', ''),
                coupon_code=data.get('coupon_code', ''),
                idempotency_key=data.get('idempotency_key', '') or None,
            )
        except ValueError as e:
            if str(e) == 'DUPLICATE_ORDER':
                return api_error_response(ErrorCodes.ORDER_DUPLICATE)
            return api_error_response(ErrorCodes.BAD_REQUEST, detail=str(e))
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(BaseApiView):
    """当前用户订单列表，可按状态和支付状态筛选。"""
    _VALID_STATUSES = {'pending_payment', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'}
    _VALID_PAYMENT_STATUSES = {'paid', 'unpaid'}

    @extend_schema(
        parameters=[
            OpenApiParameter(name='status', type=str, required=False, description='订单状态'),
            OpenApiParameter(name='payment_status', type=str, required=False, description='支付状态: paid|unpaid'),
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OrderListSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        status_filter = request.query_params.get('status')
        payment_status = request.query_params.get('payment_status')
        if status_filter and status_filter not in self._VALID_STATUSES:
            return api_error_response(
                ErrorCodes.BAD_REQUEST,
                detail=f'Invalid status. Valid: {", ".join(sorted(self._VALID_STATUSES))}',
            )
        if payment_status and payment_status not in self._VALID_PAYMENT_STATUSES:
            return api_error_response(
                ErrorCodes.BAD_REQUEST,
                detail=f'Invalid payment_status. Valid: {", ".join(sorted(self._VALID_PAYMENT_STATUSES))}',
            )
        page, per_page = parse_pagination(request)
        results, total = OrderService.get_order_list(
            request.user, status=status_filter, page=page, per_page=per_page,
            payment_status=payment_status,
        )
        data = OrderListSerializer(results, many=True).data
        return Response({'count': total, 'results': data})


class OrderDetailView(BaseApiView):
    """订单详情（含订单项和售后记录）。"""

    @extend_schema(responses={200: OrderDetailSerializer})
    def get(self, request, order_no):
        order = OrderService.get_order_detail(request.user, order_no)
        if not order:
            return api_error_response(ErrorCodes.ORDER_NOT_FOUND, Messages.ORDER_NOT_FOUND)
        return Response(OrderDetailSerializer(order).data)


class OrderCancelView(BaseApiView):
    """取消订单。已付款订单自动恢复库存。"""

    @extend_schema(request=CancelOrderSerializer, responses={200: OpenApiResponse(description='Cancelled')})
    def post(self, request, order_no):
        serializer = CancelOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            OrderService.cancel_order(request.user, order_no, reason=serializer.validated_data.get('reason', ''))
        except ValueError as e:
            if str(e) == 'ORDER_NOT_FOUND':
                return api_error_response(ErrorCodes.ORDER_NOT_FOUND, Messages.ORDER_NOT_FOUND)
            return api_error_response(ErrorCodes.BAD_REQUEST, detail=str(e))
        return Response({'detail': Messages.ORDER_CANCELLED})


class OrderConfirmView(BaseApiView):
    """确认收货（已发货 → 已签收）。"""

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Confirmed')})
    def post(self, request, order_no):
        try:
            OrderService.confirm_delivered(request.user, order_no)
        except ValueError as e:
            return api_error_response(ErrorCodes.BAD_REQUEST, detail=str(e))
        return Response({'detail': Messages.ORDER_CONFIRMED})


class AfterSaleApplyView(BaseApiView):
    """申请售后（退款或退货退款）。"""

    @extend_schema(request=ApplyAfterSaleSerializer, responses={201: OpenApiResponse(description='Submitted')})
    def post(self, request, order_no):
        serializer = ApplyAfterSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            OrderService.apply_after_sale(
                user=request.user, order_no=order_no,
                after_sale_type=data['type'], reason=data['reason'],
                amount=data['amount'], evidence=data.get('evidence', []),
            )
        except ValueError as e:
            error_map = {
                'ORDER_NOT_FOUND': (ErrorCodes.ORDER_NOT_FOUND, Messages.ORDER_NOT_FOUND),
                'ORDER_CANNOT_AFTER_SALE': (ErrorCodes.AFTER_SALE_UNAVAILABLE, Messages.AFTER_SALE_UNAVAILABLE),
                'AFTER_SALE_AMOUNT_EXCEEDED': (ErrorCodes.AFTER_SALE_AMOUNT_EXCEEDED, Messages.AFTER_SALE_AMOUNT_EXCEEDED),
            }
            if str(e) in error_map:
                code, detail = error_map[str(e)]
                return api_error_response(code, detail)
            raise
        return Response({'detail': Messages.AFTER_SALE_SUBMITTED}, status=status.HTTP_201_CREATED)


class AfterSaleDetailView(BaseApiView):
    """查看售后申请进度。"""

    @extend_schema(responses={200: AfterSaleSerializer})
    def get(self, request, order_no):
        after_sale = OrderService.get_after_sale(request.user, order_no)
        if not after_sale:
            return api_error_response(ErrorCodes.AFTER_SALE_NOT_FOUND, Messages.AFTER_SALE_NOT_FOUND)
        return Response(AfterSaleSerializer(after_sale).data)
