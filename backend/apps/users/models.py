import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string


def generate_account_no() -> str:
    """对外账户号：ZG- 前缀 + 16 位 Crockford Base32（剔除 I L O U，避免视觉混淆）。

    - 熵 ≈ 80 bit，不可枚举，杜绝以自增主键遍历扒取账号（IDOR）。
    - 可读、可口头/纸质传递，便于客服核对，对齐支付宝/微信「账号」观感。
    - 唯一性由 DB unique 约束 + 生成时去重循环保证（见 migrate / ensure_account_no）。
    """
    alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'  # 32 字符，无 I/L/O/U
    body = ''.join(secrets.choice(alphabet) for _ in range(16))
    return f'ZG-{body}'


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
    username_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='上次修改用户名的时间（用于冷却期判断）',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # 安全戳：密码 / 角色等安全相关变更时旋转，使该用户所有旧会话（JWT）立即失效，
    # 必须重新登录。空字符串表示尚未初始化（老用户首次登录时由 tokens.ensure_stamp 惰性生成）。
    security_stamp = models.CharField(
        max_length=64,
        blank=True,
        default='',
        editable=False,
        help_text='安全戳：角色/密码等安全变更时旋转，使旧会话失效',
    )
    # 对外账户号（不可枚举），替代暴露内部自增 id。内部 id 仅用于 DB join，绝不序列化对外。
    account_no = models.CharField(
        max_length=24,
        blank=True,
        default='',
        editable=False,
        db_index=True,
        unique=True,
        help_text='对外账户号（ZG- + Base32），替代暴露内部自增 id',
    )

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


