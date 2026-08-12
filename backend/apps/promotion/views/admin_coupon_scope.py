from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import Coupon, CouponScope
from apps.rbac.permissions import HasPerm


# NOTE: 实际路由的 CouponScopeView 位于 admin_views.py（urls.py 从此处导入）。
# 本文件为历史副本，已同步为正确实现（写入 CouponScope 记录而非 Coupon 上不存在的字段），
# 避免未来被误接回旧 bug（coupon.scope_type / coupon.target_ids 字段不存在 → 400）。
class CouponScopeView(BaseApiView):
    """设置优惠券适用商品范围"""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Scope updated')})
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
