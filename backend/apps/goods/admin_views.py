"""
管理员分组管理端点（独立命名空间 /api/admin/groups/）。

与 /api/goods/admin_group/... 的区别（大厂规范）：
- 分组以业务可读的 slug 寻址（替代可枚举的 group_id）。
- 成员以 account_no 指认（替代内部自增 user_id），既不暴露内部 id，也不以 PII 查询。
- 列表/创建响应只返回 slug，不返回数字 id。

复用 apps/goods/views/admin_group.py 的校验辅助函数，保证行为一致。
"""
from django.db import transaction, IntegrityError
from rest_framework import status
from rest_framework.response import Response

from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from apps.rbac.permissions import HasPerm
from apps.rbac.services import has_role
from apps.rbac.constants import Role
from apps.users.account import resolve_user_by_account_no, resolve_group_by_slug
from apps.goods.models import AdminGroup, AdminGroupMember
from apps.goods.views.admin_group import (
    _sanitize,
    _validate_name,
    _validate_slug,
    _resolve_pending_group,
    DEFAULT_PENDING_SLUG,
    DEFAULT_PENDING_NAME,
)
from apps.goods.views.admin_audit import create_audit_log


def _member_payload(m: AdminGroupMember) -> dict:
    profile = getattr(m.user, 'profile', None)
    account_no = getattr(profile, 'account_no', '') if profile else ''
    return {
        'account_no': account_no or '',
        'username': m.user.username,
        'role': m.role,
        'status': m.status,
    }


class AdminGroupListView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    def get(self, request):
        from django.db.models import Count, Q
        groups = AdminGroup.objects.filter(is_active=True).annotate(
            member_count=Count('members', filter=Q(members__status=1))
        )
        return Response([
            {
                'id': g.id,
                'slug': g.slug,
                'name': g.name,
                'member_count': g.member_count,
                'created_at': g.created_at,
            }
            for g in groups
        ])


class AdminGroupCreateView(BaseApiView):
    permission_classes = [HasPerm('goods.group.write')]

    def post(self, request):
        name, err = _validate_name(request.data.get('name', ''))
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
        slug, err = _validate_slug(request.data.get('slug', ''))
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
        description = _sanitize(request.data.get('description', ''))[:500]

        if AdminGroup.objects.filter(name=name).exists() or AdminGroup.objects.filter(slug=slug).exists():
            return Response({'detail': Messages.ADMIN_GROUP_EXISTS}, status=status.HTTP_409_CONFLICT)

        try:
            group = AdminGroup.objects.create(name=name, slug=slug, description=description, created_by=request.user)
        except IntegrityError:
            return Response({'detail': Messages.ADMIN_GROUP_EXISTS}, status=status.HTTP_409_CONFLICT)

        create_audit_log(request.user, 'admin_group.create', 'admin_group', group.id,
                         changes={'name': name, 'slug': slug},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'id': group.id, 'slug': group.slug, 'name': group.name}, status=status.HTTP_201_CREATED)


class AdminGroupMembersView(BaseApiView):
    permission_classes = [HasPerm('goods.spu.read')]

    def get(self, request, slug):
        group = resolve_group_by_slug(slug)
        members = AdminGroupMember.objects.filter(group=group).select_related('user', 'user__profile')
        return Response({
            'slug': group.slug,
            'name': group.name,
            'members': [_member_payload(m) for m in members],
        })

    def post(self, request, slug):
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
            if slug not in {
                g.slug for g in AdminGroup.objects.filter(id__in=leader_groups, is_active=True)
            }:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)

        account_no = request.data.get('account_no')
        target_user = resolve_user_by_account_no(account_no)
        group = resolve_group_by_slug(slug)

        if AdminGroupMember.objects.filter(group=group, user=target_user).exists():
            return Response({'detail': Messages.ADMIN_GROUP_MEMBER_EXISTS}, status=status.HTTP_409_CONFLICT)

        member = AdminGroupMember.objects.create(group=group, user=target_user, role=role)
        create_audit_log(request.user, 'admin_group.member_add', 'admin_group_member', member.id,
                         changes={'slug': slug, 'account_no': account_no, 'role': role},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response(_member_payload(member), status=status.HTTP_201_CREATED)

    def delete(self, request, slug, account_no):
        user = request.user
        is_super = has_role(user, Role.SUPERADMIN.value)
        group = resolve_group_by_slug(slug)
        target_user = resolve_user_by_account_no(account_no)

        if not is_super:
            # 组长：仅可移除自己管理的组内的「普通成员」，不可移除组长
            leader_groups = set(
                AdminGroupMember.objects.filter(
                    user=user, role=AdminGroupMember.Role.LEADER,
                    status=AdminGroupMember.Status.ACTIVE,
                ).values_list('group_id', flat=True)
            )
            if group.id not in leader_groups:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)
            target = AdminGroupMember.objects.filter(group=group, user=target_user).first()
            if target and target.role == AdminGroupMember.Role.LEADER:
                return Response({'detail': Messages.PERMISSION_DENIED}, status=status.HTTP_403_FORBIDDEN)

        AdminGroupMember.objects.filter(group=group, user=target_user).delete()
        create_audit_log(request.user, 'admin_group.member_remove', 'admin_group_member', 0,
                         changes={'slug': slug, 'account_no': account_no},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'message': 'Member removed.'})


class AdminGroupUpdateView(BaseApiView):
    permission_classes = [HasPerm('goods.group.write')]

    def put(self, request, slug):
        try:
            group = AdminGroup.objects.get(slug=slug, is_active=True)
        except AdminGroup.DoesNotExist:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if group.slug == DEFAULT_PENDING_SLUG:
            if 'name' in request.data and _sanitize(request.data['name']).strip() != group.name:
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

        if 'description' in request.data:
            group.description = _sanitize(request.data['description'])[:500]
            fields.append('description')

        if fields:
            group.save(update_fields=fields)
            create_audit_log(request.user, 'admin_group.update', 'admin_group', group.id,
                             changes={f: str(getattr(group, f)) for f in fields},
                             ip_address=request.META.get('REMOTE_ADDR'))
        return Response({'id': group.id, 'slug': group.slug, 'name': group.name})


class AdminGroupDeleteView(BaseApiView):
    permission_classes = [HasPerm('goods.group.write')]

    def delete(self, request, slug):
        try:
            group = AdminGroup.objects.get(slug=slug, is_active=True)
        except AdminGroup.DoesNotExist:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if group.slug == DEFAULT_PENDING_SLUG:
            return Response({'detail': Messages.ADMIN_GROUP_DEFAULT_PROTECTED}, status=status.HTTP_400_BAD_REQUEST)

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

        if not target and not active_members:
            group.is_active = False
            group.save(update_fields=['is_active'])
            create_audit_log(request.user, 'admin_group.delete', 'admin_group', group.id,
                             changes={'name': group.name, 'slug': group.slug},
                             ip_address=request.META.get('REMOTE_ADDR'))
            return Response({'message': Messages.SUCCESS})

        if not target:
            return Response({'detail': Messages.ADMIN_GROUP_NOT_EMPTY}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            transferred = 0
            for m in active_members:
                obj, created = AdminGroupMember.objects.get_or_create(
                    group=target, user=m.user,
                    defaults={'role': AdminGroupMember.Role.MEMBER, 'status': AdminGroupMember.Status.ACTIVE},
                )
                if not created and obj.status != AdminGroupMember.Status.ACTIVE:
                    obj.status = AdminGroupMember.Status.ACTIVE
                    obj.save(update_fields=['status'])
                transferred += 1
            group.members.filter(status=AdminGroupMember.Status.ACTIVE).delete()
            group.is_active = False
            group.save(update_fields=['is_active'])

        create_audit_log(request.user, 'admin_group.delete', 'admin_group', group.id,
                         changes={'name': group.name, 'slug': group.slug,
                                  'transferred': transferred, 'target_group_id': target.id},
                         ip_address=request.META.get('REMOTE_ADDR'))
        return Response({
            'message': Messages.SUCCESS,
            'transferred': transferred,
            'target_group_slug': target.slug,
            'target_group_name': target.name,
        })
