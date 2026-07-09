from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import Activity, ActivitySKU
from apps.goods.admin_permissions import IsSuperUser


class ActivitySKUView(BaseApiView):
    """设置活动关联 SKU"""
    permission_classes = [IsSuperUser]

    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request, pk):
        try:
            activity = Activity.objects.get(id=pk)
        except Activity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)

        sku_ids = request.data.get('sku_ids', [])
        activity_price = request.data.get('activity_price')

        # 删除旧关联
        ActivitySKU.objects.filter(activity=activity).delete()

        # 创建新关联
        for sku_id in sku_ids:
            ActivitySKU.objects.create(
                activity=activity,
                sku_id=sku_id,
                activity_price=activity_price,
            )

        return Response({
            'message': Messages.SUCCESS,
            'linked_count': len(sku_ids),
        })