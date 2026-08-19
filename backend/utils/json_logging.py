"""
结构化日志基础设施 —— JSON 格式 + 敏感信息脱敏 + request_id 贯穿。

- JsonFormatter：每条日志输出单行 JSON（ts/level/logger/msg/request_id/exc），
  便于 ELK / Loki 集中采集与按 request_id 关联定位慢请求。
- 脱敏：password / token / authorization / phone 等字段值以 *** 遮蔽，
  防止密码、凭据、手机号落入日志。
- request_id：由异常中间件在请求入口写入线程局部变量，同请求内所有日志自动携带。
"""
from __future__ import annotations

import json
import logging
import re
import threading
from datetime import datetime, timezone

_local = threading.local()


def set_request_id(request_id: str) -> None:
    _local.request_id = request_id


def get_request_id() -> str | None:
    return getattr(_local, 'request_id', None)


def clear_request_id() -> None:
    _local.request_id = None


# ── 敏感字段脱敏 ─────────────────────────────────────────────

_KEY_VALUE = re.compile(
    r'(?i)(password|passwd|pwd|token|secret|api[_-]?key|authorization)["\']?\s*[:=]\s*["\']?[^\s,;&"\']+'
)
_TOKEN_SPACE = re.compile(r'(?i)\b(token|authorization|bearer)\s+[A-Za-z0-9._\-]{6,}')
_JSON_VALUE = re.compile(r'(?i)("(?:password|passwd|pwd|token|secret|authorization)"\s*:\s*")[^"]+(")')
_PHONE = re.compile(r'(?<!\d)(1[3-9]\d)\d{4}(\d{4})(?!\d)')


def mask_sensitive(text: str) -> str:
    """对日志文本做敏感信息脱敏（密码/令牌/手机号）。"""
    if not text:
        return text
    masked = _JSON_VALUE.sub(r'\1***\2', text)
    masked = _KEY_VALUE.sub('***', masked)
    masked = _TOKEN_SPACE.sub(r'\1 ***', masked)
    masked = _PHONE.sub(r'\1****\2', masked)
    return masked


class JsonFormatter(logging.Formatter):
    """单行 JSON 日志格式器。"""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            'ts': datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
            'level': record.levelname,
            'logger': record.name,
            'msg': mask_sensitive(record.getMessage()),
            'request_id': get_request_id() or '-',
        }
        if record.exc_info:
            entry['exc'] = mask_sensitive(self.formatException(record.exc_info))
        extra = getattr(record, 'extra_fields', None)
        if isinstance(extra, dict):
            entry.update(extra)
        return json.dumps(entry, ensure_ascii=False, default=str)
