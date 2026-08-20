"""
审核组权限边界测试（组长组内自治 / 全局操作超管审批）。

对应需求拍板：**组长只在组里权最大；全局性操作一律超管审批。**

验证：
  - 组的创建/改名/删除（goods.group.write）→ 组长 403，超管 201/200
  - 组员管理（AdminGroupMembersView，仅需 goods.spu.read + 内置组长级校验）：
    · 组长可给「本组」添加「普通成员」→ 201（组内自治）
    · 组长不可提其他组长 → 403
    · 组长不可操作「跨组」组 → 403
    · 组长不可移除「本组组长」→ 403
"""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.goods.models import AdminGroup, AdminGroupMember
from apps.goods.tests.factories import AdminGroupFactory, AdminGroupMemberFactory
from apps.rbac.constants import Role
from apps.rbac.models import UserRole
from apps.users.tests.factories import UserFactory

pytestmark = [pytest.mark.integration]

GROUP_API = "/api/v1/admin/groups"


def _group_create_url() -> str:
    return f"{GROUP_API}/create/"


def _group_update_url(group) -> str:
    return f"{GROUP_API}/{group.slug}/update"


def _group_delete_url(group) -> str:
    return f"{GROUP_API}/{group.slug}/delete"


def _members_url(group) -> str:
    return f"{GROUP_API}/{group.slug}/members"


def _member_delete_url(group, user) -> str:
    return f"{GROUP_API}/{group.slug}/members/{user.profile.account_no}"


@pytest.fixture
def group_env(db):
    g = AdminGroupFactory()
    leader = UserFactory()
    UserRole.objects.create(user=leader, role=Role.ADMIN_LEADER.value)
    AdminGroupMemberFactory(
        user=leader, group=g,
        role=AdminGroupMember.Role.LEADER,
        status=AdminGroupMember.Status.ACTIVE,
    )
    member = UserFactory()
    AdminGroupMemberFactory(
        user=member, group=g,
        role=AdminGroupMember.Role.MEMBER,
        status=AdminGroupMember.Status.ACTIVE,
    )
    other_group = AdminGroupFactory()
    superadmin = UserFactory(is_superuser=True)
    return {"g": g, "other_group": other_group, "leader": leader,
            "member": member, "superadmin": superadmin}


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestGroupGlobalOpsSuperadminOnly:
    """组本身的增删改 = 全局操作：组长 403，超管放行。"""

    @pytest.mark.django_db
    def test_leader_cannot_create_group(self, group_env):
        resp = _client(group_env["leader"]).post(
            _group_create_url(), {"name": "new", "slug": "new-g"}, format="json"
        )
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_leader_cannot_update_group(self, group_env):
        resp = _client(group_env["leader"]).put(
            _group_update_url(group_env["g"]), {"name": "hack", "slug": "hack-g"}, format="json"
        )
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_leader_cannot_delete_group(self, group_env):
        resp = _client(group_env["leader"]).delete(_group_delete_url(group_env["g"]))
        assert resp.status_code == 403
        assert AdminGroup.objects.filter(pk=group_env["g"].pk).exists()

    @pytest.mark.django_db
    def test_superadmin_can_create_group(self, group_env):
        resp = _client(group_env["superadmin"]).post(
            _group_create_url(), {"name": "审批组", "slug": "approved-g"}, format="json"
        )
        assert resp.status_code == 201, resp.content
        assert AdminGroup.objects.filter(slug="approved-g").exists()


class TestMemberMgmtLeaderAutonomy:
    """组员管理 = 组内事务：组长自治（本组可加普通成员），仍有边界。"""

    @pytest.mark.django_db
    def test_leader_adds_plain_member_to_own_group(self, group_env):
        target = UserFactory()
        resp = _client(group_env["leader"]).post(
            _members_url(group_env["g"]),
            {"account_no": target.profile.account_no, "role": "member"},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        assert AdminGroupMember.objects.filter(
            group=group_env["g"], user=target, role=AdminGroupMember.Role.MEMBER
        ).exists()

    @pytest.mark.django_db
    def test_leader_cannot_promote_another_leader(self, group_env):
        target = UserFactory()
        resp = _client(group_env["leader"]).post(
            _members_url(group_env["g"]),
            {"account_no": target.profile.account_no, "role": "leader"},
            format="json",
        )
        assert resp.status_code == 403  # 提组长 = 全局授权，须超管

    @pytest.mark.django_db
    def test_leader_cannot_manage_cross_group(self, group_env):
        target = UserFactory()
        resp = _client(group_env["leader"]).post(
            _members_url(group_env["other_group"]),
            {"account_no": target.profile.account_no, "role": "member"},
            format="json",
        )
        assert resp.status_code == 403  # 跨组 = 越权

    @pytest.mark.django_db
    def test_leader_cannot_remove_own_group_leader(self, group_env):
        other_leader = UserFactory()
        AdminGroupMemberFactory(
            user=other_leader, group=group_env["g"],
            role=AdminGroupMember.Role.LEADER,
            status=AdminGroupMember.Status.ACTIVE,
        )
        resp = _client(group_env["leader"]).delete(
            _member_delete_url(group_env["g"], other_leader)
        )
        assert resp.status_code == 403
        assert AdminGroupMember.objects.filter(
            group=group_env["g"], user=other_leader, role=AdminGroupMember.Role.LEADER
        ).exists()
