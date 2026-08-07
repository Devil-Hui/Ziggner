from decimal import Decimal
from django.db import models
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import BaseApiView, PublicApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from .models import Carrier, ShippingRate, Shipment
from .serializers import (
    CarrierSerializer, ShippingCostRequest, ShippingCostResponse,
    TrackShipmentRequest, ShipmentStatusSerializer,
)


class CarrierListView(PublicApiView):
    """获取激活的承运商列表（公开）"""

    @extend_schema(responses={200: CarrierSerializer(many=True)})
    def get(self, request):
        carriers = Carrier.objects.filter(is_active=True).order_by('name')
        return Response(CarrierSerializer(carriers, many=True).data)


class ShippingCostView(BaseApiView):
    """计算运费（下单前调用）"""

    @extend_schema(
        request=ShippingCostRequest,
        responses={200: ShippingCostResponse},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request):
        serializer = ShippingCostRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        from .services import LogisticsService
        result = LogisticsService.calculate_shipping_cost(request.user, serializer.validated_data)
        return Response(result)


class TrackShipmentView(PublicApiView):
    """物流追踪（公开查询）"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='tracking_no', type=str, required=True, description='运单号'),
        ],
        responses={200: ShipmentStatusSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        serializer = TrackShipmentRequest(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        tracking_no = serializer.validated_data['tracking_no']
        try:
            shipment = Shipment.objects.select_related('carrier', 'order').get(
                tracking_no=tracking_no,
            )
        except Shipment.DoesNotExist:
            return Response({'detail': Messages.SHIPMENT_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(ShipmentStatusSerializer(shipment).data)


class MyShipmentsView(BaseApiView):
    """当前用户的物流记录"""

    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='Shipment list with pagination')},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        from apps.order.models import Order
        page, per_page = parse_pagination(request)
        shipments = Shipment.objects.select_related('carrier', 'order').filter(
            order__user=request.user,
        ).order_by('-created_at')
        from django.core.paginator import Paginator
        paginator = Paginator(shipments, per_page)
        try:
            page_obj = paginator.page(page)
        except Exception:
            page_obj = paginator.page(1)
        return Response({
            'count': paginator.count,
            'results': ShipmentStatusSerializer(page_obj.object_list, many=True).data,
        })
