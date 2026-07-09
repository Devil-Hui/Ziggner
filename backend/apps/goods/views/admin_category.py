"""
Admin 分类视图 — 分类 CRUD + 子树查询 + 批量迁移
"""

from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import Category, CategoryStatus, GoodsAuditLog, SPU
from ..admin_permissions import IsSuperUser, IsStaffOrAbove, get_group_managed_category_ids
from ..services import GoodsCacheService


class CategoryAdminCreateView(BaseApiView):
    """创建分类（超管 or 组管理员在管辖范围内创建子分类）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Category created')}
    )
    def post(self, request):
        name = request.data.get('name', '').strip()
        parent_id = request.data.get('parent_id')
        level = request.data.get('level', 1)
        admin_group_id = request.data.get('admin_group_id')

        if not name:
            return Response({'detail': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        parent = None
        if parent_id:
            try:
                parent = Category.objects.get(id=parent_id)
            except Category.DoesNotExist:
                return Response({'detail': 'Parent category not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 权限检查：非超管需要验证父分类在管辖范围内
        if not request.user.is_superuser:
            managed_ids = get_group_managed_category_ids(request.user)
            if parent_id and parent_id not in managed_ids:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)
            if not parent_id and not managed_ids:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)

        category = Category.objects.create(
            name=name, parent=parent, level=level,
            admin_group_id=admin_group_id,
            created_by=request.user,
            # 非超管创建的分类需要审核
            status=CategoryStatus.APPROVED if request.user.is_superuser else CategoryStatus.PENDING,
            submitted_by=request.user,
        )

        GoodsCacheService.invalidate_category_tree()

        if not request.user.is_superuser:
            GoodsAuditLog.objects.create(
                user=request.user,
                action='category_submitted',
                resource_type='category',
                resource_id=category.id,
                changes={'name': name, 'level': level, 'parent_id': parent_id},
            )

        return Response({
            'id': category.id, 'name': category.name,
            'parent_id': category.parent_id, 'level': category.level,
            'status': category.status,
        }, status=status.HTTP_201_CREATED)


class CategoryAdminUpdateView(BaseApiView):
    """更新分类（超管 or 组管理员）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Category updated')}
    )
    def put(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response({'detail': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 权限检查
        if not request.user.is_superuser:
            managed_ids = get_group_managed_category_ids(request.user)
            if category_id not in managed_ids:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)

        if 'name' in request.data:
            category.name = request.data['name']
        if 'is_active' in request.data:
            category.is_active = request.data['is_active']
        if 'admin_group_id' in request.data:
            category.admin_group_id = request.data['admin_group_id']
        category.save()
        GoodsCacheService.invalidate_category_tree()
        return Response({'id': category.id, 'name': category.name, 'is_active': category.is_active})


class CategoryAdminDeleteView(BaseApiView):
    """删除分类（超管 or 组管理员）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='Category deleted')}
    )
    def delete(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response({'detail': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 权限检查
        if not request.user.is_superuser:
            managed_ids = get_group_managed_category_ids(request.user)
            if category_id not in managed_ids:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)

        if category.children.exists():
            return Response({'detail': Messages.ADMIN_CATEGORY_HAS_CHILDREN}, status=status.HTTP_400_BAD_REQUEST)
        if SPU.objects.filter(category=category, deleted_at__isnull=True).exists():
            return Response({'detail': Messages.ADMIN_CATEGORY_HAS_SPUS}, status=status.HTTP_400_BAD_REQUEST)

        category.delete()
        GoodsCacheService.invalidate_category_tree()
        return Response({'message': 'Deleted successfully.'})


class CategoryAdminSubtreeView(BaseApiView):
    """本组分类子树"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        category_ids = get_group_managed_category_ids(request.user)
        if not category_ids and not request.user.is_superuser:
            return Response([])

        if request.user.is_superuser:
            categories = Category.objects.filter(is_active=True).order_by('level', 'id')
        else:
            categories = Category.objects.filter(id__in=category_ids, is_active=True).order_by('level', 'id')

        items = []
        for cat in categories:
            items.append({
                'id': cat.id, 'name': cat.name,
                'parent_id': cat.parent_id, 'level': cat.level,
                'admin_group_id': cat.admin_group_id,
            })
        return Response(items)


class CategoryAdminMigrateView(BaseApiView):
    """二级→三级批量迁移 SPU"""
    permission_classes = [IsSuperUser]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Categories migrated')}
    )
    def post(self, request):
        from_category_id = request.data.get('from_category_id')
        to_category_id = request.data.get('to_category_id')

        if not from_category_id or not to_category_id:
            return Response({'detail': 'from_category_id and to_category_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        count = SPU.objects.filter(
            category_id=from_category_id, deleted_at__isnull=True
        ).update(category_id=to_category_id)

        return Response({'migrated_count': count})


class CategoryAdminAuditView(BaseApiView):
    """审核分类（仅超管）—— approve / reject"""
    permission_classes = [IsSuperUser]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Category audited')}
    )
    def post(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return Response({'detail': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', '').lower()
        remark = request.data.get('remark', '')

        if action not in ('approve', 'reject'):
            return Response({'detail': 'action must be approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'reject' and not remark:
            return Response({'detail': 'Remark is required when rejecting.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'approve':
            category.status = CategoryStatus.APPROVED
            category.is_active = True
        else:
            category.status = CategoryStatus.REJECTED

        category.reviewed_by = request.user
        category.save(update_fields=['status', 'is_active', 'reviewed_by'])

        GoodsCacheService.invalidate_category_tree()

        GoodsAuditLog.objects.create(
            user=request.user,
            action=f'category_{action}d',
            resource_type='category',
            resource_id=category.id,
            changes={'name': category.name, 'remark': remark},
        )

        return Response({
            'id': category.id,
            'name': category.name,
            'status': category.status,
        })


class CategoryPendingListView(BaseApiView):
    """待审核分类列表（仅超管可见）"""
    permission_classes = [IsSuperUser]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        categories = Category.objects.filter(
            status=CategoryStatus.PENDING
        ).select_related('submitted_by', 'parent').order_by('-created_at')

        items = []
        for cat in categories:
            items.append({
                'id': cat.id,
                'name': cat.name,
                'level': cat.level,
                'parent_id': cat.parent_id,
                'parent_name': cat.parent.name if cat.parent else None,
                'submitted_by': cat.submitted_by.username if cat.submitted_by else None,
                'created_at': cat.created_at.strftime('%Y-%m-%d %H:%M'),
                'status': cat.status,
            })

        return Response(items)