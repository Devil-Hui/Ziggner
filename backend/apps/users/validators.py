"""
共用输入校验器 —— register 与普通管理员创建两端复用，避免规则漂移。

规则（与主理人拍板一致）：
  - username：^[A-Za-z0-9_\\-]{4,32}$  （大小写敏感，与登录一致）
  - password：长度 ≥ 8，且包含大写、小写，以及（数字 或 特殊字符）
  - email：    RFC 风格格式（含 @ 与域名）

校验失败统一抛 django.core.exceptions.ValidationError，
DRF 字段校验会自动捕获并转换为 serializers.ValidationError。
"""
import re

from django.core.exceptions import ValidationError

# username：4-32 位，仅允许字母、数字、下划线、连字符
USERNAME_REGEX = re.compile(r'^[A-Za-z0-9_\-]{4,32}$')

# email：宽松 RFC 风格（本地部分 + @ + 域名 + 顶级域），拒绝空白与连续 @
EMAIL_REGEX = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

# 密码强度：大写、小写、以及（数字 或 非字母数字特殊字符）
_PASSWORD_WEAK_MSG = (
    '密码至少 8 位，且须包含大写字母、小写字母，以及数字或特殊字符'
)


def validate_username(value: str) -> str:
    """校验用户名格式。返回原值；非法抛 ValidationError。"""
    if not value or not USERNAME_REGEX.match(value):
        raise ValidationError(
            '用户名须为 4-32 位，仅限字母、数字、下划线（_）与连字符（-）'
        )
    return value


def validate_email(value: str) -> str:
    """校验邮箱格式（RFC 风格）。返回原值；非法抛 ValidationError。"""
    if not value or not EMAIL_REGEX.match(value):
        raise ValidationError('邮箱格式不正确')
    return value


def validate_password(value: str) -> str:
    """校验密码强度。返回原值；不达标抛 ValidationError。"""
    if not value or len(value) < 8:
        raise ValidationError(_PASSWORD_WEAK_MSG)
    if not re.search(r'[A-Z]', value):
        raise ValidationError(_PASSWORD_WEAK_MSG)
    if not re.search(r'[a-z]', value):
        raise ValidationError(_PASSWORD_WEAK_MSG)
    if not (re.search(r'\d', value) or re.search(r'[^A-Za-z0-9]', value)):
        raise ValidationError(_PASSWORD_WEAK_MSG)
    return value
