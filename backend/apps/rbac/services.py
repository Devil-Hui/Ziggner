"""
RBAC 判定与缓存 —— 全站权限判断的唯一入口。

为什么用进程内缓存而不是 Django cache：
  生产缓存后端是 DatabaseCache（MySQL），走 Django cache 等于每请求一次 DB 查询，
  正好是 2C4G 上要避免的。这里的数据极小（5 角色 × ~35 权限点、约 35 个用户），
  放进程内 dict 内存可忽略，稳态每请求 0 次查询。

一致性窗口：
  权限变更时本进程立即失效；其它进程靠 TTL 兜底（角色权限 ≤60s，用户角色 ≤30s）。
  生产 Gunicorn 默认 1 worker，实际只有一个进程。若将来提到多 worker，
  "改权限"这类低频操作存在 ≤60s 的最终一致窗口 —— 需写进运维文档。
"""
from __future__ import annotations

import logging
import threading
import time

from apps.rbac.constants import (
    ALL_PERM_CODES,
    DEFAULT_ROLE,
    DEFAULT_ROLE_PERMS,
    Role,
)

logger = logging.getLogger(__name__)

ROLE_PERM_TTL = 60.0
USER_ROLE_TTL = 30.0

_lock = threading.RLock()

#: 角色 → 权限点集合；None 表示未加载
_role_perms: dict[str, frozenset[str]] | None = None
_role_perms_expire: float = 0.0

#: user_id → (角色集合, 过期时刻, 账号创建指纹)
_user_roles: dict[int, tuple[frozenset[str], float, str | None]] = {}


# ==================== 缓存失效 ====================

def invalidate_role_perms() -> None:
    """角色权限矩阵变更后调用。"""
    global _role_perms, _role_perms_expire
    with _lock:
        _role_perms = None
        _role_perms_expire = 0.0


def invalidate_user(user_id: int) -> None:
    """某用户角色变更后调用。"""
    with _lock:
        _user_roles.pop(user_id, None)


def invalidate_all() -> None:
    """清空全部缓存。测试与管理命令使用。"""
    global _role_perms, _role_perms_expire
    with _lock:
        _role_perms = None
        _role_perms_expire = 0.0
        _user_roles.clear()


# ==================== 加载 ====================

def _load_role_perms() -> dict[str, frozenset[str]]:
    """从 DB 读取角色权限矩阵。表为空时回退到默认授权，避免误清空导致全站锁死。"""
    from apps.rbac.models import RolePermission

    mapping: dict[str, set[str]] = {}
    for role, code in RolePermission.objects.values_list('role', 'perm_code'):
        mapping.setdefault(role, set()).add(code)

    if not mapping:
        logger.warning('rbac_role_permission 为空，回退到 DEFAULT_ROLE_PERMS')
        return dict(DEFAULT_ROLE_PERMS)

    # 幽灵权限自检：库里有、代码里已删除的 code。不阻断，只告警。
    orphans = {c for codes in mapping.values() for c in codes} - ALL_PERM_CODES
    if orphans:
        logger.warning('rbac 发现未注册的权限点（将被忽略）: %s', sorted(orphans))

    return {role: frozenset(codes) for role, codes in mapping.items()}


def get_role_perms() -> dict[str, frozenset[str]]:
    """角色 → 权限点集合，带 TTL 的进程内缓存。"""
    global _role_perms, _role_perms_expire

    now = time.monotonic()
    cached = _role_perms
    if cached is not None and now < _role_perms_expire:
        return cached

    with _lock:
        # 双检：可能已被其它线程刷新
        if _role_perms is not None and time.monotonic() < _role_perms_expire:
            return _role_perms
        _role_perms = _load_role_perms()
        _role_perms_expire = time.monotonic() + ROLE_PERM_TTL
        return _role_perms


def _user_identity(user_or_id) -> tuple[int, str | None]:
    if isinstance(user_or_id, int):
        return user_or_id, None
    user_id = int(user_or_id.pk)
    joined = getattr(user_or_id, 'date_joined', None)
    return user_id, joined.isoformat() if joined else None


def get_user_roles(user_or_id) -> frozenset[str]:
    """用户的角色集合，带 TTL 的进程内缓存。无记录时返回默认角色。"""
    user_id, identity = _user_identity(user_or_id)
    now = time.monotonic()
    hit = _user_roles.get(user_id)
    if hit is not None and now < hit[1] and (identity is None or hit[2] == identity):
        return hit[0]

    from apps.rbac.models import UserRole

    roles = frozenset(
        UserRole.objects.filter(user_id=user_id).values_list('role', flat=True)
    ) or frozenset({DEFAULT_ROLE.value})

    with _lock:
        _user_roles[user_id] = (roles, time.monotonic() + USER_ROLE_TTL, identity)
    return roles


# ==================== 判定 ====================

def get_user_perms(user) -> frozenset[str]:
    """
    用户的权限点并集。结果挂在 user 实例上，同一请求内多次判断只算一次。

    superadmin（Django is_superuser）拥有全部权限，不查表。
    """
    if not getattr(user, 'is_authenticated', False):
        return frozenset()

    cached = getattr(user, '_rbac_perms', None)
    if cached is not None:
        return cached

    if getattr(user, 'is_superuser', False):
        perms = ALL_PERM_CODES
    else:
        role_perms = get_role_perms()
        perms = frozenset().union(
            *(role_perms.get(role, frozenset()) for role in get_user_roles(user))
        )

    try:
        user._rbac_perms = perms
    except AttributeError:  # 某些不可写的 user 代理对象
        pass
    return perms


def has_perm(user, code: str) -> bool:
    """全站权限判断的唯一入口。"""
    if not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    return code in get_user_perms(user)


def has_role(user, role: str) -> bool:
    """是否拥有某角色。superadmin 视为拥有 superadmin 角色。"""
    if not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False) and role == Role.SUPERADMIN.value:
        return True
    return role in get_user_roles(user)
