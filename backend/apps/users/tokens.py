"""
安全戳（Security Stamp）令牌工具。

设计目标（对齐大厂「权限变更即失效旧会话」实践，如 ASP.NET Identity SecurityStamp）：

1. 每个用户持有不可预测的安全戳（UserProfile.security_stamp）。
2. 所有令牌签发点（管理员登录 / 浏览器登录 / 社交登录 / bearer token）把当前安全戳
   写入 JWT 的 `stamp` claim（同时落入 access 与 refresh token）。
3. 每个认证请求在 get_user 中比对 令牌 stamp == DB 当前 stamp：
   - 不匹配 → 401 REAUTH_REQUIRED，前端弹出「请重新登录」。
4. 角色 / 密码等安全相关变更时旋转安全戳（rotate_user_stamp），
   使该用户所有已签发但未过期的旧会话立即失效。

灰度兼容：
   - 老用户（迁移后 security_stamp 为空）首次登录由 ensure_stamp 惰性生成。
   - 部署前签发的令牌不含 stamp claim；get_user 仅在「令牌带 stamp」时才做比对，
     因此老会话平滑过渡：重新登录后才会被纳入强制校验。这与产品预期一致
     （「刚升完就重进才有变化」——变更在重新登录后生效）。
"""
import secrets
import logging

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.models import UserProfile
from apps.users.account import ensure_account_no

logger = logging.getLogger(__name__)

STAMP_CLAIM = 'stamp'


def _gen_stamp() -> str:
    return secrets.token_urlsafe(32)


def ensure_stamp(user) -> str:
    """返回用户当前安全戳；若不存在则生成并持久化（惰性初始化老用户）。"""
    profile, _created = UserProfile.objects.get_or_create(user_id=user.pk)
    if not profile.security_stamp:
        profile.security_stamp = _gen_stamp()
        profile.save(update_fields=['security_stamp'])
    return profile.security_stamp


def get_db_stamp(user) -> str | None:
    """读取用户当前 DB 安全戳（优先用已 select_related 的 profile，避免额外查询）。

    注意：OneToOne 关系在关联行缺失时访问 user.profile 会抛 DoesNotExist（非 AttributeError），
    故用 try/except 兜底——缺失 profile 时返回 None，由调用方按「stamp 不一致」强制重新登录自愈。
    """
    profile = None
    try:
        profile = user.profile
    except Exception:
        try:
            profile = UserProfile.objects.filter(user_id=user.pk).first()
        except Exception:
            return None
    return profile.security_stamp if profile else None


def rotate_user_stamp(user_id: int) -> str | None:
    """旋转指定用户的安全戳，使其所有旧会话失效。返回新戳（用户不存在则返回 None）。"""
    if not user_id:
        return None
    try:
        profile, _created = UserProfile.objects.get_or_create(user_id=user_id)
        profile.security_stamp = _gen_stamp()
        profile.save(update_fields=['security_stamp'])
        logger.info('[security_stamp] rotated for user_id=%s', user_id)
        return profile.security_stamp
    except Exception:
        logger.exception('[security_stamp] rotate failed for user_id=%s', user_id)
        return None


class StampRefreshToken(RefreshToken):
    """在标准 RefreshToken 基础上，把安全戳写入 refresh 与 access 两段令牌。"""

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        try:
            token[STAMP_CLAIM] = ensure_stamp(user)
            # 当前用户自身对外账户号，供前端免额外请求获取；不参与鉴权主键解析
            token['account_no'] = ensure_account_no(user)
        except Exception:
            logger.exception('[security_stamp] ensure_stamp failed for user_id=%s', user.pk)
        return token

    @property
    def access_token(self):
        # SimpleJWT 默认仅把 ACCESS_TOKEN_CLAIM_KEYS 复制到 access token，
        # 自定义 claim（stamp）不会被自动带过去，这里显式补齐。
        access = super().access_token
        stamp = self.payload.get(STAMP_CLAIM)
        if stamp is not None:
            access[STAMP_CLAIM] = stamp
        return access


class StampTokenObtainPairSerializer(TokenObtainPairSerializer):
    """签发 stamp 感知的 (access, refresh) 对。"""

    @classmethod
    def get_token(cls, user):
        return StampRefreshToken.for_user(user)


class StampTokenObtainPairView(TokenObtainPairView):
    """bearer token 端点（/api/users/token/）使用 stamp 感知签发。"""

    serializer_class = StampTokenObtainPairSerializer


__all__ = [
    'STAMP_CLAIM',
    'ensure_stamp',
    'get_db_stamp',
    'rotate_user_stamp',
    'StampRefreshToken',
    'StampTokenObtainPairSerializer',
    'StampTokenObtainPairView',
]
