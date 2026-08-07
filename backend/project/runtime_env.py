"""
进程入口的环境解析 —— 不依赖 Django，可在 setup 之前调用。

约定：
  - 环境变量优先：DJANGO_ENV > DEL_ENV（历史别名）
  - manage.py（CLI）默认 local，方便本机开发
  - wsgi / asgi / celery（服务）默认 prod，未设环境时 fail-closed
  - Docker / CI 必须显式注入 DJANGO_ENV，不依赖默认值
"""
from __future__ import annotations

import os

ALLOWED_ENVS = frozenset({'dev', 'staging', 'prod'})
ENV_ALIASES = {'local': 'dev'}


def resolve_django_env(*, default: str) -> str:
    raw = os.getenv('DJANGO_ENV') or os.getenv('DEL_ENV') or default
    env = ENV_ALIASES.get(raw.strip().lower(), raw.strip().lower())
    if env not in ALLOWED_ENVS:
        raise RuntimeError(
            f'非法 DJANGO_ENV={raw!r}；允许值: {sorted(ALLOWED_ENVS)}'
        )
    return env


def resolve_settings_module(*, default: str) -> str:
    return f'project.config.settings.{resolve_django_env(default=default)}'
