"""Promotion admin CRUD views for Coupon and DiscountActivity."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from apps.rbac.permissions import HasPerm
from .models import Coupon, DiscountActivity, ActivitySKURelation, PromoCode, CouponScope
from .serializers import (
    CouponAdminSerializer, ActivityAdminSerializer,
    CouponSerializer, ActivitySerializer,
    PromoCodeCreateSerializer, PromoCodeDetailSerializer, PromoCodeSerializer,
)
from .services import PromoCodeService


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'size'
    page_query_param = 'page'


# ── Coupon Admin ────────────────────────────────────

class CouponAdminListView(BaseApiView):
    """Admin coupon list + create."""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: CouponSerializer(many=True)})
    def get(self, request):
        qs = Coupon.objects.all().order_by('-created_at')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(code__icontains=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CouponSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=CouponAdminSerializer, responses={201: CouponSerializer})
    def post(self, request):
        serializer = CouponAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coupon = serializer.save(created_by=request.user)
        return Response(CouponSerializer(coupon).data, status=status.HTTP_201_CREATED)


class CouponAdminDetailView(BaseApiView):
    """Admin coupon update + delete."""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(request=CouponAdminSerializer, responses={200: CouponSerializer})
    def put(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CouponAdminSerializer(coupon, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CouponSerializer(coupon).data)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Delete')})
    def delete(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'detail': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)
        # 硬删除：优惠券的 is_active 字段同时承担「启用/停用」开关语义，
        # 若此处做软删除（is_active=False）会与「停用」彻底混淆，且列表接口
        # 返回全量券，导致删除后券仍以「已停用」残留列表、用户误以为「删不掉」。
        # 真正的「停用」由更新接口的 is_active 开关处理，删除即移除记录。
        coupon.delete()
        return Response({'message': 'Coupon deleted.'})


# ── Activity Admin ──────────────────────────────────

class ActivityAdminListView(BaseApiView):
    """Admin activity list + create."""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(responses={200: ActivitySerializer(many=True)})
    def get(self, request):
        qs = DiscountActivity.objects.all().order_by('-created_at')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ActivitySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(request=ActivityAdminSerializer, responses={201: ActivitySerializer})
    def post(self, request):
        serializer = ActivityAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity = serializer.save(created_by=request.user)
        return Response(ActivitySerializer(activity).data, status=status.HTTP_201_CREATED)


class ActivityAdminDetailView(BaseApiView):
    """Admin activity update + delete."""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(request=ActivityAdminSerializer, responses={200: ActivitySerializer})
    def put(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(pk=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ActivityAdminSerializer(activity, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ActivitySerializer(activity).data)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Delete')})
    def delete(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(pk=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        activity.delete()
        return Response({'message': 'Activity deleted.'})


# ── Coupon Scope ──────────────────────────────────

class CouponScopeView(BaseApiView):
    """Set coupon applicable product scope."""
    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='Scope updated')})
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


# ── Activity SKU ──────────────────────────────────

def _parse_activity_price(raw):
    """解析统一活动价；None / 空串 → None（不设活动价）。非法值抛 ValueError。"""
    if raw in (None, ''):
        return None
    try:
        val = float(raw)
    except (TypeError, ValueError):
        raise ValueError('activity_price 必须为数字或留空')
    if val < 0:
        raise ValueError('activity_price 不能为负数')
    return val


def _parse_sku_prices(raw):
    """解析按商品维度的活动价，兼容两种格式：
    [{'sku_id': 1, 'activity_price': 9.9}] 或 {1: 9.9}。
    返回 [{'sku_id': int, 'activity_price': float|None}]。
    """
    result = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict) or 'sku_id' not in item:
                continue
            try:
                sid = int(item['sku_id'])
            except (TypeError, ValueError):
                continue
            try:
                price = _parse_activity_price(item.get('activity_price'))
            except ValueError:
                price = None
            result.append({'sku_id': sid, 'activity_price': price})
    elif isinstance(raw, dict):
        for k, v in raw.items():
            try:
                sid = int(k)
            except (TypeError, ValueError):
                continue
            try:
                price = _parse_activity_price(v)
            except ValueError:
                price = None
            result.append({'sku_id': sid, 'activity_price': price})
    return result


class ActivitySKUView(BaseApiView):
    """活动关联 SKU：GET 返回当前关联列表；POST 按 mode 操作。

    POST mode（默认 replace）：
      - replace：scope 或 sku_ids 全量替换当前关联列表
      - append ：追加 sku_ids（已存在跳过不报错；带 sku_prices 时更新对应价格）
      - remove ：移除 sku_ids
      - clear  ：清空全部关联

    直降定价（仅 flat_off 活动使用，其他类型应留空）：
      - activity_price：统一活动价，作用于本次操作涉及的全部 SKU（空 = 不设）
      - sku_prices    ：按商品维度覆盖，优先级高于统一活动价
    """
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Linked SKU list')})
    def get(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(id=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        rels = (
            ActivitySKURelation.objects.filter(activity=activity)
            .select_related('sku', 'sku__spu')
            .order_by('id')
        )
        items = [{
            'id': rel.id,
            'sku_id': rel.sku_id,
            'sku_code': rel.sku.sku_code,
            'spu_id': rel.sku.spu_id,
            'spu_name': rel.sku.spu.name,
            'price': str(rel.sku.price),
            'activity_price': str(rel.activity_price) if rel.activity_price is not None else None,
            'spu_status': rel.sku.spu.status,
            'sku_shelf_status': rel.sku.shelf_status,
        } for rel in rels]
        return Response({'items': items, 'count': len(items)})

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='SKU linked')})
    def post(self, request, pk):
        try:
            activity = DiscountActivity.objects.get(id=pk)
        except DiscountActivity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)

        mode = request.data.get('mode') or 'replace'
        if mode not in ('replace', 'append', 'remove', 'clear'):
            return Response({'detail': 'mode 仅支持 replace / append / remove / clear'}, status=status.HTTP_400_BAD_REQUEST)

        # 统一活动价 + 按商品维度价格
        try:
            activity_price = _parse_activity_price(request.data.get('activity_price'))
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        sku_prices = _parse_sku_prices(request.data.get('sku_prices'))

        # clear：清空全部
        if mode == 'clear':
            ActivitySKURelation.objects.filter(activity=activity).delete()
            return Response({'message': Messages.SUCCESS, 'linked_count': 0, 'mode': mode})

        # remove：移除指定 SKU
        if mode == 'remove':
            sku_ids = [int(x) for x in (request.data.get('sku_ids') or []) if str(x).isdigit()]
            if not sku_ids:
                return Response({'detail': '请提供要移除的 SKU'}, status=status.HTTP_400_BAD_REQUEST)
            removed = ActivitySKURelation.objects.filter(activity=activity, sku_id__in=sku_ids).delete()[0]
            return Response({'message': Messages.SUCCESS, 'removed_count': removed, 'mode': mode})

        # replace / append：解析目标 SKU 集合
        sku_ids = [int(x) for x in (request.data.get('sku_ids') or []) if str(x).isdigit()]
        scope = request.data.get('scope') or {}
        scope_type = scope.get('type') if isinstance(scope, dict) else None
        if scope_type in ('tag', 'category', 'all'):
            from apps.goods.scope_helpers import resolve_scope_sku_ids as _resolve
            sku_ids = _resolve(scope_type, scope)
        elif scope_type not in (None, ''):
            return Response({'detail': 'scope.type 仅支持 tag / category / all'}, status=status.HTTP_400_BAD_REQUEST)

        if not sku_ids:
            return Response({'detail': '未匹配到任何 SKU'}, status=status.HTTP_400_BAD_REQUEST)

        # 构建最终价格表：统一价兜底，sku_prices 逐条覆盖
        final_prices: dict[int, float | None] = {}
        for sid in sku_ids:
            final_prices[sid] = activity_price
        for p in sku_prices:
            if p['sku_id'] in final_prices:
                final_prices[p['sku_id']] = p['activity_price']

        if mode == 'replace':
            ActivitySKURelation.objects.filter(activity=activity).delete()
            ActivitySKURelation.objects.bulk_create([
                ActivitySKURelation(activity=activity, sku_id=sid, activity_price=final_prices[sid])
                for sid in sku_ids
            ])
            return Response({
                'message': Messages.SUCCESS,
                'linked_count': len(sku_ids),
                'activity_price': activity_price,
                'mode': mode,
            })

        # append：已存在跳过（不报错），sku_prices 中命中已存在项则更新价格
        existing = set(
            ActivitySKURelation.objects.filter(activity=activity, sku_id__in=sku_ids)
            .values_list('sku_id', flat=True)
        )
        for p in sku_prices:
            if p['sku_id'] in existing:
                ActivitySKURelation.objects.filter(activity=activity, sku_id=p['sku_id']).update(
                    activity_price=p['activity_price']
                )
        to_create = [sid for sid in sku_ids if sid not in existing]
        if to_create:
            ActivitySKURelation.objects.bulk_create([
                ActivitySKURelation(activity=activity, sku_id=sid, activity_price=final_prices[sid])
                for sid in to_create
            ])
        return Response({
            'message': Messages.SUCCESS,
            'linked_count': len(to_create),
            'total': len(sku_ids),
            'mode': mode,
        })


class ActivityScopePreviewView(BaseApiView):
    """解析批量关联 scope，返回将关联的 SKU 数量与样例列表（不落库）。"""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(request=OpenApiTypes.OBJECT, responses={200: OpenApiResponse(description='Scope preview')})
    def post(self, request):
        scope = request.data.get('scope') or {}
        scope_type = scope.get('type') if isinstance(scope, dict) else None
        if scope_type not in ('tag', 'category', 'all'):
            return Response({'detail': 'scope.type 仅支持 tag / category / all'}, status=status.HTTP_400_BAD_REQUEST)
        if scope_type == 'tag' and not scope.get('tag_id'):
            return Response({'detail': '请选择标签'}, status=status.HTTP_400_BAD_REQUEST)
        if scope_type == 'category' and not scope.get('category_id'):
            return Response({'detail': '请选择一级目录'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            limit = max(1, min(int(request.data.get('preview_limit', 10)), 50))
        except (TypeError, ValueError):
            limit = 10
        from apps.goods.scope_helpers import resolve_scope_sku_items
        data = resolve_scope_sku_items(scope_type, scope, preview_limit=limit)
        return Response({'count': data['count'], 'items': data['items']})


# ── 专属推广码（引流追踪） ──────────────────────────

class PromoCodeAdminListView(BaseApiView):
    """管理端：某基础券下的推广码列表 / 批量创建。"""

    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: PromoCodeDetailSerializer(many=True)})
    def get(self, request, pk=None):
        # 路由 coupon/<int:pk>/promo-codes 优先用 pk，兼容 query 参数
        coupon_id = request.query_params.get('coupon_id') or pk
        qs = PromoCodeService.dashboard(coupon_id=coupon_id)
        return Response(PromoCodeDetailSerializer(qs, many=True).data)

    @extend_schema(request=PromoCodeCreateSerializer, responses={201: PromoCodeSerializer(many=True)})
    def post(self, request, pk=None):
        serializer = PromoCodeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # 路由 coupon/<int:pk>/promo-codes 优先用 pk，兼容 body 中的 coupon_id
        coupon_id = request.data.get('coupon_id') or pk
        if not coupon_id:
            return Response({'detail': 'coupon_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            created = PromoCodeService.create_codes(
                int(coupon_id),
                request.user,
                codes=data.get('codes') or None,
                name=data.get('name', ''),
                note=data.get('note', ''),
                count=data.get('count', 1),
                prefix=data.get('prefix', ''),
            )
        except ValueError as e:
            msg = str(e)
            if msg.startswith('PROMO_CODE_EXISTS:'):
                return Response(
                    {'detail': f'推广码已存在：{msg.split(":", 1)[1]}'},
                    status=status.HTTP_409_CONFLICT,
                )
            mapping = {
                'COUPON_NOT_FOUND': (Messages.COUPON_NOT_FOUND, status.HTTP_404_NOT_FOUND),
                'EMPTY_PROMO_CODES': ('推广码列表不能为空。', status.HTTP_400_BAD_REQUEST),
                'DUPLICATE_PROMO_CODE_IN_REQUEST': ('推广码列表中存在重复。', status.HTTP_400_BAD_REQUEST),
                'TOO_MANY_PROMO_CODES': ('单次创建推广码数量过多。', status.HTTP_400_BAD_REQUEST),
            }
            if msg in mapping:
                m, c = mapping[msg]
                return Response({'detail': m}, status=c)
            raise
        return Response(PromoCodeSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class PromoCodeDashboardView(BaseApiView):
    """管理端：专属券引流看板（领取/独立用户/付款订单/GMV）。"""

    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(responses={200: PromoCodeDetailSerializer(many=True)})
    def get(self, request, pk=None):
        # 路由 coupon/<int:pk>/promo-dashboard 优先用 pk，兼容 query 参数
        coupon_id = request.query_params.get('coupon_id') or pk
        qs = PromoCodeService.dashboard(coupon_id=coupon_id)
        return Response(PromoCodeDetailSerializer(qs, many=True).data)


class PromoCodeAdminDetailView(BaseApiView):
    """管理端：单个推广码的启用/停用、改名改备注、删除。"""

    permission_classes = [HasPerm('promotion.coupon.write')]

    @extend_schema(request=PromoCodeSerializer, responses={200: PromoCodeDetailSerializer})
    def patch(self, request, pk):
        try:
            pc = PromoCode.objects.get(pk=pk)
        except PromoCode.DoesNotExist:
            return Response({'detail': 'Promo code not found.'}, status=status.HTTP_404_NOT_FOUND)
        # 仅允许修改业务字段；码值(code)/归属(coupon)等只读字段会被序列化器忽略
        serializer = PromoCodeSerializer(pc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PromoCodeDetailSerializer(pc).data)

    @extend_schema(request=None, responses={200: OpenApiResponse(description='Deleted')})
    def delete(self, request, pk):
        try:
            pc = PromoCode.objects.get(pk=pk)
        except PromoCode.DoesNotExist:
            return Response({'detail': 'Promo code not found.'}, status=status.HTTP_404_NOT_FOUND)
        pc.delete()
        return Response({'message': 'Promo code deleted.'})