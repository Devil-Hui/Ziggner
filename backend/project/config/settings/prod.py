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

# JWT Token 有效期（生产环境 15min access / 2h refresh 空闲超时）
SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = datetime.timedelta(minutes=15)
SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'] = datetime.timedelta(hours=2)

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
# 公网媒体域名（本地存储时上传返回公网 URL，根治回环地址 Mixed Content；R2 模式下用 R2_PUBLIC_URL）
PUBLIC_MEDIA_URL = os.getenv('PUBLIC_MEDIA_URL', '')
FILE_STORAGE_MAX_SIZE = os.getenv('FILE_STORAGE_MAX_SIZE', 5)  # 5MB
FILE_STORAGE_ALLOWED_TYPES = os.getenv('FILE_STORAGE_ALLOWED_TYPES', ["image/jpeg", "image/png", "image/webp"])

# Cloudflare R2 configuration (fill in after creating R2 bucket)
R2_ACCOUNT_ID = os.getenv('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID', '')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET = os.getenv('R2_BUCKET', '')
R2_PUBLIC_URL = os.getenv('R2_PUBLIC_URL', '')  # e.g. https://cdn.ziggner.com

# ── R2 对象存储（凭据齐全时启用；否则回退本地磁盘）──
if R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET:
    STORAGES['default']['BACKEND'] = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = R2_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY = R2_SECRET_ACCESS_KEY
    AWS_STORAGE_BUCKET_NAME = R2_BUCKET
    AWS_S3_ENDPOINT_URL = f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com'
    AWS_S3_REGION_NAME = 'auto'
    # 全仓所有上传均使用 utils.storage.media_key（UUID 唯一名，含日期分区），
    # 同名覆盖概率为零。置 True 后 Django 直接 _save 不再调用 get_available_name →
    # 跳过 exists()/head_object 探测链，根治 django-storages 在 R2 上偶发的
    # RecursionError(maximum recursion depth exceeded) 导致的「上传 500」。
    AWS_S3_FILE_OVERWRITE = True
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
# 跨子域会话：csrftoken / sessionid cookie 落在父域 .ziggner.com，
# 使 admin/www/shop 页面都能读到 csrftoken 并随 axios 写请求回传（否则 host-only cookie 读不到 → 403 CSRF Failed）
CSRF_COOKIE_DOMAIN = '.ziggner.com'
SESSION_COOKIE_DOMAIN = '.ziggner.com'
# 跨子域会话：admin/www/shop/api 子域之间的 CSRF 校验来源
CSRF_TRUSTED_ORIGINS = [
    'https://www.ziggner.com',
    'https://admin.ziggner.com',
    'https://shop.ziggner.com',
    'https://api.ziggner.com',
    'https://ziggner.huigeli666.workers.dev',
]
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# ============================================================
# 请求体 / 上传大小护栏（2C4G：防止超大请求体常驻单 gunicorn worker 内存）
# ============================================================
# 请求体超过此阈值即流式写入临时文件而非常驻内存；同时也是业务层大文件拒绝前的
# 第一道内存闸门（与 prod 的 FILE_STORAGE_MAX_SIZE 业务上限互补）。
DATA_UPLOAD_MAX_MEMORY_SIZE = int(
    os.getenv('DATA_UPLOAD_MAX_MEMORY_SIZE', str(2 * 1024 * 1024))
)  # 2MB
# 单个上传文件超过此值才落盘，其余在内存处理。
FILE_UPLOAD_MAX_MEMORY_SIZE = int(
    os.getenv('FILE_UPLOAD_MAX_MEMORY_SIZE', str(2 * 1024 * 1024))
)  # 2MB
# 限制 GET/POST 参数字段总数，防御超大量表单/查询参数注入打满解析内存。
DATA_UPLOAD_MAX_NUMBER_FIELDS = int(
    os.getenv('DATA_UPLOAD_MAX_NUMBER_FIELDS', '1024')
)

# ============================================================
# gevent 协程下数据库连接隔离（修复「DatabaseWrapper ... was created in thread ...
# this is thread」500 + 跨协程连接污染）
# ============================================================
# 背景：gunicorn 使用 gevent worker 时，单个 worker 进程内所有协程（greenlet）
# 共享同一个 OS 线程；而 Django 的数据库连接是按「线程」隔离的（threading.local）。
# 这带来两个问题：
#   1) 不同协程共享同一个连接对象，存在并发污染风险；
#   2) 连接在协程 A 创建、在协程 B 关闭时，Django 的 validate_thread_sharing()
#      误报线程不一致，导致所有写操作（register / checkout / 订单等）500。
# 修复：将连接隔离单元从「线程」改为「协程（greenlet）」，使每个协程独占一条连接。
# 这样既消除误报，又避免连接被多协程共享。gevent 未启用时退化为 threading.local，
# 无任何副作用；且不引入新依赖、不改变 gevent worker 架构与 2C4G 内存预算。
try:
    from gevent.local import local as _ConnectionIsolationLocal
except Exception:  # pragma: no cover - 无 gevent 时退化为线程隔离
    from threading import local as _ConnectionIsolationLocal

from django.db import connections as _db_connections

if getattr(_db_connections, '_connections', None) is not None:
    # 用 greenlet-local 替换线程级连接容器，确保每条协程拥有独立连接。
    _db_connections._connections = _ConnectionIsolationLocal()
