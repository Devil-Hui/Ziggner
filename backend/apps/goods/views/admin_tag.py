from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utils.api_base_view import BaseApiView
from ..models import Tag, SPUTagRelation, SPU
from apps.rbac.permissions import HasPerm
from ..admin_permissions import can_operate_spu
from ..serializers import (
    TagCreateRequestSerializer, TagUpdateRequestSerializer, TagResponseSerializer,
    validate_tag_color,
)
from ..services import GoodsCacheService

# Tag 是全局共享的，不绑定到特定 admin_group。
# 所有 Tag CRUD 仅限有 goods.tag.write 权限的角色操作，无需组隔离。


class TagAdminCreateView(BaseApiView):
    """创建标签（仅超管可用）"""

    permission_classes = [HasPerm('goods.tag.write')]

    @extend_schema(
        request=TagCreateRequestSerializer,
        responses={201: TagResponseSerializer}
    )
    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        color = request.data.get('color', '#e74c3c')
        # 校验 HEX 格式
        validate_tag_color(color)
        tag_type = request.data.get('tag_type', 'product')
        if tag_type not in ('product', 'activity'):
            return Response({'detail': 'Invalid tag_type.'}, status=status.HTTP_400_BAD_REQUEST)
        is_active = request.data.get('is_active', True)
        tag = Tag.objects.create(name=name, tag_type=tag_type, color=color, is_active=is_active)
        # 失效标签列表缓存
        GoodsCacheService.invalidate_tag_list()
        return Response({
            'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type,
            'color': tag.color, 'is_active': tag.is_active,
        }, status=status.HTTP_201_CREATED)


class TagAdminUpdateView(BaseApiView):
    """更新标签名称/颜色/状态（仅超管可用）"""

    permission_classes = [HasPerm('goods.tag.write')]

    @extend_schema(
        request=TagUpdateRequestSerializer,
        responses={200: TagResponseSerializer}
    )
    def put(self, request, tag_id):
        try:
            tag = Tag.objects.get(id=tag_id)
        except Tag.DoesNotExist:
            return Response({'detail': 'Tag not found.'}, status=status.HTTP_404_NOT_FOUND)

        update_fields = []
        if 'name' in request.data and request.data['name']:
            new_name = request.data['name'].strip()
            if new_name and new_name != tag.name:
                # Check uniqueness manually
                if Tag.objects.filter(name=new_name).exclude(id=tag_id).exists():
                    return Response({'detail': f'标签名称 "{new_name}" 已存在。'}, status=status.HTTP_409_CONFLICT)
                tag.name = new_name
                update_fields.append('name')
        if 'color' in request.data:
            # 校验 HEX 格式
            validate_tag_color(request.data['color'])
            tag.color = request.data['color']
            update_fields.append('color')
        if 'tag_type' in request.data:
            if request.data['tag_type'] not in ('product', 'activity'):
                return Response({'detail': 'Invalid tag_type.'}, status=status.HTTP_400_BAD_REQUEST)
            tag.tag_type = request.data['tag_type']
            update_fields.append('tag_type')
        if 'is_active' in request.data:
            tag.is_active = request.data['is_active']
            update_fields.append('is_active')

        if update_fields:
            tag.save(update_fields=update_fields)
            GoodsCacheService.invalidate_tag_list()

        return Response({
            'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type,
            'color': tag.color, 'is_active': tag.is_active,
        })


class TagAdminDeleteView(BaseApiView):
    """删除标签（仅超管可用）"""

    permission_classes = [HasPerm('goods.tag.write')]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='Tag deleted')}
    )
    def delete(self, request, tag_id):
        try:
            tag = Tag.objects.get(id=tag_id)
        except Tag.DoesNotExist:
            return Response({'detail': 'Tag not found.'}, status=status.HTTP_404_NOT_FOUND)
        tag.delete()
        GoodsCacheService.invalidate_tag_list()
        return Response({'message': 'Deleted successfully.'})


class SPUTagSetView(BaseApiView):
    """批量设置 SPU 标签（替换式）"""

    permission_classes = [HasPerm('goods.spu.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Tags set')}
    )
    def post(self, request):
        spu_id = request.data.get('spu_id')
        tag_ids = request.data.get('tag_ids', [])
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=True)
        except SPU.DoesNotExist:
            return Response({'detail': 'SPU not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not can_operate_spu(request.user, spu):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Replace all tags: remove existing relations, then add new ones
        SPUTagRelation.objects.filter(spu_id=spu_id).delete()
        if tag_ids:
            SPUTagRelation.objects.bulk_create([
                SPUTagRelation(spu_id=spu_id, tag_id=tid) for tid in tag_ids
            ])
        return Response({'message': 'Tags set.'})


class SPUTagRemoveView(BaseApiView):
    """批量移除 SPU 标签"""

    permission_classes = [HasPerm('goods.spu.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Tags removed')}
    )
    def delete(self, request):
        spu_id = request.data.get('spu_id')
        tag_ids = request.data.get('tag_ids', [])
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=True)
        except SPU.DoesNotExist:
            return Response({'detail': 'SPU not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not can_operate_spu(request.user, spu):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        SPUTagRelation.objects.filter(spu_id=spu_id, tag_id__in=tag_ids).delete()
        return Response({'message': 'Tags removed.'})