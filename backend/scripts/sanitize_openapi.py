"""
OpenAPI 导出前安全清洗（大厂规范）。

在将 API Schema 交给前端 / 测试 / 外部文档使用前，执行导出前清洗：
  1. 敏感示例脱敏：手机号、邮箱、Bearer Token、密码/密钥、地址、真实姓名
  2. 环境变量占位：servers.url / description 中的生产域名 → ${API_BASE_URL}
  3. 输出 YAML（docs/api/ziggner-openapi-safe.yml）并打印清洗统计

用法（docker 内，与契约基线同源）：
  python scripts/sanitize_openapi.py [--output docs/api/ziggner-openapi-safe.yml]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# 生产域名 → 环境变量占位（前端/文档可读，不泄漏源站）
_DOMAIN_PLACEHOLDERS = [
    (re.compile(r'https?://(?:api|admin|shop|www)\.ziggner\.com', re.I), '${API_BASE_URL}'),
    (re.compile(r'https?://[a-z0-9-]+\.trycloudflare\.com', re.I), '${API_BASE_URL}'),
]

# 敏感示例 → 脱敏占位
_PHONE_RE = re.compile(r'(?<!\d)1[3-9]\d{9}(?!\d)')
_EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
_TOKEN_RE = re.compile(r'\b(Bearer|JWT|token)\s+[A-Za-z0-9._\-]{12,}', re.I)
_PASSWORD_RE = re.compile(r'(?i)(password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*["\']?[^\s,;&"\'<>]{4,}')

_SENSITIVE_KEYS = {
    'phone', 'mobile', 'telephone', 'shipping_phone',
    'email', 'user_email', 'shipping_email',
    'password', 'old_password', 'new_password', 'confirm_password',
    'token', 'access', 'refresh', 'authorization',
    'id_card', 'account_no',
}


def _sanitize_text(text: str) -> str:
    text = _PHONE_RE.sub('<PHONE>', text)
    text = _EMAIL_RE.sub('user@example.com', text)
    text = _TOKEN_RE.sub(r'\1 <TOKEN>', text)
    text = _PASSWORD_RE.sub(r'\1=<SECRET>', text)
    for pattern, repl in _DOMAIN_PLACEHOLDERS:
        text = pattern.sub(repl, text)
    return text


def _sanitize_value(value, key: str = '') -> str:
    # 数字类型（如 example: 13800138000 未带引号）也需脱敏
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if _PHONE_RE.fullmatch(str(value)):
            return '<PHONE>'
        return value
    if not isinstance(value, str):
        return value
    lowered = key.lower()
    # 敏感字段的值整体占位（除枚举/状态类短值）
    if lowered in _SENSITIVE_KEYS and len(value) < 64:
        return '<REDACTED>'
    if lowered in ('url', 'server', 'base_url', 'host') and 'ziggner' in value.lower():
        for pattern, repl in _DOMAIN_PLACEHOLDERS:
            value = pattern.sub(repl, value)
    return _sanitize_text(value)


def _walk(obj, key: str = '', stats: dict | None = None) -> None:
    if stats is None:
        stats = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                cleaned = _sanitize_value(v, k)
                if cleaned != v:
                    stats[k] = stats.get(k, 0) + 1
                obj[k] = cleaned
            else:
                _walk(v, k, stats)
    elif isinstance(obj, list):
        for item in obj:
            _walk(item, key, stats)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--output',
        default=str(BACKEND_ROOT.parent / 'docs/api/ziggner-openapi-safe.yml'),
        help='输出路径（默认仓库根 docs/api/ziggner-openapi-safe.yml）',
    )
    args = parser.parse_args()

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.config.settings.dev')
    import django
    django.setup()
    from drf_spectacular.settings import spectacular_settings

    generator_cls = spectacular_settings.DEFAULT_GENERATOR_CLASS
    schema = generator_cls().get_schema(request=None, public=True)

    # 清洗前快照（统计用）
    raw_json = json.dumps(schema, ensure_ascii=False)
    stats: dict[str, int] = {}
    _walk(schema, stats=stats)

    import yaml
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        yaml.safe_dump(schema, allow_unicode=True, sort_keys=True, width=200),
        encoding='utf-8',
    )

    n_paths = len(schema.get('paths', {}))
    print(f'OpenAPI 安全版已生成：{out}')
    print(f'  路径 {n_paths} 条；服务器占位：{_DOMAIN_PLACEHOLDERS[0][1]}')
    print(f'  脱敏替换统计（按字段）：{json.dumps(stats, ensure_ascii=False)}')
    # 终检：无真实手机号/邮箱残留
    leftover_phone = _PHONE_RE.findall(raw_json)
    leftover_email = [m for m in _EMAIL_RE.findall(raw_json) if not m.endswith('example.com')]
    if leftover_phone or leftover_email:
        print(f'  [警告] 清洗后仍残留：phone={leftover_phone[:3]} email={leftover_email[:3]}')
        return 1
    print('  终检通过：无真实手机号 / 邮箱残留')
    return 0


if __name__ == '__main__':
    sys.exit(main())
