"""Redis + Lua 原子令牌桶限流。

2C4G 约束下的限流底座：
- 每个 (路径, 客户端) 一个令牌桶，容量 = refill 速率（突发上限），
  以 req/s 匀速补充，保证平滑限流而非滑动窗口的锯齿。
- 整个「取令牌 → 算剩余 → 算重试时间」在一段 Lua 脚本内原子完成，
  避免多 worker 并发下的竞态（纯 Python + WATCH 无法跨进程原子）。

Lua 脚本逻辑（见 TOKEN_BUCKET_LUA）：
  - 读取 last_ts / tokens（缺失则按满桶初始化）
  - 按经过时间补充令牌（上限 capacity）
  - 若 tokens >= 1：扣 1，返回 allowed=1 + 剩余 + retry_after=0
  - 否则：返回 allowed=0 + 剩余 + 预计多久后可得 1 令牌

降级（资源用尽）：当系统处于降级态（memory watchdog 置位），
allow() 直接放行（fail-open），避免雪崩式 429。
"""

from __future__ import annotations

import time

from django.conf import settings
from django.core.cache import cache

# 原子令牌桶：KEYS[1]=桶key, ARGV[1]=capacity(req/s), ARGV[2]=now_ms, ARGV[3]=ttl_s
TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  ts = now
else
  -- 按经过毫秒补充令牌（capacity 即 req/s）
  local elapsed = (now - ts) / 1000.0
  tokens = math.min(capacity, tokens + elapsed * capacity)
  ts = now
end

local allowed = 0
local retry_after = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  -- 距离下一个令牌可用的秒数
  retry_after = (1 - tokens) / capacity
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', ts)
redis.call('EXPIRE', key, ttl)
return {allowed, tokens, retry_after}
"""


def _redis_eval():
    from django_redis import get_redis_connection

    return get_redis_connection('default')


def allow(key: str, rate: float, *, ttl: int = 120, burst: float | None = None) -> tuple[bool, float, float]:
    """尝试消耗 1 个令牌。

    返回 (allowed, remaining_tokens, retry_after_seconds)。
    rate 单位 req/s；burst 为桶容量（默认=rate，即允许 1s 突发）。
    """
    capacity = burst if burst is not None else rate
    if capacity <= 0:
        return True, 0.0, 0.0

    # 降级态：fail-open，直接放行
    if _degraded():
        return True, capacity, 0.0

    now_ms = int(time.time() * 1000)
    try:
        conn = _redis_eval()
        res = conn.eval(TOKEN_BUCKET_LUA, 1, f'tb:{key}', capacity, now_ms, ttl)
        allowed, tokens, retry_after = int(res[0]), float(res[1]), float(res[2])
        return bool(allowed), tokens, retry_after
    except Exception:
        # Redis 不可用时 fail-open，避免限流组件把全站拖垮
        return True, capacity, 0.0


def _degraded() -> bool:
    """读取内存看门狗置位的降级标志（LocMem 本地标记）。"""
    try:
        from django.core.cache import caches

        return bool(caches['local'].get('system:degraded', False))
    except Exception:
        return False
