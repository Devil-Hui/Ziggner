import re

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.users.models import UserProfile, validate_country_code, validate_phone
from apps.users.email_service import EmailService
from apps.users.sms_service import SMSService

User = get_user_model()
_cfg = getattr(settings, 'USERS_SETTINGS', {})


# ============================================================
# 密码强度校验
# ============================================================

def _validate_password_strength(value):
    """密码必须包含大写字母、小写字母和数字"""
    errors = []
    if _cfg.get('PASSWORD_REQUIRE_UPPER', True):
        if not re.search(r'[A-Z]', value):
            errors.append('uppercase letter')
    if _cfg.get('PASSWORD_REQUIRE_LOWER', True):
        if not re.search(r'[a-z]', value):
            errors.append('lowercase letter')
    if _cfg.get('PASSWORD_REQUIRE_DIGIT', True):
        if not re.search(r'\d', value):
            errors.append('digit')

    if errors:
        raise serializers.ValidationError(
            f'Password must contain at least one {", ".join(errors)}.'
        )
    return value


# ============================================================
# 注册
# ============================================================

class RegisterSerializer(serializers.Serializer):
    """
    用户注册 —— 邮箱或手机二选一。

    邮箱流程（三阶段）:
      1. POST /email/send/       → 获取验证码
      2. POST /email/verify/     → 校验验证码，获得 verification_token
      3. POST /register/         → 携带 verification_token 完成注册

    手机流程（两阶段）:
      1. POST /sms/send/         → 获取验证码
      2. POST /register/         → 携带 verification_code 完成注册
    """
    username = serializers.CharField(
        min_length=_cfg.get('USERNAME_MIN_LENGTH', 3),
        max_length=_cfg.get('USERNAME_MAX_LENGTH', 15),
        help_text='Username, 3-15 characters.',
    )
    password = serializers.CharField(
        min_length=_cfg.get('PASSWORD_MIN_LENGTH', 6),
        max_length=_cfg.get('PASSWORD_MAX_LENGTH', 25),
        write_only=True,
        help_text='Password, 6-25 chars. Must contain uppercase, lowercase, and digit.',
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
    # 手机流程：验证码（二选一）
    verification_code = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        min_length=_cfg.get('SMS_CODE_LENGTH', 6),
        max_length=_cfg.get('SMS_CODE_LENGTH', 6),
        write_only=True,
        help_text='SMS verification code from POST /sms/send/.',
    )

    def validate_username(self, value):
        return value

    def validate_password(self, value):
        return _validate_password_strength(value)

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
        """跨字段校验：token 优先（邮箱流程），code 次之（手机流程）"""
        # 两步流程：视图已用 verify_id+code 校验并注入已验证邮箱，直接采用
        verified_email = self.context.get('verified_email')
        if verified_email:
            data['_verified_email'] = verified_email
            return data

        token = data.get('verification_token', '')
        code = data.get('verification_code', '')
        country_code = data.get('country_code', '')
        phone = data.get('phone', '')

        has_token = bool(token)
        has_phone = bool(phone and country_code)
        has_code = bool(code)

        if not has_token and not has_phone:
            raise serializers.ValidationError({
                'verification_token': 'Either email verification token or phone with SMS code is required.',
                'phone': 'Either email verification token or phone with SMS code is required.',
            })

        # 区号 / 手机号互斥
        if country_code and not phone:
            raise serializers.ValidationError({
                'phone': 'Phone number is required when country code is provided.',
            })
        if phone and not country_code:
            raise serializers.ValidationError({
                'country_code': 'Country code is required when phone number is provided.',
            })

        # 邮箱流程（token 优先）：解码验证令牌获取邮箱
        if has_token:
            try:
                data['_verified_email'] = EmailService.decode_verification_token(token)
            except ValueError as e:
                raise serializers.ValidationError({
                    'verification_token': str(e),
                })
        # 手机流程：校验短信验证码
        elif has_phone:
            if not has_code:
                raise serializers.ValidationError({
                    'verification_code': 'SMS verification code is required.',
                })
            if not SMSService.verify_code(phone, country_code, code):
                raise serializers.ValidationError({
                    'verification_code': 'Invalid or expired verification code.',
                })

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
            'phone_verified', 'full_phone', 'created_at', 'updated_at',
        ]
        read_only_fields = ['phone_verified', 'created_at', 'updated_at']


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


# ============================================================
# 短信验证码
# ============================================================

class SendSMSCodeSerializer(serializers.Serializer):
    """发送短信验证码 —— 需先通过图片验证码"""
    phone = serializers.CharField(
        max_length=20,
        help_text='Phone number without country code.',
    )
    country_code = serializers.CharField(
        max_length=10,
        help_text='Country calling code, e.g. +86.',
    )
    captcha_id = serializers.CharField(
        max_length=20,
        help_text='Captcha ID from GET /api/users/captcha/.',
    )
    captcha_text = serializers.CharField(
        max_length=6,
        help_text='Captcha text from image.',
    )

    def validate_country_code(self, value):
        validate_country_code(value)
        return value

    def validate_phone(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Phone number is required.')
        validate_phone(value)
        return value

    def validate(self, data):
        from apps.users.captcha_service import CaptchaService
        if not CaptchaService.verify(data['captcha_id'], data['captcha_text']):
            raise serializers.ValidationError({
                'captcha_text': 'Invalid or expired captcha.',
            })
        return data


class VerifySMSCodeSerializer(serializers.Serializer):
    """校验短信验证码"""
    phone = serializers.CharField(max_length=20)
    country_code = serializers.CharField(max_length=10)
    code = serializers.CharField(
        min_length=_cfg.get('SMS_CODE_LENGTH', 6),
        max_length=_cfg.get('SMS_CODE_LENGTH', 6),
    )

    def validate_country_code(self, value):
        validate_country_code(value)
        return value


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
        min_length=_cfg.get('SMS_CODE_LENGTH', 6),
        max_length=_cfg.get('SMS_CODE_LENGTH', 6),
    )
