from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.users.models import UserProfile, validate_country_code, validate_phone
from apps.users.email_service import EmailService
from apps.users.validators import validate_username, validate_email, validate_password

User = get_user_model()
_cfg = getattr(settings, 'USERS_SETTINGS', {})


# ============================================================
# 注册
# ============================================================

class RegisterSerializer(serializers.Serializer):
    """
    用户注册 —— 邮箱验证。

    邮箱流程（三阶段）:
      1. POST /email/send/       → 获取验证码
      2. POST /email/verify/     → 校验验证码，获得 verification_token
      3. POST /register/         → 携带 verification_token 完成注册

    用户名 / 密码校验复用 apps.users.validators 的共用规则，
    与「新增管理员」创建端保持一致（避免规则漂移）。
    """
    username = serializers.CharField(
        required=True,
        validators=[validate_username],
        help_text='Username, 4-32 chars: letters, digits, _ or -.',
    )
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        help_text='Password, ≥8 chars with uppercase, lowercase, and digit/special char.',
    )
    country_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10,
        help_text='Country calling code, e.g. +86.',
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20,
        help_text='Phone number without country code.',
    )
    # 邮箱流程：邮箱验证令牌（二选一）
    verification_token = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        write_only=True,
        help_text='Email verification token from POST /email/verify/.',
    )

    def validate_username(self, value):
        return validate_username(value)

    def validate_password(self, value):
        return validate_password(value)

    def validate_country_code(self, value):
        if value:
            validate_country_code(value)
        return value

    def validate_phone(self, value):
        value = value.strip() if value else ''
        if value:
            validate_phone(value)
        return value

    def validate(self, data):
        """跨字段校验：verify_id 注入的已验证邮箱优先，否则需邮箱验证令牌"""
        # 两步流程：视图已用 verify_id+code 校验并注入已验证邮箱，直接采用
        verified_email = self.context.get('verified_email')
        if verified_email:
            data['_verified_email'] = verified_email
            return data

        token = data.get('verification_token', '')
        if not token:
            raise serializers.ValidationError({
                'verification_token': 'Email verification token is required.',
            })

        # 邮箱流程：解码验证令牌获取邮箱
        try:
            data['_verified_email'] = EmailService.decode_verification_token(token)
        except ValueError as e:
            raise serializers.ValidationError({
                'verification_token': str(e),
            })

        return data


# ============================================================
# 管理员创建（超管开通管理员账号）
# ============================================================

class AdminCreateSerializer(serializers.Serializer):
    """
    超管创建管理员账号的请求体校验。

    字段级格式校验复用 apps.users.validators 的共用规则；
    唯一性（username/email/phone）由 UserService.create_user 在事务内校验，
    冲突时抛 ValueError（USERNAME_EXISTS / EMAIL_EXISTS / PHONE_EXISTS）。

    字段 → 错误码映射在 AdminUserCreateView 中完成：
      username    → USERNAME_INVALID
      password    → PASSWORD_WEAK
      email       → EMAIL_INVALID（缺失或格式不合法）
      first_name  → NAME_REQUIRED
      last_name   → NAME_REQUIRED
      role        → ROLE_INVALID
      phone / country_code → PHONE_INVALID
    """
    username = serializers.CharField(
        required=True,
        validators=[validate_username],
        help_text='Login username, 4-32 chars.',
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        help_text='Login password, ≥8 chars.',
    )
    email = serializers.CharField(
        required=True,
        allow_blank=False,
        validators=[validate_email],
        help_text='Email (required, unique, case-insensitive).',
    )
    first_name = serializers.CharField(
        required=True,
        allow_blank=False,
        help_text='Real first name.',
    )
    last_name = serializers.CharField(
        required=True,
        allow_blank=False,
        help_text='Real last name.',
    )
    role = serializers.ChoiceField(
        required=True,
        choices=[
            ('superadmin', '超级管理员'),
            ('ops', '运维'),
            ('admin_leader', '管理组组长'),
            ('admin_member', '管理组组员'),
        ],
        help_text='Initial role: superadmin / ops / admin_leader / admin_member.',
    )
    country_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10,
        validators=[validate_country_code],
        help_text='Country calling code, e.g. +86.',
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20,
        validators=[validate_phone],
        help_text='Phone number without country code.',
    )
    department = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
        help_text='Department (optional).',
    )
    is_active = serializers.BooleanField(
        required=False,
        default=True,
        help_text='Whether the account is active on creation (default true).',
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Note (optional, stored only).',
    )
    locale = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10,
        default='zh-CN',
        help_text='Locale preference (optional, stored only).',
    )

    def validate(self, data):
        """跨字段校验：country_code / phone 需成对出现（PHONE_INVALID）。"""
        country_code = data.get('country_code') or ''
        phone = (data.get('phone') or '').strip()
        if bool(country_code) != bool(phone):
            raise serializers.ValidationError({
                'phone': '区号与手机号须同时填写或同时留空',
            })
        # 归一化 email 小写（唯一性比较与存储保持一致）
        if data.get('email'):
            data['email'] = data['email'].strip().lower()
        return data


# ============================================================
# 登录 —— 由 SimpleJWT TokenObtainPairView 处理，此处不自定义
# ============================================================


# ============================================================
# 登出
# ============================================================

class LogoutSerializer(serializers.Serializer):
    """登出 —— 需要 refresh token 以加入黑名单"""
    refresh = serializers.CharField(
        help_text='Refresh token to blacklist.',
    )


# ============================================================
# Profile
# ============================================================

class UserProfileSerializer(serializers.ModelSerializer):
    """用户扩展信息（只读）"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_phone = serializers.CharField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'country_code', 'phone',
            'full_phone', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """更新区号 / 手机号"""

    class Meta:
        model = UserProfile
        fields = ['country_code', 'phone']

    def validate_country_code(self, value):
        if value:
            validate_country_code(value)
        return value

    def validate_phone(self, value):
        value = value.strip() if value else ''
        if value:
            validate_phone(value)
        return value


# ============================================================
# 修改用户名
# ============================================================

class ChangeUsernameSerializer(serializers.Serializer):
    """修改用户名 —— 格式校验；唯一性由 service 层处理"""
    username = serializers.CharField(
        min_length=_cfg.get('USERNAME_MIN_LENGTH', 3),
        max_length=_cfg.get('USERNAME_MAX_LENGTH', 15),
        help_text='New username, 3-15 characters.',
    )

    def validate_username(self, value):
        # 格式校验在此；唯一性由 service 层返回 409
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """修改密码 —— 需旧密码校验，新密码需确认"""
    old_password = serializers.CharField(write_only=True, help_text='Current password.')
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        help_text='New password, 8-128 chars.',
    )
    confirm_password = serializers.CharField(write_only=True, help_text='Repeat new password.')

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': '两次输入的新密码不一致'})
        return attrs



# ============================================================
# 邮箱验证码
# ============================================================

class SendEmailCodeSerializer(serializers.Serializer):
    """发送邮箱验证码 —— 需先通过图片验证码"""
    email = serializers.EmailField(help_text='Email address.')
    captcha_id = serializers.CharField(
        max_length=20,
        help_text='Captcha ID from GET /api/users/captcha/.',
    )
    captcha_text = serializers.CharField(
        max_length=6,
        help_text='Captcha text from image.',
    )

    def validate(self, data):
        from apps.users.captcha_service import CaptchaService
        if not CaptchaService.verify(data['captcha_id'], data['captcha_text']):
            raise serializers.ValidationError({
                'captcha_text': 'Invalid or expired captcha.',
            })
        return data


class VerifyEmailCodeSerializer(serializers.Serializer):
    """校验邮箱验证码"""
    email = serializers.EmailField()
    code = serializers.CharField(
        min_length=_cfg.get('VERIFICATION_CODE_LENGTH', 6),
        max_length=_cfg.get('VERIFICATION_CODE_LENGTH', 6),
    )
