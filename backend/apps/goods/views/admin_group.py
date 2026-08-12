from django.db.models import Count, Q
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
        name = request.data.get('name', '').strip()
        slug = request.data.get('slug', '').strip()
        if not name or not slug:
            return Response({'detail': 'Name and slug are required.'}, status=status.HTTP_400_BAD_REQUEST)
        group = AdminGroup.objects.create(name=name, slug=slug, created_by=request.user)
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

        if 'name' in request.data:
            group.name = request.data['name']
        if 'slug' in request.data:
            group.slug = request.data['slug']
        if 'description' in request.data:
            group.description = request.data['description']
        fields = [f for f in request.data if f in ('name', 'slug', 'description')]
        if fields:
            group.save(update_fields=fields)
        create_audit_log(request.user, 'admin_group.update', 'admin_group', group.id,
                         changes={f: str(getattr(group, f)) for f in fields},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'id': group.id, 'name': group.name, 'slug': group.slug})


class AdminGroupDeleteView(BaseApiView):
    """软删除管理组"""
    permission_classes = [HasPerm('goods.group.write')]

    @extend_schema(responses={200: OpenApiResponse(description='Admin group deleted')})
    def delete(self, request, group_id):
        try:
            group = AdminGroup.objects.get(id=group_id, is_active=True)
        except AdminGroup.DoesNotExist:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if group.members.filter(status=1).exists():
            return Response({'detail': Messages.ADMIN_GROUP_NOT_EMPTY}, status=status.HTTP_400_BAD_REQUEST)

        group.is_active = False
        group.save(update_fields=['is_active'])
        create_audit_log(request.user, 'admin_group.delete', 'admin_group', group.id,
                         changes={'name': group.name, 'slug': group.slug},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'message': Messages.SUCCESS})