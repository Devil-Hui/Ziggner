from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from apps.users.views import (
    AdminLoginCodeView,
    AdminLoginView,
    AvatarUploadView,
    ChangeUsernameView,
    DeactivateView,
    EmailVerifyCheckView,
    EmailVerifySendView,
    LogoutView,
    RegisterView,
    SendEmailCodeView,
    SendSMSCodeView,
    UserMeView,
    UserProfileView,
    VerifyEmailCodeView,
    VerifySMSCodeView,
)
from apps.users.social_views import (
    SocialLoginView,
    SocialProvidersView,
    SetPasswordView,
    SocialUnlinkView,
    SocialAccountsView,
)

urlpatterns = [
    # 认证
    path('register/', RegisterView.as_view(), name='user-register'),
    path('login/', AdminLoginView.as_view(), name='admin-login'),  # 邮箱验证码管理员登录
    path('login/code/send/', AdminLoginCodeView.as_view(), name='admin-login-code-send'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='user-logout'),
    path('deactivate/', DeactivateView.as_view(), name='user-deactivate'),

    # Profile
    path('me/', UserMeView.as_view(), name='user-me'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('username/', ChangeUsernameView.as_view(), name='user-change-username'),
    path('upload-avatar/', AvatarUploadView.as_view(), name='avatar-upload'),

    # 短信验证码
    path('sms/send/', SendSMSCodeView.as_view(), name='sms-send'),
    path('sms/verify/', VerifySMSCodeView.as_view(), name='sms-verify'),

    # 邮箱验证码
    path('email/send/', SendEmailCodeView.as_view(), name='email-send'),
    path('email/verify/', VerifyEmailCodeView.as_view(), name='email-verify'),

    # 邮箱验证码（独立流程）
    path('email/verify/send/', EmailVerifySendView.as_view(), name='email-verify-send'),
    path('email/verify/check/', EmailVerifyCheckView.as_view(), name='email-verify-check'),

    # 第三方登录 (Social OAuth)
    path('social/login/', SocialLoginView.as_view(), name='social-login'),
    path('social/providers/', SocialProvidersView.as_view(), name='social-providers'),
    path('social/set-password/', SetPasswordView.as_view(), name='social-set-password'),
    path('social/unlink/', SocialUnlinkView.as_view(), name='social-unlink'),
    path('social/accounts/', SocialAccountsView.as_view(), name='social-accounts'),
]
