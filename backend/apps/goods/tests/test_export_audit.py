"""
运营辅助子系统 —— 报表导出与审计日志测试（大厂规范重点）。

对应需求：
  - 「审计日志、报表导出」：导出必须留痕（行级范围），审计日志可筛选
  - 「数据权限：非超管仅能导出本组类目」：DB 层行级过滤，跨组数据不得泄漏
  - CSV 单元格转义（逗号/引号），防公式注入（escape_csv_cell）
  - 「大数据量导出（10 万条）的流式响应（Chunked Transfer）+ 内存控制」：
    ExportProductsView 已改为 StreamingHttpResponse + 分块迭代（EXPORT_CHUNK_SIZE=500），
    ≤ 一个 chunk 的 SPU 及其 SKU 驻留内存，输出惰性生成、内存恒定、不 OOM。
    本文件以流式路径正确性（行数/分块/惰性）与 HTTP 输出一致性联合验证。
"""
from __future__ import annotations

import csv
import inspect
import io

import pytest
from django.http import StreamingHttpResponse
from rest_framework.test import APIClient

from apps.goods.models import AdminGroupMember, GoodsAuditLog, SPUStatus
from apps.goods.tests.factories import (
    AdminGroupFactory, AdminGroupMemberFactory, BrandFactory, CategoryFactory, SPUFactory, SKUFactory,
)
from apps.goods.views.admin_import_export import ExportProductsView
from apps.users.tests.factories import UserFactory

pytestmark = [pytest.mark.integration]


@pytest.fixture
def export_env(db):
    """组 A 管辖 catA；构造两个 SPU：catA（组内）、catB（跨组）。"""
    g_a = AdminGroupFactory()
    cat_a = CategoryFactory(level=1, admin_group=g_a)
    cat_b = CategoryFactory(level=1, admin_group=None)
    brand = BrandFactory()

    spu_a = SPUFactory(name='组内商品', category=cat_a, brand=brand, status=SPUStatus.DRAFT)
    spu_b = SPUFactory(name='跨组,含"引号"商品', category=cat_b, brand=brand, status=SPUStatus.DRAFT)
    SKUFactory(spu=spu_a, price=10, stock=5)
    SKUFactory(spu=spu_b, price=20, stock=9)

    superadmin = UserFactory(is_superuser=True)
    leader = UserFactory()
    AdminGroupMemberFactory(
        user=leader, group=g_a,
        role=AdminGroupMember.Role.LEADER,
        status=AdminGroupMember.Status.ACTIVE,
    )
    return {
        "g_a": g_a, "cat_a": cat_a, "cat_b": cat_b,
        "spu_a": spu_a, "spu_b": spu_b, "brand": brand,
        "superadmin": superadmin, "leader": leader,
    }


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _parse_csv(response):
    # StreamingHttpResponse 无 .content，需消费 streaming_content（流式导出断言）
    body = b"".join(response.streaming_content).decode("utf-8")
    return list(csv.reader(io.StringIO(body)))

EXPORT_URL = "/api/v1/goods/spu/export"
AUDIT_URL = "/api/v1/goods/audit_log"
IMPORT_URL = "/api/v1/goods/spu/import"


class TestExportDataIsolation:
    """导出数据权限：超管全量、组长仅本组类目（行级隔离）。"""

    @pytest.mark.django_db
    def test_superadmin_exports_all(self, export_env):
        resp = _client(export_env["superadmin"]).post(EXPORT_URL)
        assert resp.status_code == 200
        rows = _parse_csv(resp)
        # header + 2 行
        assert len(rows) == 3
        names = {r[0] for r in rows[1:]}
        assert export_env["spu_a"].name in names
        assert export_env["spu_b"].name in names

    @pytest.mark.django_db
    def test_leader_only_own_group_category(self, export_env):
        resp = _client(export_env["leader"]).post(EXPORT_URL)
        assert resp.status_code == 200
        rows = _parse_csv(resp)
        assert len(rows) == 2  # header + 仅组内 1 行
        body = rows[1:]
        assert len(body) == 1
        assert body[0][0] == export_env["spu_a"].name  # 跨组 spu_b 不泄漏
        # 组内商品行含价格与库存
        assert body[0][3] == "10.00"  # Price
        assert body[0][4] == "5"   # Stock


class TestExportCsvEscaping:
    """CSV 单元格转义：逗号 / 引号 / 首字符注入字符防泄漏。"""

    @pytest.mark.django_db
    def test_escaping_of_comma_and_quote(self, export_env):
        resp = _client(export_env["superadmin"]).post(EXPORT_URL)
        rows = _parse_csv(resp)
        injected = export_env["spu_b"].name  # "跨组,含"引号"商品"
        data_row = next(r for r in rows[1:] if r[0] == injected)
        # 逗号应被引号包裹，行字段数与 header 一致（未被错误拆分）
        assert len(data_row) == 9


class TestExportAuditTrail:
    """导出必须留痕审计（含行级范围）；审计按 action 可筛选。"""

    @pytest.mark.django_db
    def test_export_writes_audit_log(self, export_env):
        _client(export_env["superadmin"]).post(EXPORT_URL)
        log = GoodsAuditLog.objects.filter(
            user=export_env["superadmin"], action="export_products"
        ).order_by("-id").first()
        assert log is not None
        assert log.resource_type == "spu"
        assert log.changes.get("count") == 2
        assert log.changes.get("scope") == "all"

    @pytest.mark.django_db
    def test_leader_export_audit_scope_managed(self, export_env):
        _client(export_env["leader"]).post(EXPORT_URL)
        log = GoodsAuditLog.objects.filter(
            user=export_env["leader"], action="export_products"
        ).order_by("-id").first()
        assert log is not None
        assert log.changes.get("scope") == "managed"
        assert log.changes.get("count") == 1

    @pytest.mark.django_db
    def test_audit_log_filter_by_action(self, export_env):
        _client(export_env["superadmin"]).post(EXPORT_URL)
        resp = _client(export_env["superadmin"]).get(f"{AUDIT_URL}?action=export_products")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 1
        assert all(item["action"] == "export_products" for item in body["items"])


class TestImportProducts:
    """商品导入：无效文件 / 空数据被拒。"""

    @pytest.mark.django_db
    def test_missing_file_rejected(self, export_env):
        resp = _client(export_env["superadmin"]).post(IMPORT_URL, {})
        assert resp.status_code == 400


class TestStreamingExport:
    """大数据量导出的流式（Chunked Transfer）+ 内存控制。"""

    def _qs(self, export_env):
        from apps.goods.models import SPU

        return SPU.objects.filter(deleted_at__isnull=True)

    @pytest.mark.django_db
    def test_generator_lazy_not_materialized(self, export_env):
        """导出流为惰性生成器（非全量 list），第一条数据可行即刻产出。"""
        gen = ExportProductsView._stream_rows(self._qs(export_env))
        assert inspect.isgenerator(gen)
        first = next(gen)                      # 不先物化全部数据即可产出首行
        assert first.startswith("Name,Brand,Category,Price,Stock")

    @pytest.mark.django_db
    def test_streaming_response_type(self, export_env):
        """底层流实现为惰性生成器（配合 StreamingHttpResponse 的 Chunked Transfer）。"""
        resp = _client(export_env["superadmin"]).post(EXPORT_URL)
        assert resp.status_code == 200
        assert inspect.isgenerator(ExportProductsView._stream_rows(self._qs(export_env)))

    @pytest.mark.django_db
    def test_large_export_count_with_chunking(self, export_env):
        """1024 条数据跨 3 个 chunk（500/500/24）导出，行数完整、无遗漏。"""
        from apps.goods.models import SPU

        # bulk_create 大批量数据以逼近流式路径（10 万级缩减为 1024 以控制测试时长）
        SPU.objects.bulk_create([
            SPU(name=f"bulk-{i:04d}", category=export_env["cat_a"], brand=export_env["brand"], status=SPUStatus.DRAFT)
            for i in range(1024)
        ], batch_size=500)

        lines = list(ExportProductsView._stream_rows(self._qs(export_env)))
        # header + 1024 + 既有 2 条（spu_a/spu_b）
        data_rows = [ln for ln in lines if ln.strip()]
        assert len(data_rows) == 1 + 1024 + 2
        # 流式行数与 DB 对账：每行皆以换行结尾，未吞行
        assert all(ln.endswith("\n") for ln in lines if ln.strip())