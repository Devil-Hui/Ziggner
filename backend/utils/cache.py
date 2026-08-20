"""缓存工具类 — 支持 Redis 读写分离（Master-Slave）

Usage:
    cache = Cache('my_prefix')
    cache.get('my_key')         # 读 → Slave
    cache.set('my_key', value)  # 写 → Master
    cache.set_json('my_key', {'data': datetime.now()})
    cache.get_json('my_key')
    cache.delete('my_key')
    cache.incr('my_key')
    cache.decr('my_key')
    cache.clear_by_prefix('my_prefix')
    cache.get_or_set_with_lock('key', 3600, fetch_func)  # 锁 → Master，读 → Slave
    @cache.cache_decorator('my_prefix', timeout=3600)

防穿透策略:
    - NULL_PLACEHOLDER: 空值缓存标记，防止不存在的数据反复穿透 DB
    - 默认 NULL_TTL = 60s，避免空值长期占用内存
    - get_or_set_with_lock 中 fetch_func 返回 None 时自动写入空值缓存
"""


from datetime import date, datetime, time
from functools import wraps
from typing import Any, Callable, Optional, TypeVar, Union
import random
import time as _time
from django.conf import settings
from django.core.cache import caches

T = TypeVar('T')

# 空值占位符 — 防缓存穿透，标识"数据不存在"
NULL_PLACEHOLDER = '__NULL__'
NULL_TTL = 60  # 空值缓存 60 秒后过期

_DT_FIELDS = {'created_at', 'updated_at', 'start_time', 'end_time',
              'paid_at', 'shipped_at', 'delivered_at', 'completed_at',
              'cancelled_at', 'refunded_at', 'used_at', 'published_at',
              'reviewed_at', 'date_joined', 'last_login'}


def _serialize(obj):
    """递归转换 datetime → ISO 字符串"""
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    if isinstance(obj, (datetime, date, time)):
        return obj.isoformat()
    return obj


def _deserialize(obj):
    """递归将已知 datetime 字段的 ISO 字符串还原为 datetime"""
    if isinstance(obj, dict):
        return {k: datetime.fromisoformat(v) if isinstance(v, str) and k in _DT_FIELDS else _deserialize(v)
                for k, v in obj.items()}
    if isinstance(obj, list):
        return [_deserialize(v) for v in obj]
    if isinstance(obj, str) and len(obj) >= 19 and obj[10] == 'T':
        try:
            return datetime.fromisoformat(obj)
        except (ValueError, TypeError):
            pass
    return obj


def _get_master_slave():
    """获取读写分离的 master 和 slave cache 后端。

    如果配置了 rw_default 和 rw_default_slave 则使用读写分离，
    否则回退到 default 单实例模式。
    """
    configured = getattr(settings, 'CACHES', {})
    if 'rw_default' in configured:
        master = caches['rw_default']
        try:
            slave = caches['rw_default_slave']
        except Exception:
            slave = master
        return master, slave
    return caches['default'], caches['default']


class Cache:
    """缓存工具类 — 内置读写分离
    
    读操作走 Slave，写操作走 Master。
    锁操作（SET NX）和 clear_by_prefix（KEYS + DELETE）写 Master。
    """
    def __init__(self, prefix: str = ''):
        self.prefix = prefix
        self._master, self._slave = _get_master_slave()
        # L1 近缓存：进程内 LocMem（2C4G 二级缓存），命中省一次 Redis 往返
        try:
            self._local = caches['local']
        except Exception:
            self._local = None

    def _get_key(self, key: str) -> str:
        return f"{self.prefix}:{key}" if self.prefix else key

    # ─── 读操作 → Slave ───

    def get(self, key: str, default: Any = None) -> Any:
        return self._slave.get(self._get_key(key), default)

    def get_many(self, keys: list[str]) -> dict[str, Any]:
        """批量读取缓存（Slave，使用 pipeline 优化 Redis 往返）"""
        if not keys:
            return {}
        prefixed = [self._get_key(k) for k in keys]
        raw = self._slave.get_many(prefixed)
        strip_len = len(self.prefix) + 1 if self.prefix else 0
        result = {}
        for k, v in raw.items():
            result[k[strip_len:]] = v
        return result

    def get_json(self, key: str, default: Any = None) -> Any:
        """读取缓存并自动还原 datetime 对象（Slave）"""
        value = self._slave.get(self._get_key(key), default)
        if value is not None:
            return _deserialize(value)
        return value

    # ─── 写操作 → Master ───

    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        self._master.set(self._get_key(key), value, timeout)

    def set_json(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        """写入缓存，自动将 datetime 转为 ISO 字符串（Master）"""
        self._master.set(self._get_key(key), _serialize(value), timeout)

    # ─── 二级缓存（L1 LocMem → L2 Redis）───

    LOCAL_TTL_CAP = 300  # L1 近缓存最长存活（秒），短于 Redis 以保证最终一致

    def two_level_get(self, key: str, default: Any = None) -> Any:
        """先查 L1（LocMem），未命中再查 L2（Redis）；命中 L2 时回填 L1。"""
        if self._local is None:
            return self.get(key, default)
        lkey = self._get_key(key)
        val = self._local.get(lkey, None)
        if val is not None:
            return val
        val = self.get(key, default)
        if val is not None:
            try:
                self._local.set(lkey, val, self.LOCAL_TTL_CAP)
            except Exception:
                pass
        return val

    def two_level_set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        """写 L2（Redis）并回填 L1（LocMem）；失效时两级一起清。"""
        self.set(key, value, timeout)
        if self._local is not None:
            try:
                self._local.set(
                    self._get_key(key), value,
                    min(timeout or self.LOCAL_TTL_CAP, self.LOCAL_TTL_CAP),
                )
            except Exception:
                pass

    def two_level_delete(self, key: str) -> None:
        self.delete(key)
        if self._local is not None:
            try:
                self._local.delete(self._get_key(key))
            except Exception:
                pass

    def delete(self, key: str) -> None:
        self._master.delete(self._get_key(key))

    def incr(self, key: str, delta: int = 1) -> int:
        return self._master.incr(self._get_key(key), delta)

    def decr(self, key: str, delta: int = 1) -> int:
        return self._master.decr(self._get_key(key), delta)

    def clear_by_prefix(self, prefix: str) -> None:
        """清除指定前缀的缓存。

        Redis: SCAN + DELETE。
        DatabaseCache: 删除 django_cache_table 中 cache_key LIKE 匹配行（Django 会给 key 加版本前缀）。
        无法安全匹配时降级为 no-op 并打日志（避免误清全表）。
        """
        pattern_suffix = f"{self.prefix}:{prefix}" if self.prefix else f"{prefix}"
        try:
            from django_redis import get_redis_connection
            configured = getattr(settings, 'CACHES', {})
            alias = 'rw_default' if 'rw_default' in configured else 'default'
            backend = (configured.get(alias) or {}).get('BACKEND', '')
            if 'redis' in backend.lower() or 'django_redis' in backend.lower():
                client = get_redis_connection(alias)
                # Django 存 Redis 的完整 key = {KEY_PREFIX}:{version}:{业务 key}，
                # 必须拼上 KEY_PREFIX + version，否则 SCAN 永远匹配不到真实 key（缓存失效无效）。
                backend_cache = caches[alias]
                key_prefix = getattr(backend_cache, 'key_prefix', '') or ''
                version = getattr(backend_cache, 'version', 1) or 1
                full_pattern = f"{key_prefix}:{version}:{pattern_suffix}" if key_prefix else pattern_suffix
                match = f"{full_pattern}*"
                cursor = 0
                keys_to_delete = []
                while True:
                    cursor, keys = client.scan(cursor, match=match, count=100)
                    keys_to_delete.extend(keys)
                    if cursor == 0:
                        break
                if keys_to_delete:
                    client.delete(*keys_to_delete)
                return
        except (ImportError, Exception):
            pass

        # DatabaseCache：按 LIKE 清理（含 Django 版本前缀 :1: 等）
        try:
            import logging
            log = logging.getLogger(__name__)
            configured = getattr(settings, 'CACHES', {})
            alias = 'rw_default' if 'rw_default' in configured else 'default'
            conf = configured.get(alias) or {}
            backend_path = conf.get('BACKEND', '')
            table = conf.get('LOCATION') or 'django_cache_table'
            if 'db.DatabaseCache' not in backend_path and 'backends.db' not in backend_path:
                log.debug(
                    'clear_by_prefix skipped for backend=%s prefix=%s',
                    backend_path,
                    pattern_suffix,
                )
                return
            from django.db import connection
            like = f'%{pattern_suffix}%'
            with connection.cursor() as cursor:
                cursor.execute(
                    f'DELETE FROM {connection.ops.quote_name(table)} WHERE cache_key LIKE %s',  # nosec B608
                    [like],
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                'clear_by_prefix failed prefix=%s: %s', pattern_suffix, e
            )

    # ─── 互斥锁 → Master（SET NX），读 → Slave ───

    def get_or_set_with_lock(
        self,
        key: str,
        ttl: int,
        fetch_func: Callable,
        lock_ttl: int = 5,
        retry_times: int = 10,
        retry_delay: float = 0.1,
        null_ttl: int = NULL_TTL,
    ) -> Any:
        """
        带互斥锁的缓存读取，防止缓存击穿 + 穿透。

        缓存击穿: 热点 key 过期时，只有第一个请求去 DB 查询并重建缓存，
                 其他请求等待并重试读取缓存。

        缓存穿透: fetch_func 返回 None 时，写入空值占位符 (NULL_PLACEHOLDER)，
                 后续请求命中空值缓存直接返回 None，不再穿透到 DB。

        缓存雪崩: TTL 随机偏移防止大量 key 同时过期。

        锁（SET NX / DELETE）走 Master，读走 Slave，双重检查走 Master 避免复制延迟。
        """
        cache_key = self._get_key(key)

        # 1. 尝试读缓存（Slave）
        value = self._slave.get(cache_key)
        if value is not None:
            # 空值缓存检测：命中空值占位符 → 返回 None
            if value == NULL_PLACEHOLDER:
                return None
            return value

        # 2. 缓存 miss → 互斥锁
        # Redis: SET NX；MySQL-only DatabaseCache: cache.add（原子 add-if-missing）
        lock_key = f"{cache_key}:lock"
        redis_client = None
        got_lock = False
        try:
            from django_redis import get_redis_connection
            redis_client = get_redis_connection(
                'rw_default' if 'rw_default' in getattr(settings, 'CACHES', {}) else 'default'
            )
            got_lock = bool(redis_client.set(lock_key, '1', nx=True, ex=lock_ttl))
        except (ImportError, Exception):
            redis_client = None
            try:
                got_lock = bool(self._master.add(lock_key, '1', lock_ttl))
            except Exception:
                return fetch_func()

        if got_lock:
            # 3. 获取锁成功 → 负责重建缓存
            try:
                # 双重检查：从 Master 读取避免复制延迟（Slave 可能还没同步）
                value = self._master.get(cache_key)
                if value is not None:
                    if value == NULL_PLACEHOLDER:
                        return None
                    return value

                value = fetch_func()
                if value is not None:
                    jittered_ttl = ttl + random.randint(0, 60)
                    self._master.set(cache_key, value, jittered_ttl)
                else:
                    # 防穿透：写入空值缓存，避免后续请求穿透到 DB
                    jittered_null_ttl = null_ttl + random.randint(0, 30)
                    self._master.set(cache_key, NULL_PLACEHOLDER, jittered_null_ttl)
                return value
            finally:
                try:
                    if redis_client is not None:
                        redis_client.delete(lock_key)
                    else:
                        self._master.delete(lock_key)
                except Exception:
                    pass
        else:
            # 4. 获取锁失败 → 等待并重试读缓存（Slave）
            for _ in range(retry_times):
                _time.sleep(retry_delay)
                value = self._slave.get(cache_key)
                if value is not None:
                    if value == NULL_PLACEHOLDER:
                        return None
                    return value

            # 5. 最终兜底：直接查 DB
            return fetch_func()

    # ─── 装饰器 ───

    def cache_decorator(
        self,
        key_prefix: str,
        timeout: Optional[int] = None,
        skip_none: bool = True
    ) -> Callable:
        """缓存装饰器（读 Slave，写 Master）"""
        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @wraps(func)
            def wrapper(*args, **kwargs) -> T:
                key_parts = [self.prefix] if self.prefix else []
                key_parts.append(key_prefix)
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = ':'.join(key_parts)

                # 读 Slave
                cached_value = self._slave.get(cache_key)
                if cached_value is not None:
                    return cached_value

                result = func(*args, **kwargs)
                if result is None and skip_none:
                    return result

                # 写 Master
                self._master.set(cache_key, result, timeout)
                return result

            return wrapper
        return decorator
