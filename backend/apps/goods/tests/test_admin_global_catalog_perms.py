"""
全局目录资源权限测试（品牌/标签/分类审核/迁移 = 超管审批；组长仅组内自治）。

对应产品决策：**组长只在组里权最大；全局性操作一律超管审批。**

验证：
  - 品牌（全局共享，无组归属）→ 组长创建 403，超管 201
  - 标签（全局共享，无组归属）→ 组长创建 403，超管 201
  - 分类审核 approve/reject（审批动作）→ 组长 403（防自审），超管 200
  - 分类批量迁移（跨组全局数据操作）→ 组长 403，超管 200
  - 组长在自己管辖分类下创建子分类 → 201 且状态 PENDING（组内自治 + 超管审核闭环保留）
"""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.goods.models import AdminGroupMember, Category, CategoryStatus, Tag
from apps.goods.tests.factories import (
    AdminGroupFactory, AdminGroupMemberFactory, BrandFactory, CategoryFactory, TagFactory,
)
from apps.rbac.constants import Role
from apps.rbac.models import UserRole
from apps.users.tests.factories import UserFactory

pytestmark = [pytest.mark.integration]

BASE = "/api/v1/goods"


@pytest.fixture
def catalog_env(db):
    """组 A 管辖 cat_a；leader_a 为组长；另建待审分类与品牌/标签。"""
    g_a = AdminGroupFactory()
    cat_a = CategoryFactory(level=1, admin_group=g_a, status=CategoryStatus.APPROVED)

    leader = UserFactory()
    UserRole.objects.create(user=leader, role=Role.ADMIN_LEADER.value)
    AdminGroupMemberFactory(
        user=leader, group=g_a,
        role=AdminGroupMember.Role.LEADER,
        status=AdminGroupMember.Status.ACTIVE,
    )
    superadmin = UserFactory(is_superuser=True)
    pending = CategoryFactory(level=1, admin_group=None, status=CategoryStatus.PENDING)
    return {"g_a": g_a, "cat_a": cat_a, "pending": pending,
            "leader": leader, "superadmin": superadmin}


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class TestBrandTagGlobal:
    """品牌/标签 = 全局共享资源：组长 403，超管 201。"""

    @pytest.mark.django_db
    def test_leader_cannot_create_brand(self, catalog_env):
        resp = _client(catalog_env["leader"]).post(
            f"{BASE}/brand/create", {"name": "hack-brand"}, format="json"
        )
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_superadmin_can_create_brand(self, catalog_env):
        resp = _client(catalog_env["superadmin"]).post(
            f"{BASE}/brand/create", {"name": "ok-brand"}, format="json"
        )
        assert resp.status_code == 201, resp.content

    @pytest.mark.django_db
    def test_leader_cannot_create_tag(self, catalog_env):
        resp = _client(catalog_env["leader"]).post(
            f"{BASE}/tag/create", {"name": "hack-tag"}, format="json"
        )
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_superadmin_can_create_tag(self, catalog_env):
        resp = _client(catalog_env["superadmin"]).post(
            f"{BASE}/tag/create", {"name": "ok-tag"}, format="json"
        )
        assert resp.status_code == 201, resp.content
        assert Tag.objects.filter(name="ok-tag").exists()


class TestCategoryAuditSuperadminOnly:
    """分类审核（approve/reject）= 审批动作：仅超管，防组长自审。"""

    @pytest.mark.django_db
    def test_leader_cannot_audit_category(self, catalog_env):
        resp = _client(catalog_env["leader"]).post(
            f"{BASE}/category/{catalog_env['pending'].id}/audit",
            {"action": "approve"}, format="json",
        )
        assert resp.status_code == 403
        catalog_env["pending"].refresh_from_db()
        assert catalog_env["pending"].status == CategoryStatus.PENDING  # 未被自审

    @pytest.mark.django_db
    def test_superadmin_can_approve_category(self, catalog_env):
        resp = _client(catalog_env["superadmin"]).post(
            f"{BASE}/category/{catalog_env['pending'].id}/audit",
            {"action": "approve"}, format="json",
        )
        assert resp.status_code == 200, resp.content
        catalog_env["pending"].refresh_from_db()
        assert catalog_env["pending"].status == CategoryStatus.APPROVED


class TestCategoryMigrateSuperadminOnly:
    """分类批量迁移 = 跨组全局数据操作：仅超管。"""

    @pytest.mark.django_db
    def test_leader_cannot_migrate_categories(self, catalog_env):
        resp = _client(catalog_env["leader"]).post(
            f"{BASE}/category/migrate",
            {"from_category_id": catalog_env["cat_a"].id, "to_category_id": catalog_env["pending"].id},
            format="json",
        )
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_superadmin_can_migrate_categories(self, catalog_env):
        resp = _client(catalog_env["superadmin"]).post(
            f"{BASE}/category/migrate",
            {"from_category_id": catalog_env["cat_a"].id, "to_category_id": catalog_env["pending"].id},
            format="json",
        )
        assert resp.status_code == 200, resp.content


class TestLeaderCategoryAutonomy:
    """组长分类管理 = 组内自治：管辖范围内创建 → 201 PENDING（超管审核闭环）。"""

    @pytest.mark.django_db
    def test_leader_creates_subcategory_under_managed_tree(self, catalog_env):
        resp = _client(catalog_env["leader"]).post(
            f"{BASE}/category/create",
            {"name": "组长子类", "parent_id": catalog_env["cat_a"].id, "level": 2},
            format="json",
        )
        assert resp.status_code == 201, resp.content
        created = Category.objects.get(name="组长子类")
        # 非超管创建 → PENDING，等待超管审批
        assert created.status == CategoryStatus.PENDING

    @pytest.mark.django_db
    def test_leader_cannot_create_category_outside_managed_tree(self, catalog_env):
        resp = _client(catalog_env["leader"]).post(
            f"{BASE}/category/create",
            {"name": "越权分类", "parent_id": catalog_env["pending"].id, "level": 1},
            format="json",
        )
        assert resp.status_code == 403  # 父分类不在管辖范围
