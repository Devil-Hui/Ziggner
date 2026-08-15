from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework import exceptions, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.turnstile import TurnstileUnavailable, verify_turnstile
from utils.api_jwt_authentication import UsersJWTAuthentication
from utils.exceptions import ClientException, ErrorCodes, ServerException


ACCESS_COOKIE = 'ziggner_access'
REFRESH_COOKIE = 'ziggner_refresh'


def _cookie_kwargs():
    kwargs = {
        'httponly': True,
        'secure': settings.SESSION_COOKIE_SECURE,
        'samesite': settings.SESSION_COOKIE_SAMESITE,
        'path': '/',
    }
    # 与 csrftoken 保持一致，落到父域 .ziggner.com，跨子域（admin/www/shop → api）自动携带
    domain = getattr(settings, 'CSRF_COOKIE_DOMAIN', None)
    if domain:
        kwargs['domain'] = domain
    return kwargs


def set_auth_cookies(response, refresh):
    response.set_cookie(
        ACCESS_COOKIE,
        str(refresh.access_token),
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        **_cookie_kwargs(),
    )
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        **_cookie_kwargs(),
    )


def clear_auth_cookies(response):
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        kwargs = {'path': '/', 'samesite': settings.SESSION_COOKIE_SAMESITE}
        domain = getattr(settings, 'CSRF_COOKIE_DOMAIN', None)
        if domain:
            kwargs['domain'] = domain
        response.delete_cookie(name, **kwargs)


class CookieJWTAuthentication(UsersJWTAuthentication):
    """Authenticate browser requests from HttpOnly cookies with CSRF checks."""

    def authenticate(self, request):
        if self.get_header(request) is not None:
            return None
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if not raw_token:
            return None
        validated_token = self.get_validated_token(raw_token)
        SessionAuthentication().enforce_csrf(request)
        return self.get_user(validated_token), validated_token


class CSRFCookieView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        get_token(request)
        return Response({'csrf_ready': True}, status=status.HTTP_200_OK)


class BrowserLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        SessionAuthentication().enforce_csrf(request)
        turnstile_token = request.data.get('turnstile_token', '')
        if not turnstile_token:
            raise ClientException(ErrorCodes.TURNSTILE_REQUIRED)
        try:
            verified = verify_turnstile(turnstile_token)
        except TurnstileUnavailable as exc:
            raise ServerException(ErrorCodes.TURNSTILE_UNAVAILABLE) from exc
        if not verified:
            raise ClientException(ErrorCodes.TURNSTILE_INVALID)

        raw_login = request.data.get('username', '')
        password = request.data.get('password', '')
        # 支持邮箱登录：输入含 @ 时按 email 解析真实 username（占位符标注为 Email）
        login_id = raw_login
        if '@' in login_id:
            from django.contrib.auth import get_user_model
            U = get_user_model()
            user = U.objects.filter(email__iexact=login_id).only('username').first()
            if user:
                login_id = user.username
        serializer = TokenObtainPairSerializer(data={
            'username': login_id,
            'password': password,
        })
        serializer.is_valid(raise_exception=True)
        refresh = RefreshToken(serializer.validated_data['refresh'])
        response = Response({'authenticated': True})
        set_auth_cookies(response, refresh)
        return response


class BrowserRefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        SessionAuthentication().enforce_csrf(request)
        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not raw_refresh:
            raise exceptions.AuthenticationFailed('Refresh cookie is missing.')
        refresh = RefreshToken(raw_refresh)
        response = Response({'authenticated': True})
        set_auth_cookies(response, refresh)
        return response


class BrowserLogoutView(APIView):
    authentication_classes = [CookieJWTAuthentication]

    def post(self, request):
        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except AttributeError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response
