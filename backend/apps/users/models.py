import re
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string


def validate_country_code(value):
    """
    校验区号格式：必须以 '+' 开头，后跟 1-4 位数字。
    合法示例: +86, +1, +852, +1242
    非法示例: 86, +, +abc
    空值不校验（由 blank=True 处理）。
    """
    if not value:
        return
    if not re.match(r'^\+\d{1,4}$', value):
        raise ValidationError(
            '区号必须以 "+" 开头并后跟 1-4 位数字（如 +86, +1, +852）'
        )


def validate_phone(value):
    """
    校验手机号格式：仅允许数字，长度 5-20 位。
    空值不校验（由 blank=True 处理）。
    """
    if not value:
        return
    if not re.match(r'^\d{5,20}$', value):
        raise ValidationError('手机号必须为 5-20 位数字')


class UserProfile(models.Model):
    """
    用户扩展信息，通过 OneToOne 关联 Django 默认 auth.User。
    不修改 auth_user 表，纯增量扩展。
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    country_code = models.CharField(
        max_length=10,
        blank=True,
        default='',
        validators=[validate_country_code],
        help_text='国际区号，如 +86（选填）',
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        validators=[validate_phone],
        help_text='手机号（不含区号）',
    )
    phone_verified = models.BooleanField(
        default=False,
        help_text='手机号是否已通过短信验证',
    )
    username_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='上次修改用户名的时间（用于冷却期判断）',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_userprofile'
        verbose_name = '用户扩展信息'
        verbose_name_plural = verbose_name
        constraints = [
            models.UniqueConstraint(
                fields=['country_code', 'phone'],
                condition=~models.Q(phone=''),
                name='unique_phone_per_country_code',
            ),
        ]

    def __str__(self):
        return f'Profile for {self.user.username}'

    @property
    def full_phone(self):
        """返回带区号的完整手机号"""
        if self.country_code and self.phone:
            return f'{self.country_code}{self.phone}'
        return self.phone or ''

    def clean(self):
        super().clean()
        if self.country_code and not self.phone:
            raise ValidationError({
                'phone': '填写区号时必须同时填写手机号',
            })


class ExpiringToken(models.Model):
    """
    Admin API 过期 Token 认证模型。
    供 utils/admin_authentication.py 中的 ExpiringTokenAuthentication 使用。
    """
    key = models.CharField(max_length=40, primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_tokens',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'users_expiringtoken'
        verbose_name = '过期Token'
        verbose_name_plural = verbose_name

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        if not self.key:
            self.key = self.generate_key()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_key():
        import secrets
        return secrets.token_hex(20)


class SMSVerificationCode(models.Model):
    """
    短信验证码存储。
    5 分钟过期，一次性使用。
    """
    phone = models.CharField(max_length=20)
    country_code = models.CharField(max_length=10)
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'users_sms_verification_code'
        verbose_name = '短信验证码'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['phone', 'country_code', '-created_at']),
        ]

    def is_valid(self):
        """验证码是否仍然有效（未使用且未过期）"""
        return not self.is_used and timezone.now() < self.expires_at

    @classmethod
    def generate_code(cls, phone, country_code):
        """生成一条新的 6 位数字验证码记录"""
        return cls.objects.create(
            phone=phone,
            country_code=country_code,
            code=get_random_string(length=6, allowed_chars='0123456789'),
            expires_at=timezone.now() + timedelta(minutes=5),
        )


class SocialAccount(models.Model):
    """第三方社交账号绑定"""
    PROVIDER_CHOICES = [
        ('google', 'Google'),
        ('facebook', 'Facebook'),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_accounts',
        verbose_name='用户',
    )
    provider = models.CharField(
        max_length=20, choices=PROVIDER_CHOICES,
        verbose_name='提供商',
    )
    provider_id = models.CharField(
        max_length=255, verbose_name='提供商用户ID',
    )
    extra_data = models.JSONField(
        default=dict, blank=True,
        verbose_name='额外数据',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='绑定时间')

    class Meta:
        db_table = 'users_social_account'
        verbose_name = '社交账号'
        verbose_name_plural = verbose_name
        unique_together = [['provider', 'provider_id']]
        indexes = [
            models.Index(fields=['provider', 'provider_id']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f'{self.provider}:{self.provider_id}'


class EmailTemplate(models.Model):
    """
    邮件模板配置 —— 管理后台可编辑发送的邮件内容。
    """
    TEMPLATE_TYPES = [
        ('verify_code', '邮箱验证码'),
        ('order_notice', '订单通知'),
        ('reset_password', '密码重置'),
    ]
    template_type = models.CharField(
        max_length=32, unique=True, choices=TEMPLATE_TYPES,
        verbose_name='模板类型',
    )
    subject = models.CharField(max_length=200, verbose_name='邮件主题')
    # HTML 正文，支持 {code} 等占位符
    html_body = models.TextField(verbose_name='HTML 正文', help_text='支持 {code} 占位符')
    text_body = models.TextField(verbose_name='纯文本正文', blank=True, help_text='支持 {code} 占位符')
    is_active = models.BooleanField(default=True, verbose_name='启用')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'users_email_template'
        verbose_name = '邮件模板'
        verbose_name_plural = verbose_name

    def render(self, context: dict) -> dict:
        """用上下文渲染主题与正文（占位符替换）"""
        def _fill(text):
            for k, v in context.items():
                text = text.replace('{' + k + '}', str(v))
            return text
        return {
            'subject': _fill(self.subject),
            'html': _fill(self.html_body),
            'text': _fill(self.text_body or ''),
        }

    def __str__(self):
        return f'{self.get_template_type_display()} - {self.subject}'


