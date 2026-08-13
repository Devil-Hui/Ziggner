from django.db.models import Count, Q
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import AdminGroup, AdminGroupMember
from apps.rbac.permissions import HasPerm
from apps.rbac.services import has_role
from apps.rbac.constants import Role
from .admin_audit import create_audit_log

import re

# 系统默认收容组：删除其他分组时，活跃成员自动转移至此
DEFAULT_PENDING_SLUG = 'pending'
DEFAULT_PENDING_NAME = '待定组'
_SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{0,99}$')
_NAME_MAX = 100
_SLUG_MAX = 100
_DESC_MAX = 500


def _sanitize(value: str) -> str:
    """剥离控制字符与可用于存储型注入的尖括号，防御渲染层 XSS。"""
    if not value:
        return ''
    cleaned = ''.join(
        ch for ch in str(value)
        if ch == ' ' or (ord(ch) >= 32 and ord(ch) != 127)
    )
    return cleaned.replace('<', '').replace('>', '')


def _validate_name(raw) -> tuple:
    name = _sanitize(raw or '').strip()
    if not name:
        return None, Messages.ADMIN_GROUP_NAME_INVALID
    if len(name) > _NAME_MAX:
        return None, Messages.ADMIN_GROUP_NAME_INVALID
    return name, None


def _validate_slug(raw) -> tuple:
    slug = (raw or '').strip()
    if not slug:
        return None, Messages.ADMIN_GROUP_SLUG_INVALID
    if len(slug) > _SLUG_MAX:
        return None, Messages.ADMIN_GROUP_SLUG_INVALID_LEN
    if not _SLUG_RE.match(slug):
        return None, Messages.ADMIN_GROUP_SLUG_INVALID
    return slug, None


def _resolve_pending_group() -> AdminGroup | None:
    return AdminGroup.objects.filter(slug=DEFAULT_PENDING_SLUG, is_active=True).first()


class AdminGroupListView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List of admin groups')})
    def get(self, request):
        groups = AdminGroup.objects.filter(is_active=True).annotate(
            member_count=Count('members', filter=Q(members__status=1))
        )
        items = []
        for g in groups:
            items.append({
                'id': g.id, 'name': g.name, 'slug': g.slug,
                'member_count': g.member_count,
                'created_at': g.created_at,
            })
        return Response(items)


class AdminGroupCreateView(BaseApiView):
    permission_classes = [HasPerm('goods.group.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Admin group created')}
    )
    def post(self, request):
        name, err = _validate_name(request.data.get('name', ''))
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
        slug, err = _validate_slug(request.data.get('slug', ''))
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
        description = _sanitize(request.data.get('description', ''))[:_DESC_MAX]

        if AdminGroup.objects.filter(name=name).exists() or AdminGroup.objects.filter(slug=slug).exists():
            return Response({'detail': Messages.ADMIN_GROUP_EXISTS}, status=status.HTTP_409_CONFLICT)

        group = AdminGroup.objects.create(name=name, slug=slug, description=description, created_by=request.user)
        create_audit_log(request.user, 'admin_group.create', 'admin_group', group.id,
                         changes={'name': name, 'slug': slug},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'id': group.id, 'name': group.name, 'slug': group.slug}, status=status.HTTP_201_CREATED)


class AdminGroupMembersView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    @extend_schema(responses={200: OpenApiResponse(description='List of group members')})
    def get(self, request, group_id):
        members = AdminGroupMember.objects.filter(group_id=group_id).select_related('user')
        items = []
        for m in members:
            items.append({
                'id': m.id, 'user_id': m.user_id, 'username': m.user.username,
                'role': m.role, 'status': m.status,
            })
        return Response({'members': items})

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Member added')}
    )
    def post(self, request, group_id):
        user = request.user
        is_super = has_role(user, Role.SUPERADMIN.value)
        role = request.data.get('role', 'member')

        if not is_super:
            # 组长：仅可给自己管理的组添加「普通成员」，不可提其他组长
            if role != AdminGroupMember.Role.MEMBER:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)
            leader_groups = set(
                AdminGroupMember.objects.filter(
                    user=user, role=AdminGroupMember.Role.LEADER,
                    status=AdminGroupMember.Status.ACTIVE,
                ).values_list('group_id', flat=True)
            )
            if group_id not in leader_groups:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if AdminGroupMember.objects.filter(group_id=group_id, user=target_user).exists():
            return Response({'detail': Messages.ADMIN_GROUP_MEMBER_EXISTS}, status=status.HTTP_409_CONFLICT)
        member = AdminGroupMember.objects.create(group_id=group_id, user=target_user, role=role)
        create_audit_log(request.user, 'admin_group.member_add', 'admin_group_member', member.id,
                         changes={'group_id': group_id, 'user_id': target_user.id, 'role': role},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'id': member.id, 'user_id': target_user.id, 'role': member.role}, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='Member removed')}
    )
    def delete(self, request, group_id, user_id):
        user = request.user
        is_super = has_role(user, Role.SUPERADMIN.value)
        if not is_super:
            # 组长：仅可移除自己管理的组内的「普通成员」，不可移除组长
            leader_groups = set(
                AdminGroupMember.objects.filter(
                    user=user, role=AdminGroupMember.Role.LEADER,
                    status=AdminGroupMember.Status.ACTIVE,
                ).values_list('group_id', flat=True)
            )
            if group_id not in leader_groups:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)
            target = AdminGroupMember.objects.filter(group_id=group_id, user_id=user_id).first()
            if target and target.role == AdminGroupMember.Role.LEADER:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)
        AdminGroupMember.objects.filter(group_id=group_id, user_id=user_id).delete()
        create_audit_log(request.user, 'admin_group.member_remove', 'admin_group_member', 0,
                         changes={'group_id': group_id, 'user_id': user_id},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'message': 'Member removed.'})


class AdminGroupUpdateView(BaseApiView):
    """更新管理组信息（name, slug, description）"""

    permission_classes = [HasPerm('goods.group.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Admin group updated')}
    )
    def put(self, request, group_id):
        try:
            group = AdminGroup.objects.get(id=group_id, is_active=True)
        except AdminGroup.DoesNotExist:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        # 默认待定组不允许改名/改标识，避免破坏成员收容机制
        if group.slug == DEFAULT_PENDING_SLUG:
            if 'name' in request.data and _sanitize(request.data['name']).strip() != group.name:
                return Response({'detail': Messages.ADMIN_GROUP_DEFAULT_PROTECTED}, status=status.HTTP_400_BAD_REQUEST)
            if 'slug' in request.data and (request.data['slug'] or '').strip() != group.slug:
                return Response({'detail': Messages.ADMIN_GROUP_DEFAULT_PROTECTED}, status=status.HTTP_400_BAD_REQUEST)

        fields = []
        if 'name' in request.data:
            name, err = _validate_name(request.data['name'])
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            if AdminGroup.objects.filter(name=name).exclude(id=group.id).exists():
                return Response({'detail': Messages.ADMIN_GROUP_EXISTS}, status=status.HTTP_409_CONFLICT)
            group.name = name
            fields.append('name')

        if 'slug' in request.data:
            slug, err = _validate_slug(request.data['slug'])
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            if slug == DEFAULT_PENDING_SLUG and group.slug != DEFAULT_PENDING_SLUG:
                return Response({'detail': Messages.ADMIN_GROUP_DEFAULT_PROTECTED}, status=status.HTTP_400_BAD_REQUEST)
            if AdminGroup.objects.filter(slug=slug).exclude(id=group.id).exists():
                return Response({'detail': Messages.ADMIN_GROUP_EXISTS}, status=status.HTTP_409_CONFLICT)
            group.slug = slug
            fields.append('slug')

        if 'description' in request.data:
            group.description = _sanitize(request.data['description'])[:_DESC_MAX]
            fields.append('description')

        if fields:
            group.save(update_fields=fields)
            create_audit_log(request.user, 'admin_group.update', 'admin_group', group.id,
                             changes={f: str(getattr(group, f)) for f in fields},
                             ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'id': group.id, 'name': group.name, 'slug': group.slug})


class AdminGroupDeleteView(BaseApiView):
    """软删除管理组；若存在活跃成员，原子地将其转移到目标组（默认待定组）后再删除。"""

    permission_classes = [HasPerm('goods.group.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Admin group deleted')})
    def delete(self, request, group_id):
        try:
            group = AdminGroup.objects.get(id=group_id, is_active=True)
        except AdminGroup.DoesNotExist:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        # 默认待定组是成员收容所，禁止删除
        if group.slug == DEFAULT_PENDING_SLUG:
            return Response({'detail': Messages.ADMIN_GROUP_DEFAULT_PROTECTED}, status=status.HTTP_400_BAD_REQUEST)

        # 解析转移目标组：显式 target_group_id 优先，否则用默认待定组
        target_group_id = request.data.get('target_group_id')
        target = None
        if target_group_id:
            try:
                target = AdminGroup.objects.get(id=int(target_group_id), is_active=True)
            except (AdminGroup.DoesNotExist, (ValueError, TypeError)):
                return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            if target.id == group.id:
                return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target = _resolve_pending_group()

        active_members = list(group.members.filter(status=AdminGroupMember.Status.ACTIVE).select_related('user'))

        # 无目标组且无活跃成员：允许直接删除（兼容历史行为）
        if not target and not active_members:
            group.is_active = False
            group.save(update_fields=['is_active'])
            create_audit_log(request.user, 'admin_group.delete', 'admin_group', group.id,
                             changes={'name': group.name, 'slug': group.slug},
                             ip_address=request.META.get('REMOTE_ADDR'))
            return Response({'message': Messages.SUCCESS})

        # 无目标组但有成员：保持原有拒绝语义
        if not target:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_EMPTY}, status=status.HTTP_400_BAD_REQUEST)

        # 原子转移 + 删除
        with transaction.atomic():
            transferred = 0
            for m in active_members:
                obj, created = AdminGroupMember.objects.get_or_create(
                    group=target, user=m.user,
                    defaults={'role': m.role, 'status': AdminGroupMember.Status.ACTIVE},
                )
                if not created and obj.status != AdminGroupMember.Status.ACTIVE:
                    obj.status = AdminGroupMember.Status.ACTIVE
                    obj.save(update_fields=['status'])
                transferred += 1
            # 清理源组残留的活跃成员关系
            group.members.filter(status=AdminGroupMember.Status.ACTIVE).delete()
            group.is_active = False
            group.save(update_fields=['is_active'])

        create_audit_log(request.user, 'admin_group.delete', 'admin_group', group.id,
                         changes={
                             'name': group.name, 'slug': group.slug,
                             'transferred': transferred, 'target_group_id': target.id,
                         },
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({
            'message': Messages.SUCCESS,
            'transferred': transferred,
            'target_group_id': target.id,
            'target_group_name': target.name,
        })
