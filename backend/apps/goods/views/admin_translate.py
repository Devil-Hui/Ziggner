"""
Admin 翻译视图 — 商品多语言翻译（腾讯云 TMT）。
"""
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import SPU
from ..translation_service import translate_text, translate_spu_fields
from apps.rbac.permissions import HasPerm
from ..admin_permissions import can_operate_spu


class SPUTranslateView(BaseApiView):
    """翻译 SPU 多语言字段（name/description → name_en/name_ar/description_en/description_ar）。

    支持两种调用方式：
      1. 传 spu_id：翻译已保存的 SPU，并写回数据库。
      2. 传 name/description 文本：仅返回译文，不落库（用于表单未保存时预览）。
    """
    permission_classes = [HasPerm('goods.spu.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Translated fields')}
    )
    def post(self, request):
        spu_id = request.data.get('spu_id')
        source = request.data.get('source', 'zh')

        # 方式 1：按 spu_id 翻译已保存的 SPU
        if spu_id:
            try:
                spu = SPU.objects.get(id=spu_id, deleted_at__isnull=True)
            except SPU.DoesNotExist:
                return Response({'detail': Messages.SPU_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            if not can_operate_spu(request.user, spu):
                return Response({'detail': Messages.ADMIN_SPU_NOT_IN_GROUP}, status=status.HTTP_403_FORBIDDEN)

            fields = translate_spu_fields(spu, source)
            if fields:
                for k, v in fields.items():
                    setattr(spu, k, v)
                spu.save(update_fields=list(fields.keys()) + ['updated_at'])
            return Response({
                'spu_id': spu.id,
                'name_en': spu.name_en,
                'description_en': spu.description_en,
                'name_ar': spu.name_ar,
                'description_ar': spu.description_ar,
            })

        # 方式 2：传文本直接翻译（不落库）
        name = request.data.get('name', '')
        description = request.data.get('description', '')
        result = {}
        for target, name_field, desc_field in (
            ('en', 'name_en', 'description_en'),
            ('ar', 'name_ar', 'description_ar'),
        ):
            if name:
                result[name_field] = translate_text(name, source, target)
            if description:
                result[desc_field] = translate_text(description, source, target)
        return Response(result)