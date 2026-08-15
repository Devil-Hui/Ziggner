"""
Admin SKU 视图 — 批量创建 + 更新 + 删除
"""

from decimal import Decimal

from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import SPU, SKU, ShelfStatus
from apps.rbac.permissions import HasPerm, IsSuperAdmin
from ..admin_permissions import can_operate_spu


class SKUAdminListView(BaseApiView):
    """管理端 SKU 列表"""
    permission_classes = [HasPerm('goods.sku.write')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        spu_id = request.query_params.get('spu_id')
        if not spu_id:
            return Response({'detail': 'spu_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        skus = SKU.objects.filter(spu_id=spu_id).order_by('id')
        items = []
        for sku in skus:
            items.append({
                'id': sku.id,
                'spu_id': sku.spu_id,
                'spec_values': sku.spec_values,
                'price': str(sku.price),
                'discount_price': str(sku.discount_price) if sku.discount_price is not None else None,
                'stock': sku.stock,
                'image_url': sku.image_url,
                'shelf_status': sku.shelf_status,
                'alert_threshold': sku.alert_threshold,
                'created_at': sku.created_at,
                'updated_at': sku.updated_at,
            })
        return Response({'items': items, 'total': len(items)})


class SKUAdminBatchCreateView(BaseApiView):
    """批量创建 SKU — 支持两种格式:
    格式A (specs): {spu_id, specs: [{name, values}], price, stock, discount_price}
    格式B (skus):  {spu_id, skus: [{spec_values, price, stock, discount_price, shelf_status}]}
    """
    permission_classes = [HasPerm('goods.sku.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='SKUs created')}
    )
    def post(self, request):
        spu_id = request.data.get('spu_id')
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=True)
        except SPU.DoesNotExist:
            return Response({'detail': Messages.SPU_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if not can_operate_spu(request.user, spu):
            return Response({'detail': Messages.ADMIN_SPU_NOT_IN_GROUP}, status=status.HTTP_403_FORBIDDEN)

        created = []

        # 格式B: 前端传入明确的 SKU 数据列表
        skus_data = request.data.get('skus')
        if skus_data:
            for sku_item in skus_data:
                raw_price = sku_item.get('price', '')
                if raw_price in (None, ''):
                    return Response({'detail': f'SKU price is required: {sku_item.get("spec_values", {})}'}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    p = Decimal(str(raw_price))
                except Exception:
                    return Response({'detail': f'Invalid price: {raw_price}'}, status=status.HTTP_400_BAD_REQUEST)
                dp = sku_item.get('discount_price')
                sku = SKU.objects.create(
                    spu=spu,
                    spec_values=sku_item.get('spec_values', {}),
                    price=p,
                    discount_price=dp,
                    stock=int(sku_item.get('stock', 0)),
                    shelf_status=sku_item.get('shelf_status'),
                )
                # 防御：shelf_status 缺省或非法值统一回落到上架，避免产生不可售 SKU
                if sku.shelf_status not in ShelfStatus.values:
                    sku.shelf_status = ShelfStatus.ON
                    sku.save(update_fields=['shelf_status'])
                created.append({'id': sku.id, 'spec_values': sku.spec_values})
        else:
            # 格式A: specs 组合生成
            specs = request.data.get('specs', [])
            price = request.data.get('price', 0)
            stock = request.data.get('stock', 0)
            discount_price = request.data.get('discount_price')

            # 保存 specs 到 SPU
            if specs and not spu.specs:
                spu.specs = specs
                spu.save(update_fields=['specs'])

            sku_combinations = self._generate_combinations(specs)
            for combo in sku_combinations:
                sku = SKU.objects.create(
                    spu=spu,
                    spec_values=combo,
                    price=price,
                    discount_price=discount_price,
                    stock=stock,
                )
                created.append({'id': sku.id, 'spec_values': sku.spec_values})

        return Response({'items': created, 'total': len(created)}, status=status.HTTP_201_CREATED)

    @staticmethod
    def _generate_combinations(specs):
        if not specs:
            return [{}]
        first = specs[0]
        rest = specs[1:]
        result = []
        for val in first.get('values', []):
            for sub in SKUAdminBatchCreateView._generate_combinations(rest):
                combo = {first.get('name', first.get('spec_name', '')): val}
                combo.update(sub)
                result.append(combo)
        return result


class SKUAdminUpdateView(BaseApiView):
    """更新 SKU — 自动记录价格变更历史"""
    permission_classes = [HasPerm('goods.sku.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='SKU updated')}
    )
    def put(self, request, sku_id):
        try:
            sku = SKU.objects.select_related('spu').get(id=sku_id)
        except SKU.DoesNotExist:
            return Response({'detail': Messages.SKU_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if not can_operate_spu(request.user, sku.spu):
            return Response({'detail': Messages.ADMIN_SPU_NOT_IN_GROUP}, status=status.HTTP_403_FORBIDDEN)

        old_price = sku.price
        old_discount_price = sku.discount_price

        for field in ['price', 'discount_price', 'stock', 'image_url', 'shelf_status', 'alert_threshold']:
            if field in request.data:
                setattr(sku, field, request.data[field])
        sku.save()

        # 记录价格变更历史
        from ..models import PriceHistory
        new_price = sku.price
        new_discount_price = sku.discount_price

        if new_price != old_price:
            PriceHistory.objects.create(
                sku=sku,
                old_price=old_price,
                new_price=new_price,
                changed_by=request.user,
                reason=request.data.get('price_reason', '管理后台价格调整'),
            )

        if new_discount_price != old_discount_price:
            PriceHistory.objects.create(
                sku=sku,
                old_price=old_discount_price or Decimal('0'),
                new_price=new_discount_price or Decimal('0'),
                changed_by=request.user,
                reason=request.data.get('discount_reason', '管理后台折扣价调整'),
            )
            from ..services import GoodsQueryService
            GoodsQueryService.invalidate_promo_caches()

        return Response({'id': sku.id, 'price': str(sku.price), 'stock': sku.stock, 'shelf_status': sku.shelf_status})


class SKUAdminDeleteView(BaseApiView):
    """删除 SKU"""
    permission_classes = [IsSuperAdmin]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='SKU deleted')}
    )
    def delete(self, request, sku_id):
        try:
            sku = SKU.objects.get(id=sku_id)
        except SKU.DoesNotExist:
            return Response({'detail': Messages.SKU_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        sku.delete()
        return Response({'message': 'Deleted successfully.'})