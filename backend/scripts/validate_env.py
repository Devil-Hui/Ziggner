#!/usr/bin/env python
"""
生产环境变量完整性校验脚本。

在 Django 启动之前运行，确保所有必需的环境变量已设置。
如果缺少必要变量，脚本将输出错误信息并退出（exit code 1）。

用法:
    python scripts/validate_env.py [--env prod|dev]
"""

import os
import sys

ENV = sys.argv[1] if len(sys.argv) > 1 else os.getenv('DJANGO_ENV', 'dev')

REQUIRED_VARS = {
    'prod': [
        ('TURNSTILE_SECRET_KEY', 'Cloudflare Turnstile server-side secret'),
        ('DJANGO_SECRET_KEY', 'Django 签名密钥（用于 JWT / CSRF / Session）'),
        ('DB_NAME', '数据库名称'),
        ('DB_USER', '数据库用户名'),
        ('DB_PASSWORD', '数据库密码'),
        ('DB_HOST', '数据库主机地址'),
        ('ALLOWED_HOSTS', '允许的域名列表（逗号分隔）'),
        ('CORS_ORIGINS', 'CORS 允许来源（逗号分隔）'),
        ('DJANGO_SUPERUSER_PASSWORD', '超级管理员初始密码（首次启动自动创建）'),
    ],
    'dev': [
        ('DJANGO_SECRET_KEY', 'Django 签名密钥'),
        ('DB_NAME', '数据库名称'),
        ('DB_USER', '数据库用户名'),
        ('DB_PASSWORD', '数据库密码'),
    ],
}

WEAK_SECRET_KEYS = [
    'django-insecure-',
    'change-me',
    'change-this',
    'dev-only',
]

errors = []

# 获取当前环境需要的变量
required = REQUIRED_VARS.get(ENV, REQUIRED_VARS['dev'])

for var_name, description in required:
    value = os.getenv(var_name, '')
    if not value:
        errors.append(f'  ❌ {var_name} — {description}（未设置）')
    elif any(weak in value.lower() for weak in WEAK_SECRET_KEYS):
        errors.append(
            f'  ⚠️  {var_name} — 值为弱密钥/占位符！请使用强随机值。\n'
            f'     当前值: {value[:30]}...'
        )

# 额外检查 SECRET_KEY 强度
secret_key = os.getenv('DJANGO_SECRET_KEY', '')
if secret_key and len(secret_key) < 32:
    errors.append(
        f'  ⚠️  DJANGO_SECRET_KEY 长度不足（当前 {len(secret_key)}，建议 ≥ 64 字符）'
    )

# 额外检查 DB_PASSWORD 强度
db_password = os.getenv('DB_PASSWORD', '')
if db_password and len(db_password) < 10:
    errors.append(f'  ⚠️  DB_PASSWORD 长度不足（当前 {len(db_password)}，建议 ≥ 16 字符）')

if errors:
    print(f'\n🔒 Ziggner 环境变量检查 [{ENV}] — 发现 {len(errors)} 个问题:\n')
    for err in errors:
        print(err)
    print()
    if ENV == 'prod':
        print('❌ 生产环境变量缺失，启动终止。')
        sys.exit(1)
    else:
        print('⚠️  开发环境继续启动（建议修复以上问题）')
else:
    print(f'✅ Ziggner 环境变量检查 [{ENV}] — 全部通过')

sys.exit(0 if ENV == 'dev' or not errors else 1)
