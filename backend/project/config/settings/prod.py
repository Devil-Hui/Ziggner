from .base import *  # 继承 base.py
import os, datetime

# 生产环境关闭 DEBUG
DEBUG = False

# JWT Token 有效期（生产环境 15min access / 7d refresh）
SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = datetime.timedelta(minutes=15)
SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'] = datetime.timedelta(days=7)

# 允许的域名（从环境变量获取）
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")
if ALLOWED_HOSTS == ['']:
    raise RuntimeError("ALLOWED_HOSTS 环境变量未设置！")

# CORS — 生产环境仅允许已知来源 (F-009 修复)
cors_origins = os.getenv("CORS_ORIGINS", "")
if not cors_origins:
    raise RuntimeError("CORS_ORIGINS 环境变量未设置！")
CORS_ALLOWED_ORIGINS = cors_origins.split(",")
CORS_ALLOW_CREDENTIALS = True

# 文件存储配置
FILE_STORAGE = os.getenv('FILE_STORAGE', 'local')  # 'local' 或 'r2' (Cloudflare R2)
MEDIA_PATH = os.getenv('MEDIA_PATH', 'media') or 'media'
MEDIA_URL = f"/{MEDIA_PATH.strip('/')}/"
MEDIA_ROOT = os.path.join(BASE_DIR, MEDIA_PATH)
FILE_STORAGE_MAX_SIZE = os.getenv('FILE_STORAGE_MAX_SIZE', 5)  # 5MB
FILE_STORAGE_ALLOWED_TYPES = os.getenv('FILE_STORAGE_ALLOWED_TYPES', ["image/jpeg", "image/png"])

# Cloudflare R2 configuration (fill in after creating R2 bucket)
R2_ACCOUNT_ID = os.getenv('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID', '')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET = os.getenv('R2_BUCKET', 'ziggner-media')
R2_PUBLIC_URL = os.getenv('R2_PUBLIC_URL', '')  # e.g. https://cdn.ziggner.com

# ============================================================
# HSTS 与 HTTPS 安全配置（仅生产环境）
# ============================================================
SECURE_HSTS_SECONDS = 31536000  # 1 年
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = False  # Disabled for local Docker testing (was True)
# ⚠️ 安全说明: SECURE_SSL_REDIRECT = False 时，请确保 Nginx / 反向代理层
# 强制 HTTP→HTTPS 重定向。参考配置:
#   server { listen 80; return 301 https://$host$request_uri; }
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # F-005 修复: Nginx 反向代理 SSL
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'