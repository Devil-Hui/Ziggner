from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import Activity, ActivitySKU
from apps.rbac.permissions import HasPerm


class ActivitySKUView(BaseApiView):
    """设置活动关联 SKU"""
    permission_classes = [HasPerm('promotion.activity.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Create')})
    def post(self, request, pk):
        try:
            activity = Activity.objects.get(id=pk)
        except Activity.DoesNotExist:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)

        sku_ids = request.data.get('sku_ids', [])
        activity_price = request.data.get('activity_price')
        if activity_price is None or activity_price == '':
            return Response({'detail': 'activity_price is required.'}, status=status.HTTP_400_BAD_REQUEST)

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