from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import Coupon
from apps.rbac.permissions import HasPerm


class CouponScopeView(BaseApiView):
    """设置优惠券适用商品范围"""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Create')})
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