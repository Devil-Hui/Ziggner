from .base import *  # 继承 base.py

DEBUG = True

# ⚠️ 开发环境跳过 SSL 证书验证，SESSION_COOKIE_SECURE/CSRF_COOKIE_SECURE 使用默认值 False
EMAIL_BACKEND = 'utils.smtp_backend.DevEmailBackend'

ALLOWED_HOSTS = [
    '127.0.0.1',
    '172.20.10.2',
    'localhost',
    'testserver',
    'web',
    'django-app',
    'host.docker.internal',
    # 本机即生产源站：允许 Cloudflare Tunnel 公网域名访问
    'api.ziggner.com',
    'ziggner.com',
    'www.ziggner.com',
    '.trycloudflare.com',
]
ALLOWED_HOSTS.extend(
    host.strip()
    for host in os.getenv('DJANGO_DEV_ALLOWED_HOSTS', '').split(',')
    if host.strip()
)

# ============================================================
# CORS / CSRF —— 本机即生产源站时需支持公网跨子域访问
# （docker-compose.yml 用 DJANGO_ENV=dev，但通过 Cloudflare Tunnel 暴露公网，
#  base.py 的 CORS_ALLOWED_ORIGINS 仅含 localhost，浏览器跨域 POST 会被拦截）
# ============================================================

# CORS：优先从环境变量读取（.env 的 CORS_ORIGINS），未配置时回退本地开发默认值
_cors_env = os.getenv('CORS_ORIGINS', '')
if _cors_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8001",
    ]
# 允许跨域携带 Cookie（axios withCredentials: true 需要此配置）
CORS_ALLOW_CREDENTIALS = True

# CSRF 跨域信任：admin/www/shop → api 子域的 POST 请求需要
CSRF_TRUSTED_ORIGINS = [
    origin for origin in CORS_ALLOWED_ORIGINS
    if origin.startswith('https://')
]

# 跨子域 Cookie：公网域名场景下 csrftoken/sessionid 落在父域 .ziggner.com，
# 使 admin/www/shop 前端能从 document.cookie 读取 csrftoken 并随 axios 写请求回传
# （否则 host-only cookie 仅 api.ziggner.com 可读，前端域拿不到 → X-CSRFToken 头缺失 → 403）
# 本地 localhost 开发：在 .env 设 COOKIE_DOMAIN=（空）→ 使用 host-only cookie，
# 浏览器才能在 localhost 上存储并回传 CSRF/鉴权 cookie（跨域 .ziggner.com cookie 会被拒绝）。
_COOKIE_DOMAIN = os.getenv('COOKIE_DOMAIN', '.ziggner.com' if '.ziggner.com' in (os.getenv('DOMAIN', '') or '') else '')
if _COOKIE_DOMAIN:
    CSRF_COOKIE_DOMAIN = _COOKIE_DOMAIN
    SESSION_COOKIE_DOMAIN = _COOKIE_DOMAIN
    CSRF_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SAMESITE = 'Lax'
    # nginx-tunnel 已设 X-Forwarded-Proto: https，信任该头以正确识别 HTTPS
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, "static")

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timezone.timedelta(days=9999),  # ⚠️ 仅限本地开发！生产环境由 prod.py 覆盖为 15 分钟
    'REFRESH_TOKEN_LIFETIME': timezone.timedelta(days=9999),  # ⚠️ 仅限本地开发！生产环境由 prod.py 覆盖为 7 天
    'ROTATE_REFRESH_TOKENS': False,  # 开发环境不轮换刷新令牌，避免并发竞态导致黑名单
    'BLACKLIST_AFTER_ROTATION': False,  # 开发环境禁用黑名单，防止页面刷新后 token 丢失
    'UPDATE_LAST_LOGIN': True,  # 更新用户最后登录时间
    'ALGORITHM': 'HS256',  # 使用的加密算法
    'SIGNING_KEY': SECRET_KEY,  # 签名密钥，使用Django的SECRET_KEY
    'VERIFYING_KEY': None,  # 验证密钥，使用对称加密时为None
    'AUTH_HEADER_TYPES': ('Bearer',),  # 认证头类型
    'AUTH_HEADER_NAME': 'Authorization',  # 认证头名称
    'USER_ID_FIELD': 'id',  # 用户模型中用作用户ID的字段
    'USER_ID_CLAIM': 'user_id',  # token中用户ID的声明名称
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',  # JWT ID声明，用于防止重放攻击
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timezone.timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timezone.timedelta(days=1),
}

# 文件存储配置
FILE_STORAGE = os.getenv('FILE_STORAGE', 'local')  # 可选 'local' 或 'tencent'
MEDIA_PATH = os.getenv('MEDIA_PATH', 'media') or 'media'
MEDIA_URL = f"/{MEDIA_PATH.strip('/')}/"
MEDIA_ROOT = os.path.join(BASE_DIR, MEDIA_PATH)
FILE_STORAGE_MAX_SIZE = os.getenv('FILE_STORAGE_MAX_SIZE', 5)  # 5MB
FILE_STORAGE_ALLOWED_TYPES = os.getenv('FILE_STORAGE_ALLOWED_TYPES', "image/jpeg,image/png").split(',')
