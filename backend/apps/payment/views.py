from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter, OpenApiTypes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging

from utils.api_base_view import BaseApiView, PublicApiView
from utils.response_codes import Messages
from utils.exceptions import api_error_response, ErrorCodes
from .serializers import (
    CreatePaymentSerializer, PaymentStatusSerializer, CreateRefundSerializer,
    RefundStatusSerializer,
)
from .models import RefundLog
from .services import PaymentService


class CreatePaymentView(BaseApiView):
    """发起支付，返回支付页 URL 或客户端密钥。"""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=CreatePaymentSerializer, responses={200: OpenApiResponse(description='Payment info')})
    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            result = PaymentService.create_payment(
                user=request.user,
                order_no=data['order_no'],
                method=data['method'],
                success_url=data.get('success_url', ''),
                cancel_url=data.get('cancel_url', ''),
            )
        except ValueError as e:
            error_map = {
                'ORDER_NOT_FOUND': (Messages.ORDER_NOT_FOUND, 404),
                'ORDER_ALREADY_PAID': (Messages.PAYMENT_DUPLICATE, 400),
                'ORDER_CANCELLED': (Messages.ORDER_CANCELLED_CANNOT_PAY, 400),
                'ORDER_STATUS_INVALID': (Messages.ORDER_CANNOT_PAY, 400),
            }
            msg, code = error_map.get(str(e), (None, None))
            estr = str(e)
            if estr.startswith('UNSUPPORTED_METHOD'):
                msg, code = Messages.PAYMENT_UNSUPPORTED_METHOD, 400
            elif 'GATEWAY' in estr or estr.startswith('STRIPE_ERROR') or estr.startswith('PAYPAL'):
                # 网关连接/鉴权失败：返回干净错误，而非裸 500
                msg, code = Messages.PAYMENT_GATEWAY_ERROR, 502
            if msg:
                return Response({'detail': msg}, status=code)
            raise
        except Exception as e:
            # 兜底：任何未预期异常（含网关网络错误）都返回干净错误，不暴露 500 堆栈
            logger.exception('Unexpected payment creation error')
            return api_error_response(
                ErrorCodes.PAYMENT_FAILED, Messages.PAYMENT_GATEWAY_ERROR, status_code=502,
            )
        return Response(result)


class PaymentWebhookView(PublicApiView):
    """支付网关异步回调（公开，由网关调用）。验签依赖原始 body + HTTP headers。"""

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='Webhook processed')})
    def post(self, request, gateway):
        raw_body = request.body.decode('utf-8')
        
        # Extract signature per gateway
        if gateway == 'stripe':
            signature = request.headers.get('Stripe-Signature', '')
        elif gateway == 'paypal':
            signature = request.headers.get('PAYPAL-TRANSMISSION-SIG', '')
        elif gateway == 'alipay':
            # Alipay sends sign in POST body, not header
            import json
            try:
                body_data = json.loads(raw_body)
            except (json.JSONDecodeError, ValueError):
                from urllib.parse import parse_qs
                try:
                    body_data = {k: v[0] for k, v in parse_qs(raw_body).items()}
                except Exception:
                    body_data = {}
            signature = body_data.get('sign', '')
        else:
            signature = (
                request.headers.get('Stripe-Signature', '')
                or request.headers.get('PAYPAL-TRANSMISSION-SIG', '')
                or request.META.get('HTTP_X_SIGNATURE', '')
            )
        
        # Pass all headers for PayPal certificate verification
        try:
            result = PaymentService.handle_webhook(
                gateway, raw_body, signature,
                headers={
                    'HTTP_PAYPAL_TRANSMISSION_ID': request.headers.get('PAYPAL-TRANSMISSION-ID', ''),
                    'HTTP_PAYPAL_TRANSMISSION_TIME': request.headers.get('PAYPAL-TRANSMISSION-TIME', ''),
                    'HTTP_PAYPAL_TRANSMISSION_SIG': signature if gateway == 'paypal' else '',
                    'HTTP_PAYPAL_CERT_URL': request.headers.get('PAYPAL-CERT-URL', ''),
                    'HTTP_PAYPAL_AUTH_ALGO': request.headers.get('PAYPAL-AUTH-ALGO', ''),
                }
            )
        except ValueError as e:
            error_map = {
                'INVALID_SIGNATURE': (Messages.PAYMENT_INVALID_SIGNATURE, 400),
                'INVALID_BODY': (Messages.PAYMENT_INVALID_BODY, 400),
                'INVALID_PAYLOAD': (Messages.PAYMENT_INVALID_PAYLOAD, 400),
                'PAYMENT_NOT_FOUND': (Messages.PAYMENT_NOT_FOUND, 404),
                'AMOUNT_MISMATCH': (Messages.PAYMENT_AMOUNT_MISMATCH, 400),
                'CURRENCY_MISMATCH': (Messages.PAYMENT_CURRENCY_MISMATCH, 400),
            }
            msg, code = error_map.get(str(e), (None, None))
            if msg:
                return Response({'detail': msg}, status=code)
            raise
        return Response(result)


class PaymentStatusView(BaseApiView):
    """查询订单支付状态。"""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: PaymentStatusSerializer})
    def get(self, request, order_no):
        result = PaymentService.get_status(request.user, order_no)
        return Response(result)


class RefundView(BaseApiView):
    """申请退款。"""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=CreateRefundSerializer, responses={200: OpenApiResponse(description='Refund result')})
    def post(self, request):
        serializer = CreateRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            result = PaymentService.create_refund(
                user=request.user,
                order_no=data['order_no'],
                reason=data.get('reason', ''),
                amount=data.get('amount'),
            )
        except ValueError as e:
            error_map = {
                'PAYMENT_NOT_FOUND_OR_NOT_PAID': (Messages.PAYMENT_NOT_FOUND, 404),
                'ORDER_ALREADY_REFUNDED': ('Order has already been refunded or is being refunded.', 400),
                'REFUND_AMOUNT_EXCEEDED': ('Refund amount exceeds the original payment amount.', 400),
            }
            msg, code = error_map.get(str(e), (None, None))
            if str(e).startswith('UNSUPPORTED_REFUND_METHOD'):
                msg, code = Messages.PAYMENT_UNSUPPORTED_METHOD, 400
            if str(e).startswith('ALIPAY_REFUND_NOT_SUPPORTED'):
                msg, code = 'Alipay refund is not yet supported.', 400
            if msg:
                return Response({'detail': msg}, status=code)
            raise
        return Response(result)


class RefundStatusView(BaseApiView):
    """查询订单的退款状态。"""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='order_no', type=str, required=True, description='订单号'),
        ],
        responses={200: RefundStatusSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request, order_no):
        from apps.order.models import Order
        try:
            order = Order.objects.get(order_no=order_no, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': Messages.ORDER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        refunds = RefundLog.objects.filter(payment__order=order).order_by('-created_at')
        return Response(RefundStatusSerializer(refunds, many=True).data)


class RefundListView(BaseApiView):
    """当前用户的退款列表。"""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='Refund list with pagination')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        from utils.api_base_pagination import parse_pagination
        page, per_page = parse_pagination(request)
        refunds = RefundLog.objects.filter(payment__user=request.user).order_by('-created_at')
        from django.core.paginator import Paginator
        paginator = Paginator(refunds, per_page)
        try:
            page_obj = paginator.page(page)
        except Exception:
            page_obj = paginator.page(1)
        return Response({
            'count': paginator.count,
            'results': RefundStatusSerializer(page_obj.object_list, many=True).data,
        })
