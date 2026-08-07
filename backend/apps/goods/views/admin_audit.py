"""
综合审计日志视图 — 分页、筛选、搜索。
同时提供 create_audit_log 工具函数供其他 admin 视图调用。
"""
import logging
from django.db import models as dj_models
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from utils.api_base_view import BaseApiView
from ..models import GoodsAuditLog, ProductOperationLog
from apps.rbac.permissions import HasPerm

_logger = logging.getLogger('biz')


# ── 工具函数：供 admin SPU views 自动写审计日志 ──

def create_audit_log(user, action: str, resource_type: str, resource_id: int,
                     changes: dict = None, extra_data: dict = None, ip_address: str = None):
    """创建一条审计日志。失败不抛异常，仅记录 warning。"""
    try:
        GoodsAuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes or {},
            extra_data=extra_data or {},
            ip_address=ip_address,
        )
    except Exception:
        _logger.warning('Failed to create audit log: %s %s#%s by user=%s',
                        action, resource_type, resource_id, getattr(user, 'id', None))


def create_operation_log(spu, user, action: str, field_name: str = '',
                         old_value: str = '', new_value: str = ''):
    """创建一条商品操作日志。失败不抛异常。"""
    try:
        ProductOperationLog.objects.create(
            spu=spu,
            user=user,
            action=action,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
        )
    except Exception:
        _logger.warning('Failed to create operation log: %s SPU#%s by user=%s',
                        action, getattr(spu, 'id', None), getattr(user, 'id', None))


# ── 视图 ──

class AuditLogListView(BaseApiView):
    """综合审计日志列表 — 支持分页、筛选、搜索。"""
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        qs = GoodsAuditLog.objects.select_related('user').order_by('-created_at')

        # ── 筛选 ──
        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        resource_type = request.query_params.get('resource_type')
        if resource_type:
            qs = qs.filter(resource_type=resource_type)

        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        resource_id = request.query_params.get('resource_id')
        if resource_id:
            qs = qs.filter(resource_id=int(resource_id))

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        # ── 搜索 ──
        q = request.query_params.get('q')
        if q:
            qs = qs.filter(
                dj_models.Q(user__username__icontains=q)
                | dj_models.Q(resource_type__icontains=q)
                | dj_models.Q(action__icontains=q)
            )

        # ── 分页 ──
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        start = (page - 1) * page_size
        total = qs.count()
        items = []

        for log in qs[start:start + page_size]:
            items.append({
                'id': log.id,
                'user_id': log.user_id,
                'user': log.user.username if log.user else None,
                'action': log.action,
                'resource_type': log.resource_type,
                'resource_id': log.resource_id,
                'changes': log.changes,
                'extra_data': log.extra_data,
                'ip_address': log.ip_address,
                'created_at': log.created_at,
            })

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'items': items,
        })


class AuditLogStatsView(BaseApiView):
    """审计日志统计 — 按操作类型聚合计数。"""
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        from django.db.models import Count
        from django.utils import timezone

        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timezone.timedelta(days=days)

        by_action = (
            GoodsAuditLog.objects
            .filter(created_at__gte=since)
            .values('action')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        by_resource = (
            GoodsAuditLog.objects
            .filter(created_at__gte=since)
            .values('resource_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        by_user = (
            GoodsAuditLog.objects
            .filter(created_at__gte=since)
            .values('user__username')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        return Response({
            'days': days,
            'by_action': list(by_action),
            'by_resource': list(by_resource),
            'by_user': list(by_user),
            'total': GoodsAuditLog.objects.filter(created_at__gte=since).count(),
        })


class SPUAuditLogView(BaseApiView):
    """SPU 操作日志 — 分页查看特定 SPU 的操作记录。"""
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request, spu_id):
        qs = (
            ProductOperationLog.objects
            .filter(spu_id=spu_id)
            .select_related('user')
            .order_by('-created_at')
        )

        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 100)
        start = (page - 1) * page_size
        total = qs.count()

        items = []
        for log in qs[start:start + page_size]:
            items.append({
                'id': log.id,
                'user_id': log.user_id,
                'user': log.user.username if log.user else None,
                'action': log.action,
                'field_name': log.field_name,
                'old_value': log.old_value,
                'new_value': log.new_value,
                'created_at': log.created_at,
            })

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'items': items,
        })


class OperationLogListView(BaseApiView):
    """全局操作日志 — 分页查看所有 SPU 操作记录（跨商品）。"""
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List or retrieve')})
    def get(self, request):
        qs = (
            ProductOperationLog.objects
            .select_related('user', 'spu')
            .order_by('-created_at')
        )

        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        spu_id = request.query_params.get('spu_id')
        if spu_id:
            qs = qs.filter(spu_id=int(spu_id))

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        start = (page - 1) * page_size
        total = qs.count()

        items = []
        for log in qs[start:start + page_size]:
            items.append({
                'id': log.id,
                'user_id': log.user_id,
                'user': log.user.username if log.user else None,
                'spu_id': log.spu_id,
                'spu_name': log.spu.name if log.spu else None,
                'action': log.action,
                'field_name': log.field_name,
                'old_value': log.old_value,
                'new_value': log.new_value,
                'created_at': log.created_at,
            })

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'items': items,
        })
