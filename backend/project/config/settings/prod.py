from .base import *  # 继承 base.py
import os, datetime

# 生产环境关闭 DEBUG
DEBUG = False

# 生产环境日志级别：WARNING（减少 IO，仅记录警告和错误）
LOG_LEVEL = os.getenv('LOG_LEVEL', 'WARNING')
# 覆盖 base.py 中已创建的 LOGGING 配置（base.py 在导入时已用 DEBUG 级别固化）
for _logger_name in ('django', 'django.request', 'celery', 'celery.task', 'celery.worker', 'celery.beat'):
    if _logger_name in LOGGING.get('loggers', {}):
        LOGGING['loggers'][_logger_name]['level'] = LOG_LEVEL

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

# ── R2 对象存储（凭据齐全时启用；否则回退本地磁盘）──
if R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET:
    STORAGES['default']['BACKEND'] = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = R2_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY = R2_SECRET_ACCESS_KEY
    AWS_STORAGE_BUCKET_NAME = R2_BUCKET
    AWS_S3_ENDPOINT_URL = f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com'
    AWS_S3_REGION_NAME = 'auto'
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None
    if R2_PUBLIC_URL:
        AWS_S3_CUSTOM_DOMAIN = R2_PUBLIC_URL.replace('https://', '').replace('http://', '').rstrip('/')
        MEDIA_URL = f'{R2_PUBLIC_URL.rstrip(chr(47))}/{MEDIA_PATH.strip(chr(47))}/'


# ============================================================
# HSTS 与 HTTPS 安全配置（仅生产环境）
# ============================================================
SECURE_HSTS_SECONDS = 31536000  # 1 年
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
# ⚠️ 安全说明: SECURE_SSL_REDIRECT = False 时，请确保 Nginx / 反向代理层
# 强制 HTTP→HTTPS 重定向。参考配置:
#   server { listen 80; return 301 https://$host$request_uri; }
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # F-005 修复: Nginx 反向代理 SSL
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
