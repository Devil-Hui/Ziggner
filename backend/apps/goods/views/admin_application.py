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
from apps.rbac.permissions import HasPerm
from apps.rbac.constants import Role
from apps.rbac.services import has_role
from apps.promotion.serializers import CouponApplicationDraftSerializer, CouponSerializer
from apps.promotion.services import CouponApplicationService
from ..services import GoodsCacheService
from django.contrib.auth.models import User
import logging

_logger = logging.getLogger('biz')


def _notify_users(user_ids, type_, title, content):
    """创建站内通知（8.2 站内消息互通）。"""
    from apps.notification.models import Notification
    if not user_ids:
        return
    for uid in set(user_ids):
        try:
            Notification.objects.create(user_id=uid, type=type_, title=title, content=content)
        except Exception as exc:  # noqa: BLE001 - 通知失败不阻断主流程
            _logger.warning('站内通知创建失败 user=%s type=%s: %s', uid, type_, exc)


def _notify_superadmins(type_, title, content):
    """给所有超管发站内通知（如新申请待审核）。"""
    from django.contrib.auth.models import User
    ids = list(
        User.objects.filter(is_active=True, is_superuser=True).values_list('id', flat=True)
    )
    _notify_users(ids, type_, title, content)


def _collect_category_ids(root):
    """递归收集分类及其全部子分类 id（Category 为自引用树，非 mptt）。"""
    ids = [root.id]
    stack = [root]
    while stack:
        node = stack.pop()
        children = list(node.children.all())
        ids.extend(c.id for c in children)
        stack.extend(children)
    return ids


class StaffListView(BaseApiView):
    """管理员/员工列表（供申请表单下拉选择）"""
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        users = User.objects.filter(is_active=True).values('id', 'username', 'is_superuser')
        return Response({'items': list(users)})


class ApplicationSubmitView(BaseApiView):
    """提交申请单"""
    permission_classes = [HasPerm('goods.spu.write')]

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

            # 影响范围 SPU 数由后端计算（含全部子分类），不信任前端传入值
            cat_ids = _collect_category_ids(cat)
            impact_spu_count = SPU.objects.filter(
                category_id__in=cat_ids, deleted_at__isnull=True
            ).count()

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
                impact_spu_count=impact_spu_count,
                impact_child_category_count=cat.children.count(),
                reason=request.data.get('reason', ''),
                applicant=applicant,
            )
            _notify_superadmins(
                'application_pending',
                f'新的申请待审核：分类改名「{cat.name}」',
                f'{applicant.username} 提交了分类改名申请（{category_path} → {request.data.get("new_name", "")}），影响 {impact_spu_count} 个 SPU。',
            )
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        elif app_type == 'brand_rename':
            try:
                brand = Brand.objects.get(id=request.data.get('brand_id'))
            except (Brand.DoesNotExist, ValueError, TypeError):
                return Response({'detail': 'Brand not found.'}, status=status.HTTP_404_NOT_FOUND)

            # 影响范围 SPU 数由后端计算，不信任前端传入值
            impact_spu_count = SPU.objects.filter(
                brand_id=brand.id, deleted_at__isnull=True
            ).count()

            app = BrandRenameApplication.objects.create(
                brand=brand,
                new_name=request.data.get('new_name'),
                alternative_names=request.data.get('alternative_names', ''),
                # ── 快照字段 ──
                old_name=brand.name,
                brand_logo_url=brand.logo_url,
                brand_description=brand.description,
                brand_is_active=brand.is_active,
                impact_spu_count=impact_spu_count,
                reason=request.data.get('reason', ''),
                applicant=applicant,
            )
            _notify_superadmins(
                'application_pending',
                f'新的申请待审核：品牌改名「{brand.name}」',
                f'{applicant.username} 提交了品牌改名申请（{brand.name} → {request.data.get("new_name", "")}），影响 {impact_spu_count} 个 SPU。',
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
            _notify_superadmins(
                'application_pending',
                f'新的申请待审核：组长变更「{current_leader.group.name if current_leader else "未知组"}」',
                f'{applicant.username} 提交了组长变更申请（{app.group_name_snapshot}），成员 {member_count} 人，分类 {category_count} 个。',
            )
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        elif app_type == 'coupon':
            # 仅创建草稿，提交审核由前端在"我的申请"页发起（POST /promotion/application/{id}/submit/）
            legacy_payload = request.data.copy()
            legacy_payload['admin_group_id'] = legacy_payload.get('admin_group_id') or legacy_payload.get('group_id')
            serializer = CouponApplicationDraftSerializer(data=legacy_payload)
            serializer.is_valid(raise_exception=True)
            payload = dict(serializer.validated_data)
            group_id = payload.pop('admin_group_id')
            try:
                app = CouponApplicationService.create_draft(applicant, group_id, payload)
            except PermissionError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
            except ValueError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'id': app.id, 'type': app_type, 'status': app.status}, status=status.HTTP_201_CREATED)

        return Response({'detail': 'Invalid application type.'}, status=status.HTTP_400_BAD_REQUEST)


class ApplicationListView(BaseApiView):
    """我的申请列表"""
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        items = []
        for app in CategoryRenameApplication.objects.filter(applicant=request.user).select_related('category', 'applicant').order_by('-created_at')[:50]:
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
        for app in BrandRenameApplication.objects.filter(applicant=request.user).select_related('brand', 'applicant').order_by('-created_at')[:50]:
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
        for app in LeaderChangeApplication.objects.filter(applicant=request.user).select_related('group', 'new_leader', 'applicant').order_by('-created_at')[:50]:
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
        for app in CouponApplication.objects.filter(applicant=request.user).select_related('applicant').order_by('-created_at')[:50]:
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
                    'applicable_categories': app.applicable_categories or [],
                    'applicable_products': app.applicable_products or [],
                    'applicable_brands': app.applicable_brands or [],
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
    permission_classes = [HasPerm('goods.application.review')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        items = []
        for app in CategoryRenameApplication.objects.filter(status='pending').select_related('category', 'applicant').order_by('-created_at'):
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
        for app in BrandRenameApplication.objects.filter(status='pending').select_related('brand', 'applicant').order_by('-created_at'):
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
        for app in LeaderChangeApplication.objects.filter(status='pending').select_related('group', 'new_leader', 'applicant').order_by('-created_at'):
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
        if has_role(request.user, Role.SUPERADMIN.value):
            coupon_applications = CouponApplication.objects.filter(
                status='pending',
            ).select_related('applicant').order_by('-created_at')
        else:
            coupon_applications = CouponApplication.objects.none()
        for app in coupon_applications:
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
                    'applicable_categories': app.applicable_categories or [],
                    'applicable_products': app.applicable_products or [],
                    'applicable_brands': app.applicable_brands or [],
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
    permission_classes = [HasPerm('goods.application.review')]

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

        if app_type == 'coupon':
            if not has_role(reviewer, Role.SUPERADMIN.value):
                return Response({'detail': 'SUPERADMIN_REQUIRED'}, status=status.HTTP_403_FORBIDDEN)
            try:
                coupon = CouponApplicationService.review(
                    reviewer, app_id, action=action, comment=comment,
                )
                app = CouponApplication.objects.get(pk=app_id)
            except CouponApplication.DoesNotExist:
                return Response(
                    {'detail': Messages.ADMIN_APPLICATION_NOT_FOUND},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except (PermissionError, ValueError) as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            payload = {'id': app.id, 'status': app.status}
            if coupon:
                payload['coupon'] = CouponSerializer(coupon).data
            return Response(payload)

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

        else:
            return Response({'detail': Messages.ADMIN_APPLICATION_TYPE_INVALID}, status=status.HTTP_400_BAD_REQUEST)

        if app.status != 'pending':
            return Response({'detail': Messages.ADMIN_APPLICATION_ALREADY_REVIEWED}, status=status.HTTP_400_BAD_REQUEST)

        app.status = 'approved' if action == 'approve' else 'rejected'
        app.reviewer = reviewer
        app.review_comment = comment
        app.reviewed_at = timezone.now()
        app.save()

        # 8.2 站内消息互通：审核结果通知申请人
        _notify_users(
            [app.applicant_id],
            'application_result',
            f'申请审核结果：{"已通过" if action == "approve" else "已驳回"}',
            f'您的{app_type}申请（#{app_id}）已被 {reviewer.username} {"通过" if action == "approve" else "驳回"}'
            + (f'：{comment}' if comment else ''),
        )

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
