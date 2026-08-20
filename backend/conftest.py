"""
pytest 全局 conftest.py —— 测试基础设施。

提供：
  - db / django_db_reset：每用例事务自动回滚（TestCase 语义，满足「TestCase 事务自动回滚」决策）
  - rf：APIRequestFactory
  - redis_conn：清理 throttle / 缓存的便捷 fixture
  - 各子系统的便捷 fixture（user / leader / ops / customer / superadmin）

注意：测试数据通过 Factory Boy 构造，用例结束后事务回滚，无残留。
中间产物（压测结果、Allure 原始 JSON 等）统一输出到仓库外 `change/test/workbuddyt/`，不入库。
"""
from __future__ import annotations

import os

import django

# 在 import django 模块前确保 settings 已配置（pytest-django 会读 DJANGO_SETTINGS_MODULE）
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.config.settings.dev")
django.setup()

import pytest
from django.core.cache import caches
from django.test.utils import setup_test_environment, teardown_test_environment
from rest_framework.test import APIRequestFactory

from apps.rbac.constants import Role


# ── 环境 ────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def django_db_setup():
    """session 级：仅标记使用真实 DB（CI 的 MySQL8 / 本地 dev）。"""
    from django.conf import settings
    # 测试用独立 DB 名（避免污染 dev 数据）：CI 注入 DB_NAME=ziggner_test
    if not os.getenv("DB_NAME"):
        settings.DATABASES["default"]["NAME"] = os.getenv("DB_NAME", "ziggner_test")


@pytest.fixture(scope="session")
def django_db_keepdb():
    """保持测试 DB 跨 session（加速本地重复跑）；CI 每次重建。"""
    return os.getenv("CI") != "true"


# ── 请求 / 缓存 ──────────────────────────────────────────────────────────────

@pytest.fixture
def rf():
    return APIRequestFactory()


@pytest.fixture
def redis_conn():
    """返回 Redis 连接，并自动清理 throttle / 缓存 key。"""
    from django_redis import get_redis_connection

    conn = get_redis_connection("default")

    def flush_throttle():
        # throttle keys 在 db 0，前缀 ziggner:prod:1:throttle_* / ziggner:dev:1:throttle_*
        for key in conn.scan_iter(match="*throttle*"):
            conn.delete(key)

    flush_throttle()
    yield conn
    flush_throttle()


@pytest.fixture(autouse=True)
def _clear_caches():
    """每用例前后清空 Redis 缓存，避免用例间污染。"""
    for name in ("default", "rw_default", "session", "verification_code"):
        try:
            caches[name].clear()
        except Exception:
            pass
    yield
    for name in ("default", "rw_default", "session", "verification_code"):
        try:
            caches[name].clear()
        except Exception:
            pass


# ── 角色用户 fixture ─────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    from apps.users.tests.factories import UserFactory

    return UserFactory()


@pytest.fixture
def customer(db):
    from apps.users.tests.factories import UserFactory

    return UserFactory()  # 无角色 = customer 默认


@pytest.fixture
def superadmin(db):
    from apps.users.tests.factories import UserFactory

    return UserFactory(is_superuser=True)


@pytest.fixture
def leader(db):
    from apps.rbac.models import UserRole
    from apps.users.tests.factories import UserFactory

    u = UserFactory()
    UserRole.objects.create(user=u, role=Role.ADMIN_LEADER.value)
    return u


@pytest.fixture
def member(db):
    from apps.rbac.models import UserRole
    from apps.users.tests.factories import UserFactory

    u = UserFactory()
    UserRole.objects.create(user=u, role=Role.ADMIN_MEMBER.value)
    return u


@pytest.fixture
def ops(db):
    from apps.rbac.models import UserRole
    from apps.users.tests.factories import UserFactory

    u = UserFactory()
    UserRole.objects.create(user=u, role=Role.OPS.value)
    return u
