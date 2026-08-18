"""
账户号（account_no）解析层。

设计目标（对齐大厂「不透明对外标识符」实践，如 Stripe usr_xxx、GitHub login）：

1. 每个用户持有不可枚举、非连续的对外公钥 account_no（UserProfile.account_no），
   替代暴露内部自增 PK（auth.User.id）。内部 id 仅用于 DB join，绝不序列化对外。
2. 所有"指认他人"的管理操作（加组、指派角色、检索）都用 account_no，
   而不是 email / username 等敏感 PII，也不暴露自增 id。
3. 解析统一走 resolve_user_by_account_no：格式非法或不存在一律返回 404，
   不区分"格式错/不存在/已禁用"，避免给枚举探测者任何反馈。

灰度兼容：account_no 仅在"指认他人"场景使用；认证主键仍是 JWT 的 user_id，
不影响既有会话与 security_stamp 机制。
"""
import re

from django.contrib.auth import get_user_model

from apps.users.models import UserProfile, generate_account_no
from utils.exceptions import ClientException, ErrorCodes

User = get_user_model()

# ZG- 前缀 + 16 位 Crockford Base32（无 I/L/O/U）
ACCOUNT_NO_RE = re.compile(r'^ZG-[0-9A-HJ-NP-TV-Z]{16}$')


def ensure_account_no(user) -> str:
    """返回用户当前账户号；若不存在则生成并持久化（惰性初始化）。"""
    profile, _created = UserProfile.objects.get_or_create(user_id=user.pk)
    if not profile.account_no:
        profile.account_no = generate_account_no()
        # 极端并发下去重由 unique 约束兜底；此处乐观写入，冲突由调用方事务处理
        profile.save(update_fields=['account_no'])
    return profile.account_no


def resolve_user_by_account_no(account_no):
    """按对外账户号解析用户。格式错 / 不存在 / 已禁用 → 统一 404（防探测）。"""
    if not account_no or not ACCOUNT_NO_RE.match(account_no):
        raise ClientException('用户不存在', error_code=ErrorCodes.NOT_FOUND)

    profile = (
        UserProfile.objects.select_related('user')
        .filter(account_no=account_no, user__is_active=True)
        .first()
    )
    if not profile:
        raise ClientException('用户不存在', error_code=ErrorCodes.NOT_FOUND)
    return profile.user


def resolve_group_by_slug(slug):
    """按 slug 解析管理组（slug 为业务可读标识，替代可枚举的 group_id）。"""
    from apps.goods.models import AdminGroup

    group = AdminGroup.objects.filter(slug=slug, is_active=True).first()
    if not group:
        raise ClientException('管理组不存在', error_code=ErrorCodes.NOT_FOUND)
    return group


__all__ = [
    'ACCOUNT_NO_RE',
    'ensure_account_no',
    'resolve_user_by_account_no',
    'resolve_group_by_slug',
]
