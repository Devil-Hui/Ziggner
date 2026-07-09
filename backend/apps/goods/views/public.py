from decimal import Decimal
import os
import uuid

from django.conf import settings
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle

from utils.api_base_view import PublicApiView, AdminApiView
from utils.api_base_pagination import parse_pagination
from utils.response_codes import Messages
from .serializers import ProductSearchSerializer
from ..services import GoodsQueryService


class SearchRateThrottle(AnonRateThrottle):
    rate = '60/minute'


class CategoryTreeView(PublicApiView):
    """获取三级分类树（缓存），公开访问。"""

    @extend_schema(responses={200: OpenApiResponse(description='Category tree (3 levels)')})
    def get(self, request):
        return Response(GoodsQueryService.get_category_tree())


class BrandListView(PublicApiView):
    """获取全部启用品牌列表（缓存），公开访问。"""

    @extend_schema(responses={200: OpenApiResponse(description='Active brand list')})
    def get(self, request):
        return Response(GoodsQueryService.get_brand_list())


class SPUDetailView(PublicApiView):
    """获取SPU详情（含品牌、分类、规格、属性、SKU列表）。支持优惠券参数。"""

    @extend_schema(
        parameters=[OpenApiParameter(name='coupon', type=str, required=False, description='优惠券码')],
        responses={200: OpenApiResponse(description='SPU detail with SKUs')},
    )
    def get(self, request, spu_id):
        if spu_id <= 0:
            return Response({'detail': Messages.INVALID_PRODUCT_ID}, status=status.HTTP_400_BAD_REQUEST)
        data = GoodsQueryService.get_spu_detail(spu_id)
        if data is None:
            return Response({'detail': Messages.SPU_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        coupon_code = request.query_params.get('coupon', '')
        if coupon_code and data and data.get('skus'):
            from apps.promotion.models import Coupon as CouponModel
            from apps.promotion.services import PromotionService
            coupon = CouponModel.objects.filter(code=coupon_code, is_active=True).first()
            if coupon and coupon.is_available:
                data['coupon'] = {
                    'code': coupon.code, 'name': coupon.name or coupon.code,
                    'type': coupon.discount_type, 'value': str(coupon.amount),
                    'min_amount': str(coupon.min_amount),
                }
                total_price = sum(Decimal(s['price']) * s.get('quantity', 1) or Decimal('0') for s in data['skus'])
                discount = PromotionService.calc_discount(coupon, total_price)
                data['original_total'] = str(total_price)
                data['discount'] = str(discount)
                data['discounted_total'] = str(max(Decimal('0'), total_price - discount))
                for sku in data['skus']:
                    original = Decimal(sku['price'])
                    new_price = max(Decimal('0'), original - (discount / len(data['skus']))) if data['skus'] else original
                    sku['discounted_price'] = str(round(new_price, 2))
        return Response(data)


class SKUDetailView(PublicApiView):
    """获取SKU详情（含规格值和价格）。"""

    @extend_schema(responses={200: OpenApiResponse(description='SKU detail')})
    def get(self, request, sku_id):
        if sku_id <= 0:
            return Response({'detail': Messages.INVALID_SKU_ID}, status=status.HTTP_400_BAD_REQUEST)
        data = GoodsQueryService.get_sku_detail(sku_id)
        if data is None:
            return Response({'detail': Messages.SKU_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


class HotProductsView(PublicApiView):
    """热销商品排行（Redis有序集合），公开访问。"""

    @extend_schema(
        parameters=[OpenApiParameter(name='category_id', type=int, required=False, description='分类筛选')],
        responses={200: OpenApiResponse(description='Hot SKU list')},
    )
    def get(self, request):
        category_id = request.query_params.get('category_id')
        if category_id:
            try:
                category_id = int(category_id)
                if category_id <= 0:
                    category_id = None
            except (TypeError, ValueError):
                category_id = None
        return Response(GoodsQueryService.get_hot_products(category_id=category_id))


class ProductSearchView(PublicApiView):
    """全文检索+分面筛选（Elasticsearch），60次/分钟限流。"""
    throttle_classes = [SearchRateThrottle]

    @extend_schema(
        parameters=[
            OpenApiParameter(name='q', type=str, required=False, description='搜索关键词，最长200字符'),
            OpenApiParameter(name='category_id', type=int, required=False, description='分类筛选'),
            OpenApiParameter(name='brand_id', type=int, required=False, description='品牌筛选'),
            OpenApiParameter(name='price_min', type=float, required=False, description='最低价'),
            OpenApiParameter(name='price_max', type=float, required=False, description='最高价'),
            OpenApiParameter(name='in_stock', type=bool, required=False, description='仅看有货'),
            OpenApiParameter(name='sort', type=str, required=False, description='排序：price_asc/price_desc/sales_desc/newest/relevance'),
            OpenApiParameter(name='page', type=int, required=False, default=1),
            OpenApiParameter(name='per_page', type=int, required=False, default=20),
        ],
        responses={200: OpenApiResponse(description='Search results with facets')},
    )
    def get(self, request):
        serializer = ProductSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        query = params.pop('q', '')
        page, per_page = parse_pagination(request)
        sort = params.pop('sort', None)
        filters = {k: v for k, v in params.items() if v is not None}
        from apps.goods.search_service import GoodsSearchService
        return Response(GoodsSearchService.search(query=query, filters=filters, sort=sort, page=page, per_page=per_page))


class SearchSuggestView(PublicApiView):
    """搜索自动补全建议，60次/分钟限流。"""
    throttle_classes = [SearchRateThrottle]

    @extend_schema(
        parameters=[OpenApiParameter(name='q', type=str, required=True, description='搜索前缀，最少2字符')],
        responses={200: OpenApiResponse(description='Suggestions list')},
    )
    def get(self, request):
        q = request.query_params.get('q', '')
        if len(q) > 200:
            return Response({'detail': 'Search query too long'}, status=400)
        q = q[:50]
        if len(q) < settings.SEARCH_SETTINGS['SUGGEST_MIN_CHARS']:
            return Response([])
        from apps.goods.search_service import GoodsSearchService
        return Response(GoodsSearchService.suggest(q))


ALLOWED_STATUSES = {'on_sale'}

class SPUListView(PublicApiView):
    """公开SPU列表（仅已上架商品），分页+筛选。"""

    @extend_schema(responses={200: OpenApiResponse(description='Paginated SPU list (on_sale only)')})
    def get(self, request):
        page, size = parse_pagination(request)
        status_filter = request.query_params.get('status', 'on_sale')
        if status_filter not in ALLOWED_STATUSES:
            status_filter = 'on_sale'
        category_id = request.query_params.get('category_id')
        brand_id = request.query_params.get('brand_id')
        data = GoodsQueryService.get_spu_list(
            page=page, size=size, status=status_filter,
            category_id=category_id, brand_id=brand_id,
        )
        return Response(data)


class TagListView(PublicApiView):
    """公开标签列表（仅生效的，Redis缓存）。"""

    @extend_schema(responses={200: OpenApiResponse(description='Active tag list (cached)')})
    def get(self, request):
        from utils.cache import Cache
        _cache = Cache('goods')
        tags = _cache.get('tag:list')
        if tags is not None:
            return Response(tags)
        from ..models import Tag
        tags = list(Tag.objects.filter(is_active=True).values('id', 'name', 'color'))
        _cache.set('tag:list', tags, 300)
        return Response(tags)


class AdminImageUploadView(AdminApiView):
    """管理员图片上传。"""

    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Image uploaded')}
    )
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': '请上传文件'}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {'detail': f'不支持的文件类型: {ext}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > self.MAX_UPLOAD_SIZE:
            return Response(
                {'detail': f'文件大小超过限制 ({self.MAX_UPLOAD_SIZE // 1024 // 1024}MB)'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        safe_name = f'{uuid.uuid4().hex}{ext}'
        return Response({'url': f'/media/uploads/{safe_name}'})
