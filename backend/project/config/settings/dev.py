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
