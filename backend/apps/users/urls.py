from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from apps.users.tokens import StampTokenObtainPairView
from apps.users.views import (
    AdminLoginCodeView,
    AdminLoginView,
    AdminEmailVerifyView,
    AvatarUploadView,
    ChangeUsernameView,
    ChangePasswordView,
    DeactivateView,
    EmailVerifyCheckView,
    EmailVerifySendView,
    LogoutView,
    RegisterView,
    SendEmailCodeView,
    UserMeView,
    UserProfileView,
    VerifyEmailCodeView,
)
from apps.users.social_views import (
    SocialLoginView,
    SocialProvidersView,
    SetPasswordView,
    SocialUnlinkView,
    SocialAccountsView,
)
from apps.users.admin_email_template import (
    EmailTemplateListView,
    EmailTemplateResetView,
    EmailTemplateUpdateView,
)
from apps.users.session_auth import (
    BrowserLoginView,
    BrowserLogoutView,
    BrowserRefreshView,
    CSRFCookieView,
)

urlpatterns = [
    path('session/csrf/', CSRFCookieView.as_view(), name='browser-csrf'),
    path('session/login/', BrowserLoginView.as_view(), name='browser-login'),
    path('session/refresh/', BrowserRefreshView.as_view(), name='browser-refresh'),
    path('session/logout/', BrowserLogoutView.as_view(), name='browser-logout'),
    path('token/', StampTokenObtainPairView.as_view(), name='bearer-token'),
    path('token/refresh/', TokenRefreshView.as_view(), name='bearer-token-refresh'),
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
    path('password/', ChangePasswordView.as_view(), name='user-change-password'),
    path('upload-avatar/', AvatarUploadView.as_view(), name='avatar-upload'),

    # 邮箱验证码
    path('email/send/', SendEmailCodeView.as_view(), name='email-send'),
    path('email/verify/', VerifyEmailCodeView.as_view(), name='email-verify'),
    # 管理员欢迎邮件「邮箱验证链接」公开端点（JWT 令牌，无需登录）
    path('email/admin-verify/', AdminEmailVerifyView.as_view(), name='email-admin-verify'),

    # 邮箱验证码（独立流程）
    path('email/verify/send/', EmailVerifySendView.as_view(), name='email-verify-send'),
    path('email/verify/check/', EmailVerifyCheckView.as_view(), name='email-verify-check'),

    # 第三方登录 (Social OAuth)
    path('social/login/', SocialLoginView.as_view(), name='social-login'),
    path('social/providers/', SocialProvidersView.as_view(), name='social-providers'),
    path('social/set-password/', SetPasswordView.as_view(), name='social-set-password'),

    # 邮件模板管理（管理后台）
    path('email/templates/', EmailTemplateListView.as_view(), name='email-template-list'),
    path('email/templates/<str:template_type>/', EmailTemplateUpdateView.as_view(), name='email-template-update'),
    path('email/templates/<str:template_type>/reset/', EmailTemplateResetView.as_view(), name='email-template-reset'),
    path('social/unlink/', SocialUnlinkView.as_view(), name='social-unlink'),
    path('social/accounts/', SocialAccountsView.as_view(), name='social-accounts'),
]
