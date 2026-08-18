from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from logging import getLogger
from rest_framework import exceptions

from rest_framework.authentication import get_authorization_header
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model

from utils.exceptions import AuthException, ErrorCodes


User = get_user_model()
logger = getLogger(__name__)


class UsersJWTAuthentication(JWTAuthentication):
    """JWT认证使用users表进行认证

    - API请求使用users表进行JWT认证
    - Admin后台仍然使用auth_user表进行认证
    - 安全戳校验：令牌签发时的 stamp 与 DB 当前 stamp 不一致 → 401 REAUTH_REQUIRED
    """

    def get_user(self, validated_token):
        """Override get_user to use users table"""
        # 惰性导入，打破与 apps.users.tokens 的循环依赖：
        # tokens 顶层导入 rest_framework_simplejwt.views 会触发 DRF 设置加载，
        # 进而导入本模块；若此处也顶层导入 tokens 则形成环。
        from apps.users.tokens import STAMP_CLAIM, get_db_stamp

        try:
            logger.debug(f'Validated token: {validated_token}')
            user_id = validated_token.get('user_id')
            if not user_id:
                raise InvalidToken('无效的token: 缺少user_id')

            # select_related('profile') 零额外成本（本就查 User），同时供安全戳比对复用
            user = User.objects.select_related('profile').filter(id=user_id, is_active=True).first()
            if not user:
                raise InvalidToken('用户不存在或已禁用')

            # 安全戳校验（灰度兼容：仅当令牌携带 stamp claim 时才强制比对；
            # 部署前签发的旧令牌无 stamp claim，保持原行为不强制失效）
            token_stamp = validated_token.get(STAMP_CLAIM)
            if token_stamp is not None:
                db_stamp = get_db_stamp(user)
                if db_stamp is None or db_stamp != token_stamp:
                    logger.info(
                        '[security_stamp] mismatch user_id=%s → REAUTH_REQUIRED', user_id
                    )
                    raise AuthException(ErrorCodes.REAUTH_REQUIRED)

            return user
        except AuthException:
            raise
        except Exception as e:
            logger.error(f'JWT authentication error: {str(e)}')
            raise InvalidToken('认证失败')

    def get_header(self, request):
        """
        Extracts the header containing the JSON web token from the given
        request.
        """
        header = get_authorization_header(request)
        logger.debug(f'Get authorization header: {header}')

        if not header:
            return None

        auth_header = header.decode('utf-8')
        auth_header_prefix = api_settings.AUTH_HEADER_TYPES[0].lower()

        if not auth_header.lower().startswith(auth_header_prefix.lower()):
            return None

        return auth_header

    def get_raw_token(self, header):
        """
        Extracts an unvalidated JSON web token from the given "Authorization"
        header value.
        """
        parts = header.split()

        logger.debug(f'get_raw_token', parts)

        if len(parts) == 0:
            return None

        if parts[0].lower() not in [t.lower() for t in api_settings.AUTH_HEADER_TYPES]:
            return None

        if len(parts) != 2:
            raise exceptions.AuthenticationFailed(
                'Authorization header must contain two space-delimited values',
                code='bad_authorization_header',
            )

        return parts[1]
