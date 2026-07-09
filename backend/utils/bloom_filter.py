"""布隆过滤器 — 前置拦截不存在的 ID，防止缓存穿透

使用 Redis Bitmap 实现，内存占用极小（约 1.2 MB / 百万 key）。
仅在 Redis 可用时使用，不可用时降级为直接查库。

Usage:
    bf = BloomFilter('spu_ids', capacity=100000, error_rate=0.001)
    bf.add('spu:123)          # 添加
    bf.exists('spu:123')      # 检查是否存在

    # 不可用时降级：
    bf = BloomFilter('spu_ids', capacity=100000, fallback=True)
    # fallback=True → 不可用时返回 True（降级为查库）
"""

import hashlib
import math
from typing import Optional
from django.conf import settings

_redis_client: Optional[object] = None


def _get_redis():
    """获取 Redis 连接（单例延迟初始化）"""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        from django_redis import get_redis_connection
        configured = getattr(settings, 'CACHES', {})
        alias = 'rw_default' if 'rw_default' in configured else 'default'
        _redis_client = get_redis_connection(alias)
    except Exception:
        _redis_client = False
    return _redis_client


class BloomFilter:
    """基于 Redis Bitmap 的布隆过滤器

    - 使用多个哈希函数减少误判
    - 位数组存储在 Redis 中，支持多进程共享
    - 不可用时自动降级（fallback=True 返回 True 走查库）
    """

    def __init__(
        self,
        name: str,
        capacity: int = 100000,
        error_rate: float = 0.001,
        fallback: bool = True,
    ):
        self.name = name
        self.capacity = capacity
        self.error_rate = error_rate
        self.fallback = fallback
        self._redis_key = f'bloom:{name}'

        # 计算位数组大小和哈希函数数量
        self._bit_size = int(-capacity * math.log(error_rate) / (math.log(2) ** 2))
        self._hash_count = int(self._bit_size / capacity * math.log(2))
        if self._hash_count < 1:
            self._hash_count = 1

    def _get_offsets(self, value: str):
        """计算位偏移量（双重哈希法）"""
        h1 = hashlib.md5(value.encode(), usedforsecurity=False)
        h2 = hashlib.sha256(value.encode(), usedforsecurity=False)
        n1 = int(h1.hexdigest(), 16)
        n2 = int(h2.hexdigest(), 16)
        for i in range(self._hash_count):
            yield (n1 + i * n2) % self._bit_size

    def add(self, value: str) -> bool:
        """添加元素到布隆过滤器"""
        r = _get_redis()
        if not r:
            return False
        try:
            offsets = list(self._get_offsets(value))
            pipe = r.pipeline()
            for offset in offsets:
                pipe.setbit(self._redis_key, offset, 1)
            pipe.execute()
            return True
        except Exception:
            return False

    def exists(self, value: str) -> bool:
        """检查元素是否可能存在

        Returns:
            True: 可能存在（需要再查缓存/DB 确认）
            False: 一定不存在（可安全拦截）
        """
        r = _get_redis()
        if not r:
            return self.fallback  # 降级：返回 True 走查库
        try:
            for offset in self._get_offsets(value):
                if not r.getbit(self._redis_key, offset):
                    return False
            return True
        except Exception:
            return self.fallback

    def batch_add(self, values: list[str]) -> bool:
        """批量添加（pipeline 优化）"""
        r = _get_redis()
        if not r:
            return False
        try:
            pipe = r.pipeline()
            for value in values:
                for offset in self._get_offsets(value):
                    pipe.setbit(self._redis_key, offset, 1)
            pipe.execute()
            return True
        except Exception:
            return False

    def clear(self):
        """清除布隆过滤器"""
        r = _get_redis()
        if r:
            r.delete(self._redis_key)

    def __contains__(self, value: str) -> bool:
        return self.exists(value)