from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from .models import Address
from .serializers import (
    AddressCreateSerializer, AddressSerializer, AddressUpdateSerializer,
)
from .services import AddressService


class AddressListView(BaseApiView):
    """获取当前用户所有收货地址。首个地址自动设为默认。"""

    @extend_schema(
        responses={200: AddressSerializer(many=True)},
    )
    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        addresses = AddressService.list_addresses(request.user)
        return Response(AddressSerializer(addresses, many=True).data)

    @extend_schema(
        request=AddressCreateSerializer,
        responses={201: AddressSerializer},
    )
    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request):
        serializer = AddressCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        addr = AddressService.create(user=request.user, **serializer.validated_data)
        return Response(AddressSerializer(addr).data, status=status.HTTP_201_CREATED)


class AddressDetailView(BaseApiView):
    """获取、修改或删除指定地址。"""

    @extend_schema(responses={200: AddressSerializer})
    def get(self, request, address_id):
        addr = AddressService.get_address(request.user, address_id)
        if not addr:
            return Response(
                {'detail': Messages.ADDRESS_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AddressSerializer(addr).data)

    @extend_schema(request=AddressUpdateSerializer, responses={200: AddressSerializer})
    def patch(self, request, address_id):
        serializer = AddressUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            addr = AddressService.update(
                request.user, address_id,
                **{k: v for k, v in serializer.validated_data.items() if v is not None},
            )
        except ValueError as e:
            if str(e) == 'ADDRESS_NOT_FOUND':
                return Response(
                    {'detail': Messages.ADDRESS_NOT_FOUND},
                    status=status.HTTP_404_NOT_FOUND,
                )
            raise
        return Response(AddressSerializer(addr).data)

    @extend_schema(responses={200: OpenApiResponse(description='Address deleted')})
    def delete(self, request, address_id):
        try:
            AddressService.delete(request.user, address_id)
        except ValueError as e:
            if str(e) == 'ADDRESS_NOT_FOUND':
                return Response(
                    {'detail': Messages.ADDRESS_NOT_FOUND},
                    status=status.HTTP_404_NOT_FOUND,
                )
            raise
        return Response({'detail': Messages.ADDRESS_DELETED})


class AddressDefaultView(BaseApiView):
    """获取当前用户的默认地址。"""

    @extend_schema(responses={200: AddressSerializer})
    def get(self, request):
        addr = AddressService.get_default(request.user)
        if not addr:
            return Response(None, status=status.HTTP_200_OK)
        return Response(AddressSerializer(addr).data)


class AddressSetDefaultView(BaseApiView):
    """将指定地址设为默认。"""
    serializer_class = AddressSerializer

    @extend_schema(responses={200: AddressSerializer})
    def post(self, request, address_id):
        try:
            addr = AddressService.set_default(request.user, address_id)
        except ValueError as e:
            if str(e) == 'ADDRESS_NOT_FOUND':
                return Response(
                    {'detail': Messages.ADDRESS_NOT_FOUND},
                    status=status.HTTP_404_NOT_FOUND,
                )
            raise
        return Response(AddressSerializer(addr).data)
