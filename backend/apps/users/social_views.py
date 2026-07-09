"""
Social OAuth authentication views.
Handles token verification, user creation, and password setup for social login.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.social_auth import SocialAuthService
from utils.api_base_view import PublicApiView, BaseApiView

logger = logging.getLogger('biz')
User = get_user_model()


class SocialLoginView(PublicApiView):
    """第三方登录 — 验证access_token后返回JWT"""

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Social login success with JWT tokens')}
    )
    def post(self, request):
        provider = request.data.get('provider', '').strip().lower()
        access_token = request.data.get('access_token', '').strip()

        if provider not in ('google', 'facebook'):
            return Response(
                {'detail': '不支持的登录方式。支持的提供商: google, facebook'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not access_token:
            return Response(
                {'detail': 'access_token 不能为空'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_info = SocialAuthService.verify_token(provider, access_token)
        except Exception as e:
            logger.warning(f'Social auth token verification failed: provider={provider} error={e}')
            return Response(
                {'detail': 'Token 验证失败，请重新尝试登录'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user, is_new = SocialAuthService.get_or_create_user(provider, user_info)

        # Generate JWT
        refresh = RefreshToken.for_user(user)

        result = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email or '',
            },
            'is_new_user': is_new,
            'needs_password_setup': is_new,  # New users must set a password
        }

        if is_new:
            result['message'] = '首次登录成功，请设置密码'

        return Response(result, status=status.HTTP_200_OK)


class SocialProvidersView(PublicApiView):
    """返回已配置的社交登录提供商列表"""

    @extend_schema(responses={200: OpenApiResponse(description='Available social login providers')})
    def get(self, request):
        providers = []
        for p in ('google', 'facebook'):
            client_id_key = f'SOCIAL_AUTH_{p.upper()}_CLIENT_ID'
            if p == 'facebook':
                client_id_key = 'SOCIAL_AUTH_FACEBOOK_APP_ID'
            client_id = getattr(settings, client_id_key, '')
            providers.append({
                'provider': p,
                'name': p.capitalize(),
                'configured': bool(client_id),
                'auth_url': self._get_auth_url(p, client_id) if client_id else None,
                'client_id': client_id if client_id else None,
            })
        return Response({'providers': providers})

    def _get_auth_url(self, provider, client_id):
        base = getattr(settings, 'SOCIAL_AUTH_REDIRECT_BASE', 'http://localhost:5173')
        redirect_uri = f'{base}/auth/social/callback'
        urls = {
            'google': (
                f'https://accounts.google.com/o/oauth2/v2/auth'
                f'?client_id={client_id}'
                f'&redirect_uri={redirect_uri}'
                f'&response_type=code'
                f'&scope=openid%20email%20profile'
                f'&access_type=offline'
            ),
            'facebook': (
                f'https://www.facebook.com/v12.0/dialog/oauth'
                f'?client_id={client_id}'
                f'&redirect_uri={redirect_uri}'
                f'&response_type=code'
                f'&scope=email%2Cpublic_profile'
            ),
        }
        return urls.get(provider, '')


class SetPasswordView(BaseApiView):
    """首次登录设置密码（仅允许 password 为空的用户）"""

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Password set successfully')}
    )
    def post(self, request):
        user = request.user
        new_password = request.data.get('password', '').strip()

        if not new_password:
            return Response(
                {'detail': '密码不能为空'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 6:
            return Response(
                {'detail': '密码长度不能少于6位'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user already has a password set
        if user.password and not user.has_usable_password():
            pass  # unusable password — allow reset
        elif user.password:
            return Response(
                {'detail': '您已设置过密码，如需修改请在个人中心操作'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        logger.info(f'Password set for user_id={user.id} after social login')
        return Response({'detail': '密码设置成功'}, status=status.HTTP_200_OK)


class SocialUnlinkView(BaseApiView):
    """解绑社交账号"""

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='Social account unlinked')}
    )
    def post(self, request):
        provider = request.data.get('provider', '').strip().lower()
        if provider not in ('google', 'facebook'):
            return Response({'detail': '不支持的提供商'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.users.models import SocialAccount
        deleted, _ = SocialAccount.objects.filter(
            user=request.user, provider=provider
        ).delete()

        if deleted:
            return Response({'detail': f'{provider} 账号已解绑'})
        return Response({'detail': '未找到绑定的账号'}, status=status.HTTP_404_NOT_FOUND)


class SocialAccountsView(BaseApiView):
    """获取当前用户已绑定的社交账号列表"""

    @extend_schema(responses={200: OpenApiResponse(description='Bound social accounts')})
    def get(self, request):
        from apps.users.models import SocialAccount
        accounts = SocialAccount.objects.filter(user=request.user).values(
            'provider', 'created_at', 'extra_data',
        )
        return Response({'accounts': list(accounts)})
