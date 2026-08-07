from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from .serializers import (
    AddCartItemSerializer, CartItemSerializer,
    SelectCartItemsSerializer, UpdateCartItemSerializer,
)
from .services import CartService


class CartView(BaseApiView):
    """获取当前用户购物车（含商品SKU详情和规格值）。"""

    @extend_schema(responses={200: CartItemSerializer(many=True)})
    def get(self, request):
        cart = CartService.get_cart_with_items(request.user)
        items = cart.items.all()
        serializer = CartItemSerializer(items, many=True)
        return Response(serializer.data)


class CartItemAddView(BaseApiView):
    """添加商品到购物车。同SKU已存在则累加数量。"""

    @extend_schema(request=AddCartItemSerializer, responses={200: OpenApiResponse(description='Item added')})
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            CartService.add_item(request.user, data['sku_id'], data['quantity'])
        except ValueError as e:
            error_map = {
                'SKU_NOT_FOUND': (Messages.SKU_NOT_FOUND, status.HTTP_404_NOT_FOUND),
                'SPU_NOT_ACTIVE': (Messages.SPU_NOT_FOUND, status.HTTP_400_BAD_REQUEST),
                'INSUFFICIENT_STOCK': (Messages.INSUFFICIENT_STOCK, status.HTTP_400_BAD_REQUEST),
            }
            if str(e) in error_map:
                msg, code = error_map[str(e)]
                return Response({'detail': msg}, status=code)
            raise
        return Response({'detail': Messages.CART_ITEM_ADDED}, status=status.HTTP_200_OK)


class CartItemUpdateView(BaseApiView):
    """修改购物车项数量。设为0则删除。"""

    @extend_schema(request=UpdateCartItemSerializer, responses={200: OpenApiResponse(description='Updated')})
    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data['quantity']
        try:
            CartService.update_quantity(request.user, item_id, quantity)
        except ValueError as e:
            error_map = {
                'ITEM_NOT_FOUND': (Messages.CART_ITEM_NOT_FOUND, status.HTTP_404_NOT_FOUND),
                'INSUFFICIENT_STOCK': (Messages.INSUFFICIENT_STOCK, status.HTTP_400_BAD_REQUEST),
            }
            if str(e) in error_map:
                msg, code = error_map[str(e)]
                return Response({'detail': msg}, status=code)
            raise
        return Response({'detail': Messages.CART_ITEM_UPDATED})


class CartItemRemoveView(BaseApiView):
    """删除购物车中的指定项。"""

    @extend_schema(responses={200: OpenApiResponse(description='Removed')})
    def delete(self, request, item_id):
        try:
            CartService.remove_item(request.user, item_id)
        except ValueError as e:
            if str(e) == 'ITEM_NOT_FOUND':
                return Response(
                    {'detail': Messages.CART_ITEM_NOT_FOUND},
                    status=status.HTTP_404_NOT_FOUND,
                )
            raise
        return Response({'detail': Messages.CART_ITEM_REMOVED})


class CartItemSelectView(BaseApiView):
    """批量勾选/取消勾选购物车项，用于结算。"""

    @extend_schema(request=SelectCartItemsSerializer, responses={200: OpenApiResponse(description='Selected')})
    def post(self, request):
        serializer = SelectCartItemsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        CartService.set_selected(request.user, serializer.validated_data['item_ids'])
        return Response({'detail': Messages.CART_SELECTED_UPDATED})


class CartClearView(BaseApiView):
    """清空当前用户购物车所有商品。"""

    @extend_schema(responses={200: OpenApiResponse(description='Cart cleared')})
    def delete(self, request):
        CartService.clear_all(request.user)
        return Response({'detail': 'Cart cleared'})
