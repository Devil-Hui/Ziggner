from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from ..models import SPU, SKU, SPUStatus
from ..admin_permissions import IsStaffOrAbove, get_group_managed_category_ids


class AdminStatsView(BaseApiView):
    """本组运营统计"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        if request.user.is_superuser:
            spu_qs = SPU.objects.filter(deleted_at__isnull=True)
        else:
            category_ids = get_group_managed_category_ids(request.user)
            spu_qs = SPU.objects.filter(category_id__in=category_ids, deleted_at__isnull=True)

        return Response({
            'total_spu': spu_qs.count(),
            'on_sale': spu_qs.filter(status=SPUStatus.ON_SALE).count(),
            'pending_review': spu_qs.filter(status=SPUStatus.SUBMITTED).count(),
            'draft': spu_qs.filter(status=SPUStatus.DRAFT).count(),
            'total_sku': SKU.objects.filter(spu__in=spu_qs).count(),
        })