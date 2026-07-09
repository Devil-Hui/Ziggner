from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models_application import (
    CategoryRenameApplication, BrandRenameApplication,
    LeaderChangeApplication, CouponApplication,
)
from ..models import AdminGroupMember, Category, Brand, SPU
from ..admin_permissions import IsSuperUser, IsStaffOrAbove
from ..services import GoodsCacheService
from django.contrib.auth.models import User
import logging

_logger = logging.getLogger('biz')


class StaffListView(BaseApiView):
    """管理员/员工列表（供申请表单下拉选择）"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        users = User.objects.filter(is_active=True).values('id', 'username', 'is_superuser')
        return Response({'items': list(users)})


class ApplicationSubmitView(BaseApiView):
    """提交申请单"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Create')}
    )
    def post(self, request):
        app_type = request.data.get('type')
        applicant = request.user

        if app_type == 'category_rename':
            try:
                cat = Category.objects.get(id=request.data.get('category_id'))
            except (Category.DoesNotExist, ValueError, TypeError):
                return Response({'detail': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

            # 构建分类路径
            category_path = cat.name
            parent = cat.parent
            while parent:
                category_path = f'{parent.name} > {category_path}'
                parent = parent.parent

            app = CategoryRenameApplication.objects.create(
                category=cat,
                new_name=request.data.get('new_name'),
                alternative_names=request.data.get('alternative_names', ''),
                # ── 快照字段 ──
                old_name=cat.name,
                category_level=cat.level,
                parent_category_id=cat.parent_id,
                parent_category_name=cat.parent.name if cat.parent else '',
                category_description=getattr(cat, 'description', ''),
                category_path=category_path,
                impact_spu_count=request.data.get('impact_spu_count', 0),
                impact_child_category_count=cat.children.count(),
                reason=request.data.get('reason', ''),
                applicant=applicant,
            )
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        elif app_type == 'brand_rename':
            try:
                brand = Brand.objects.get(id=request.data.get('brand_id'))
            except (Brand.DoesNotExist, ValueError, TypeError):
                return Response({'detail': 'Brand not found.'}, status=status.HTTP_404_NOT_FOUND)

            app = BrandRenameApplication.objects.create(
                brand=brand,
                new_name=request.data.get('new_name'),
                alternative_names=request.data.get('alternative_names', ''),
                # ── 快照字段 ──
                old_name=brand.name,
                brand_logo_url=brand.logo_url,
                brand_description=brand.description,
                brand_is_active=brand.is_active,
                impact_spu_count=request.data.get('impact_spu_count', 0),
                reason=request.data.get('reason', ''),
                applicant=applicant,
            )
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        elif app_type == 'leader_change':
            # 获取当前组长信息
            group_id = request.data.get('group_id')
            current_leader = AdminGroupMember.objects.filter(
                group_id=group_id, role='leader', status=1
            ).select_related('user').first()

            # 统计分组信息
            member_count = AdminGroupMember.objects.filter(
                group_id=group_id, status=1
            ).count()
            category_count = Category.objects.filter(
                admin_group_id=group_id
            ).count()

            app = LeaderChangeApplication.objects.create(
                group_id=group_id,
                new_leader_id=request.data.get('new_leader_id'),
                change_type=request.data.get('change_type', 'replacement'),
                # ── 快照字段 ──
                old_leader_id=current_leader.user_id if current_leader else None,
                old_leader_name=current_leader.user.username if current_leader else '',
                group_name_snapshot=current_leader.group.name if current_leader else '',
                group_description=getattr(current_leader.group, 'description', '') if current_leader else '',
                group_member_count=member_count,
                group_category_count=category_count,
                effective_date=request.data.get('effective_date') or None,
                handover_plan=request.data.get('handover_plan', ''),
                reason=request.data.get('reason', ''),
                applicant=applicant,
            )
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        elif app_type == 'coupon':
            import json
            # 解析适用范围名称（用于审批时展示）
            cat_ids = request.data.get('applicable_categories', [])
            prod_ids = request.data.get('applicable_products', [])
            cat_names = ''
            prod_names = ''
            if cat_ids:
                cats = Category.objects.filter(id__in=cat_ids).values_list('name', flat=True)
                cat_names = ', '.join(cats)
            if prod_ids:
                spus = SPU.objects.filter(id__in=prod_ids).values_list('name', flat=True)
                prod_names = ', '.join(spus)

            app = CouponApplication.objects.create(
                coupon_name=request.data.get('coupon_name', ''),
                discount_type=request.data.get('discount_type'),
                coupon_code=request.data.get('coupon_code', ''),
                amount=request.data.get('amount'),
                min_amount=request.data.get('min_amount', 0),
                max_discount=request.data.get('max_discount') or None,
                stackable=request.data.get('stackable', False),
                total_count=request.data.get('total_count', 1000),
                per_user_limit=request.data.get('per_user_limit', 1),
                start_time=request.data.get('start_time') or None,
                end_time=request.data.get('end_time') or None,
                applicable_categories=json.dumps(cat_ids),
                applicable_products=json.dumps(prod_ids),
                applicable_category_names=cat_names,
                applicable_product_names=prod_names,
                expected_cost=request.data.get('expected_cost') or None,
                expected_usage_count=request.data.get('expected_usage_count', 0),
                target_audience=request.data.get('target_audience', ''),
                campaign_purpose=request.data.get('campaign_purpose', ''),
                reason=request.data.get('reason', ''),
                applicant=applicant,
            )
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        return Response({'detail': 'Invalid application type.'}, status=status.HTTP_400_BAD_REQUEST)


class ApplicationListView(BaseApiView):
    """我的申请列表"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        import json
        items = []
        for app in CategoryRenameApplication.objects.filter(applicant=request.user).order_by('-created_at')[:50]:
            items.append({
                'id': app.id, 'type': 'category_rename', 'status': app.status,
                'applicant_name': app.applicant.username,
                'reviewed_at': app.reviewed_at.isoformat() if app.reviewed_at else None,
                'review_comment': app.review_comment,
                'created_at': app.created_at,
                'detail': {
                    'category_name': app.category.name,
                    'category_id': app.category_id,
                    'new_name': app.new_name,
                    'old_name': app.old_name,
                    'alternative_names': app.alternative_names,
                    'category_level': app.category_level,
                    'parent_category_name': app.parent_category_name,
                    'category_path': app.category_path,
                    'impact_spu_count': app.impact_spu_count,
                    'impact_child_category_count': app.impact_child_category_count,
                    'reason': app.reason,
                },
            })
        for app in BrandRenameApplication.objects.filter(applicant=request.user).order_by('-created_at')[:50]:
            items.append({
                'id': app.id, 'type': 'brand_rename', 'status': app.status,
                'applicant_name': app.applicant.username,
                'reviewed_at': app.reviewed_at.isoformat() if app.reviewed_at else None,
                'review_comment': app.review_comment,
                'created_at': app.created_at,
                'detail': {
                    'brand_name': app.brand.name,
                    'brand_id': app.brand_id,
                    'new_name': app.new_name,
                    'old_name': app.old_name,
                    'alternative_names': app.alternative_names,
                    'brand_logo_url': app.brand_logo_url,
                    'brand_description': app.brand_description,
                    'brand_is_active': app.brand_is_active,
                    'impact_spu_count': app.impact_spu_count,
                    'reason': app.reason,
                },
            })
        for app in LeaderChangeApplication.objects.filter(applicant=request.user).order_by('-created_at')[:50]:
            items.append({
                'id': app.id, 'type': 'leader_change', 'status': app.status,
                'applicant_name': app.applicant.username,
                'reviewed_at': app.reviewed_at.isoformat() if app.reviewed_at else None,
                'review_comment': app.review_comment,
                'created_at': app.created_at,
                'detail': {
                    'group_name': app.group.name,
                    'group_id': app.group_id,
                    'new_leader_name': app.new_leader.username,
                    'new_leader_id': app.new_leader_id,
                    'change_type': app.change_type,
                    'old_leader_name': app.old_leader_name,
                    'group_name_snapshot': app.group_name_snapshot,
                    'group_description': app.group_description,
                    'group_member_count': app.group_member_count,
                    'group_category_count': app.group_category_count,
                    'effective_date': app.effective_date.isoformat() if app.effective_date else None,
                    'handover_plan': app.handover_plan,
                    'reason': app.reason,
                },
            })
        for app in CouponApplication.objects.filter(applicant=request.user).order_by('-created_at')[:50]:
            items.append({
                'id': app.id, 'type': 'coupon', 'status': app.status,
                'applicant_name': app.applicant.username,
                'reviewed_at': app.reviewed_at.isoformat() if app.reviewed_at else None,
                'review_comment': app.review_comment,
                'created_at': app.created_at,
                'detail': {
                    'coupon_name': app.coupon_name,
                    'discount_type': app.discount_type,
                    'coupon_code': app.coupon_code,
                    'amount': float(app.amount),
                    'min_amount': float(app.min_amount),
                    'max_discount': float(app.max_discount) if app.max_discount else None,
                    'stackable': app.stackable,
                    'total_count': app.total_count,
                    'per_user_limit': app.per_user_limit,
                    'start_time': app.start_time.isoformat() if app.start_time else None,
                    'end_time': app.end_time.isoformat() if app.end_time else None,
                    'applicable_categories': json.loads(app.applicable_categories) if app.applicable_categories else [],
                    'applicable_products': json.loads(app.applicable_products) if app.applicable_products else [],
                    'applicable_category_names': app.applicable_category_names,
                    'applicable_product_names': app.applicable_product_names,
                    'expected_cost': float(app.expected_cost) if app.expected_cost else None,
                    'expected_usage_count': app.expected_usage_count,
                    'target_audience': app.target_audience,
                    'campaign_purpose': app.campaign_purpose,
                    'reason': app.reason,
                },
            })
        items.sort(key=lambda x: x['created_at'], reverse=True)
        return Response({'items': items[:50]})


class ApplicationPendingListView(BaseApiView):
    """待审核列表（超管）"""
    permission_classes = [IsSuperUser]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        import json
        items = []
        for app in CategoryRenameApplication.objects.filter(status='pending').order_by('-created_at'):
            items.append({
                'id': app.id, 'type': 'category_rename', 'status': app.status,
                'applicant_name': app.applicant.username,
                'created_at': app.created_at,
                'detail': {
                    'category_name': app.category.name,
                    'category_id': app.category_id,
                    'new_name': app.new_name,
                    'old_name': app.old_name,
                    'alternative_names': app.alternative_names,
                    'category_level': app.category_level,
                    'parent_category_name': app.parent_category_name,
                    'category_path': app.category_path,
                    'impact_spu_count': app.impact_spu_count,
                    'impact_child_category_count': app.impact_child_category_count,
                    'reason': app.reason,
                },
            })
        for app in BrandRenameApplication.objects.filter(status='pending').order_by('-created_at'):
            items.append({
                'id': app.id, 'type': 'brand_rename', 'status': app.status,
                'applicant_name': app.applicant.username,
                'created_at': app.created_at,
                'detail': {
                    'brand_name': app.brand.name,
                    'brand_id': app.brand_id,
                    'new_name': app.new_name,
                    'old_name': app.old_name,
                    'alternative_names': app.alternative_names,
                    'brand_logo_url': app.brand_logo_url,
                    'brand_description': app.brand_description,
                    'brand_is_active': app.brand_is_active,
                    'impact_spu_count': app.impact_spu_count,
                    'reason': app.reason,
                },
            })
        for app in LeaderChangeApplication.objects.filter(status='pending').order_by('-created_at'):
            items.append({
                'id': app.id, 'type': 'leader_change', 'status': app.status,
                'applicant_name': app.applicant.username,
                'created_at': app.created_at,
                'detail': {
                    'group_name': app.group.name,
                    'group_id': app.group_id,
                    'new_leader_name': app.new_leader.username,
                    'new_leader_id': app.new_leader_id,
                    'change_type': app.change_type,
                    'old_leader_name': app.old_leader_name,
                    'group_name_snapshot': app.group_name_snapshot,
                    'group_description': app.group_description,
                    'group_member_count': app.group_member_count,
                    'group_category_count': app.group_category_count,
                    'effective_date': app.effective_date.isoformat() if app.effective_date else None,
                    'handover_plan': app.handover_plan,
                    'reason': app.reason,
                },
            })
        for app in CouponApplication.objects.filter(status='pending').order_by('-created_at'):
            items.append({
                'id': app.id, 'type': 'coupon', 'status': app.status,
                'applicant_name': app.applicant.username,
                'created_at': app.created_at,
                'detail': {
                    'coupon_name': app.coupon_name,
                    'discount_type': app.discount_type,
                    'coupon_code': app.coupon_code,
                    'amount': float(app.amount),
                    'min_amount': float(app.min_amount),
                    'max_discount': float(app.max_discount) if app.max_discount else None,
                    'stackable': app.stackable,
                    'total_count': app.total_count,
                    'per_user_limit': app.per_user_limit,
                    'start_time': app.start_time.isoformat() if app.start_time else None,
                    'end_time': app.end_time.isoformat() if app.end_time else None,
                    'applicable_categories': json.loads(app.applicable_categories) if app.applicable_categories else [],
                    'applicable_products': json.loads(app.applicable_products) if app.applicable_products else [],
                    'applicable_category_names': app.applicable_category_names,
                    'applicable_product_names': app.applicable_product_names,
                    'expected_cost': float(app.expected_cost) if app.expected_cost else None,
                    'expected_usage_count': app.expected_usage_count,
                    'target_audience': app.target_audience,
                    'campaign_purpose': app.campaign_purpose,
                    'reason': app.reason,
                },
            })
        items.sort(key=lambda x: x['created_at'], reverse=True)
        return Response({'items': items})


class ApplicationReviewView(BaseApiView):
    """审核申请单"""
    permission_classes = [IsSuperUser]

    @transaction.atomic
    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Review result')}
    )
    def post(self, request, app_id):
        app_type = request.data.get('type')
        action = request.data.get('action')
        comment = request.data.get('comment', '')
        reviewer = request.user

        if action not in ('approve', 'reject'):
            return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        app = None

        if app_type == 'category_rename':
            try:
                app = CategoryRenameApplication.objects.select_for_update().get(id=app_id)
            except CategoryRenameApplication.DoesNotExist:
                return Response({'detail': Messages.ADMIN_APPLICATION_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        elif app_type == 'brand_rename':
            try:
                app = BrandRenameApplication.objects.select_for_update().get(id=app_id)
            except BrandRenameApplication.DoesNotExist:
                return Response({'detail': Messages.ADMIN_APPLICATION_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        elif app_type == 'leader_change':
            try:
                app = LeaderChangeApplication.objects.select_for_update().get(id=app_id)
            except LeaderChangeApplication.DoesNotExist:
                return Response({'detail': Messages.ADMIN_APPLICATION_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        elif app_type == 'coupon':
            try:
                app = CouponApplication.objects.select_for_update().get(id=app_id)
            except CouponApplication.DoesNotExist:
                return Response({'detail': Messages.ADMIN_APPLICATION_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        else:
            return Response({'detail': Messages.ADMIN_APPLICATION_TYPE_INVALID}, status=status.HTTP_400_BAD_REQUEST)

        if app.status != 'pending':
            return Response({'detail': Messages.ADMIN_APPLICATION_ALREADY_REVIEWED}, status=status.HTTP_400_BAD_REQUEST)

        app.status = 'approved' if action == 'approve' else 'rejected'
        app.reviewer = reviewer
        app.review_comment = comment
        app.reviewed_at = timezone.now()
        app.save()

        # Execute side effects on approval (with transaction.atomic)
        if action == 'approve':
            try:
                if app_type == 'category_rename':
                    app.category.name = app.new_name
                    app.category.save(update_fields=['name'])
                    GoodsCacheService.invalidate_category_tree()
                    _logger.info(
                        'Category rename approved: app_id=%s name "%s" → "%s" by user=%s',
                        app_id, app.old_name, app.new_name, reviewer.username
                    )
                elif app_type == 'brand_rename':
                    app.brand.name = app.new_name
                    app.brand.save(update_fields=['name'])
                    GoodsCacheService.invalidate_brand()
                    _logger.info(
                        'Brand rename approved: app_id=%s name "%s" → "%s" by user=%s',
                        app_id, app.old_name, app.new_name, reviewer.username
                    )
                elif app_type == 'leader_change':
                    AdminGroupMember.objects.filter(group_id=app.group_id, role='leader').update(role='member')
                    AdminGroupMember.objects.update_or_create(
                        group_id=app.group_id, user_id=app.new_leader_id,
                        defaults={'role': 'leader'},
                    )
                    _logger.info(
                        'Leader change approved: app_id=%s group=%s new_leader=%s by user=%s',
                        app_id, app.group_id, app.new_leader_id, reviewer.username
                    )
                elif app_type == 'coupon':
                    from apps.promotion.models import Coupon
                    Coupon.objects.create(
                        name=app.coupon_name or f'Coupon-{app.id}',
                        code=app.coupon_code or f'COUPON-{app.id}',
                        discount_type=app.discount_type,
                        amount=app.amount,
                        min_amount=app.min_amount,
                        start_time=app.start_time or timezone.now(),
                        end_time=app.end_time or (timezone.now() + timezone.timedelta(days=365)),
                        total_count=app.total_count,
                        created_by=reviewer,
                    )
                    _logger.info(
                        'Coupon application approved: app_id=%s coupon_name=%s by user=%s',
                        app_id, app.coupon_name, reviewer.username
                    )
            except Exception as e:
                _logger.error(
                    'Side effect execution failed for app_id=%s type=%s: %s',
                    app_id, app_type, str(e)
                )
                # Rollback: restore pending status
                app.status = 'pending'
                app.reviewer = None
                app.review_comment = ''
                app.reviewed_at = None
                app.save()
                return Response(
                    {'detail': f'执行变更失败: {str(e)}', 'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({'id': app.id, 'status': app.status})