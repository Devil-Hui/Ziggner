from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import Brand, SPU
from apps.rbac.permissions import HasPerm
from ..services import GoodsCacheService

# Brand 是全局共享的，不绑定到特定 admin_group。
# 所有 Brand CRUD 仅限有 goods.brand.write 权限的角色操作，无需组隔离。


class BrandAdminCreateView(BaseApiView):
    permission_classes = [HasPerm('goods.brand.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Brand created')}
    )
    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        brand = Brand.objects.create(
            name=name,
            logo_url=request.data.get('logo_url', ''),
            description=request.data.get('description', ''),
        )
        GoodsCacheService.invalidate_brand()
        return Response({'id': brand.id, 'name': brand.name}, status=status.HTTP_201_CREATED)


class BrandAdminUpdateView(BaseApiView):
    permission_classes = [HasPerm('goods.brand.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Brand updated')}
    )
    def put(self, request, brand_id):
        try:
            brand = Brand.objects.get(id=brand_id)
        except Brand.DoesNotExist:
            return Response({'detail': 'Brand not found.'}, status=status.HTTP_404_NOT_FOUND)
        for field in ['name', 'logo_url', 'description', 'is_active']:
            if field in request.data:
                setattr(brand, field, request.data[field])
        brand.save()
        GoodsCacheService.invalidate_brand()
        return Response({'id': brand.id, 'name': brand.name})


class BrandAdminDeleteView(BaseApiView):
    permission_classes = [HasPerm('goods.brand.write')]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='Brand deleted')}
    )
    def delete(self, request, brand_id):
        try:
            brand = Brand.objects.get(id=brand_id)
        except Brand.DoesNotExist:
            return Response({'detail': 'Brand not found.'}, status=status.HTTP_404_NOT_FOUND)
        if SPU.objects.filter(brand=brand, deleted_at__isnull=True).exists():
            return Response({'detail': Messages.ADMIN_BRAND_HAS_SPUS}, status=status.HTTP_400_BAD_REQUEST)
        brand.delete()
        GoodsCacheService.invalidate_brand()
        return Response({'message': 'Deleted successfully.'})