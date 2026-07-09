from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from logging import getLogger
from rest_framework import exceptions

from rest_framework.authentication import get_authorization_header
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model


User = get_user_model()
logger = getLogger(__name__)


class UsersJWTAuthentication(JWTAuthentication):
    """JWT认证使用users表进行认证

    - API请求使用users表进行JWT认证
    - Admin后台仍然使用auth_user表进行认证
    """

    def get_user(self, validated_token):
        """Override get_user to use users table"""
        try:
            logger.debug(f'Validated token: {validated_token}')
            user_id = validated_token.get('user_id')
            if not user_id:
                raise InvalidToken('无效的token: 缺少user_id')

            user = User.objects.filter(id=user_id, is_active=True).first()
            if not user:
                raise InvalidToken('用户不存在或已禁用')

            return user
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
