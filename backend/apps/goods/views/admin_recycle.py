from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utils.api_base_view import BaseApiView
from ..models import SPU
from ..admin_permissions import IsStaffOrAbove, IsSuperUser, get_user_admin_groups, is_superuser


class RecycleListView(BaseApiView):
    permission_classes = [IsStaffOrAbove]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        qs = SPU.objects.filter(deleted_at__isnull=False).select_related('brand', 'category')
        # 非超管只能查看自己管理组内的已删除 SPU
        if not is_superuser(request.user):
            groups = get_user_admin_groups(request.user)
            if groups:
                group_ids = [g.id for g in groups]
                qs = qs.filter(category__admin_group_id__in=group_ids)
            else:
                return Response({'items': []})
        spus = qs
        items = []
        for spu in spus:
            items.append({
                'id': spu.id, 'name': spu.name,
                'brand_name': spu.brand.name,
                'category_path': self._get_category_path(spu.category),
                'category_name': spu.category.name,
                'sku_count': spu.skus.count(),
                'deleted_at': spu.deleted_at,
                'deleted_by': spu.deleted_by.username if spu.deleted_by else None,
                'deleted_by_name': spu.deleted_by.username if spu.deleted_by else None,
            })
        return Response({'items': items})

    @staticmethod
    def _get_category_path(category):
        parts = []
        current = category
        while current:
            parts.insert(0, current.name)
            current = current.parent
        return ' / '.join(parts)


class RecycleRestoreView(BaseApiView):
    permission_classes = [IsSuperUser]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='SPU restored')}
    )
    def post(self, request, spu_id):
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=False)
        except SPU.DoesNotExist:
            return Response({'detail': 'SPU not found in recycle bin.'}, status=404)
        spu.restore()
        return Response({'message': 'Restored.'})


class RecyclePermanentDeleteView(BaseApiView):
    permission_classes = [IsSuperUser]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='Permanently deleted')}
    )
    def delete(self, request, spu_id):
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=False)
        except SPU.DoesNotExist:
            return Response({'detail': 'SPU not found in recycle bin.'}, status=404)
        spu.delete()
        return Response({'message': 'Permanently deleted.'})