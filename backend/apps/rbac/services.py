"""
RBAC 判定与缓存 —— 全站权限判断的唯一入口。

缓存策略（Redis + 版本号，满足多 worker 实时失效）：
  - 角色权限矩阵   `rbac:role_perms:v{N}`  随版本号失效（TTL 300s 兜底）
  - 用户角色       `rbac:user_roles:{uid}`  变更时显式删除（TTL 300s 兜底）
  - 版本号         `rbac:version`           权限矩阵变更时 INCR，所有进程读新版本即 miss 重载，
                                            消除多 worker 场景下的最终一致窗口。
  - 判定结果仍挂在 user 实例（_rbac_perms）做请求级缓存，同一请求内零额外 IO。
"""
from __future__ import annotations

import logging

from apps.rbac.constants import (
    ALL_PERM_CODES,
    DEFAULT_ROLE,
    DEFAULT_ROLE_PERMS,
    Role,
)
from utils.cache import Cache

logger = logging.getLogger(__name__)

ROLE_PERM_TTL = 300
USER_ROLE_TTL = 300

_cache = Cache('rbac')
_VERSION_KEY = 'version'


# ==================== 缓存失效 ====================

def _bump_version() -> None:
    """递增缓存版本号。django_redis 的 incr 对不存在的 key 抛 ValueError（首次启动/新环境），
    需先初始化 key 再递增，否则启动期 rbac_bootstrap 等管理命令会中断容器启动。"""
    if _cache.get(_VERSION_KEY) is None:
        _cache.set(_VERSION_KEY, 1)
    _cache.incr(_VERSION_KEY)


def invalidate_role_perms() -> None:
    """角色权限矩阵变更后调用：递增版本号，全进程即时失效。"""
    _bump_version()


def invalidate_user(user_id: int) -> None:
    """某用户角色变更后调用：删除该用户角色缓存。"""
    _cache.delete(f'user_roles:{user_id}')


def invalidate_all() -> None:
    """清空全部缓存。测试与管理命令使用。"""
    _bump_version()


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
    """角色 → 权限点集合。Redis 缓存 + 版本号：矩阵变更 INCR 版本号即全进程即时失效。"""
    version = _get_version()
    key = f'role_perms:v{version}'
    cached = _cache.get_json(key)
    if cached is not None:
        return {role: frozenset(codes) for role, codes in cached.items()}

    data = _load_role_perms()
    _cache.set_json(key, {role: sorted(codes) for role, codes in data.items()}, ROLE_PERM_TTL)
    return data


def _get_version() -> int:
    v = _cache.get(_VERSION_KEY)
    if v is None:
        v = 1
        try:
            _cache.set(_VERSION_KEY, v)
        except Exception:
            pass
    return int(v)


def _user_identity(user_or_id) -> tuple[int, str | None]:
    if isinstance(user_or_id, int):
        return user_or_id, None
    user_id = int(user_or_id.pk)
    joined = getattr(user_or_id, 'date_joined', None)
    return user_id, joined.isoformat() if joined else None


def get_user_roles(user_or_id) -> frozenset[str]:
    """用户的角色集合。Redis 缓存；角色变更时 invalidate_user 删除该 key 即时失效。

    ABAC：expires_at 到期的临时角色自动剔除；conditions 中的 time 条件不满足同样剔除。
    """
    user_id, identity = _user_identity(user_or_id)
    key = f'user_roles:{user_id}'
    hit = _cache.get_json(key)
    if hit is not None:
        if identity is None or hit.get('stamp') == identity:
            return frozenset(hit['roles'])

    from django.utils import timezone
    from apps.rbac.models import UserRole

    now = timezone.now()
    active = [
        ur.role
        for ur in UserRole.objects.filter(user_id=user_id)
        if (ur.expires_at is None or ur.expires_at > now)
        and conditions_met(ur.conditions or {})
    ]
    roles = frozenset(active) or frozenset({DEFAULT_ROLE.value})

    _cache.set_json(key, {'roles': sorted(roles), 'stamp': identity}, USER_ROLE_TTL)
    return roles


# ==================== ABAC 条件评估 ====================

def conditions_met(conditions: dict, now=None) -> bool:
    """ABAC 动态授权条件评估（预留接口，向后兼容）。

    空条件 → 放行（现有授权不受影响）。
    支持的字段：
      {"time": {"after": "09:00", "before": "18:00", "weekdays": [1,2,3,4,5]}}
      —— 当前本地时间需落在区间内且为指定星期（1=周一 … 7=周日）。
    未支持的字段（risk / geo 等）按最小权限原则默认拒绝，待后续实现。
    """
    if not conditions:
        return True
    now = now or _local_now()
    time_cfg = conditions.get('time')
    if time_cfg:
        if not _time_condition_met(time_cfg, now):
            return False
    # 未来扩展：risk / geo / device 等条件在此追加；未识别键默认拒绝
    supported = {'time'}
    if any(k for k in conditions if k not in supported):
        return False
    return True


def _local_now():
    from django.utils import timezone
    return timezone.localtime(timezone.now())


def _time_condition_met(cfg: dict, now) -> bool:
    try:
        hhmm = now.strftime('%H:%M')
        if cfg.get('after') and hhmm < str(cfg['after']):
            return False
        if cfg.get('before') and hhmm > str(cfg['before']):
            return False
        weekdays = cfg.get('weekdays')
        if weekdays:
            # ISO weekday: 1=Mon … 7=Sun
            if now.isoweekday() not in [int(w) for w in weekdays]:
                return False
    except (TypeError, ValueError):
        return False
    return True


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
