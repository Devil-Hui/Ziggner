"""
本地开发环境配置（Windows 直接运行 / Docker Compose 挂载）

⚠️ 安全警告 ⚠️
1. 此文件仅供本地开发使用，永远不要用于生产环境
2. DB_PASSWORD 优先从环境变量 DJANGO_DB_PASSWORD 读取，未设置时使用占位符
3. SECRET_KEY 优先从环境变量 DJANGO_SECRET_KEY 读取
4. CORS_ALLOW_ALL_ORIGINS = True 仅限本地开发，生产环境必须限制
"""

import os
os.environ.setdefault("DJANGO_SECRET_KEY", "django-insecure-local-dev-only-not-for-production")

from .base import *  # noqa: F401,F403

# ── 调试模式 ──
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "backend"]

# ── Secret Key（优先环境变量，回退本地占位符）──
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-local-dev-only-not-for-production")

# ── 数据库：使用本地 MySQL ──
DB_PASSWORD = os.environ.get("DJANGO_DB_PASSWORD", "please-change-me-in-production")
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "backend",
        "USER": "root",
        "PASSWORD": DB_PASSWORD,
        "HOST": "127.0.0.1",
        "PORT": "3306",
        "OPTIONS": {"charset": "utf8mb4"},
    }
}

# ── 缓存：使用本地 Redis（支持 nx 参数）──
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    },
    "rw_default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/2",
    },
    "rw_default_slave": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/3",
    },
    "verification_code": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/4",
    },
    "session": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/5",
    },
}

# ── CORS：允许前端本地开发源 ⚠️ 仅限本地开发 ──
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ── Celery：本地开发跳过 RabbitMQ ──
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
