import logging
from datetime import timedelta

from django.conf import settings
from django.core.cache import caches
from django.utils import timezone
from django.utils.crypto import get_random_string

from apps.users.models import SMSVerificationCode

logger = logging.getLogger(__name__)

# 验证码专用 Redis 缓存（DB 2）
_code_cache = caches['verification_code']

# 从集中配置读取可调参数
_cfg = getattr(settings, 'USERS_SETTINGS', {})


class SMSService:
    """
    短信验证码服务（策略模式）。

    架构：
      - Redis（验证码专用库 DB 2）：存验证码（主），带 TTL 自动过期
      - MySQL（SMSVerificationCode 表）：审计日志（从），只写不读
      - 频率限制 / 暴力破解防护：Redis 计数器

    替换为真实 SMS 提供商只需实现 send_code / verify_code 相同接口。
    """

    @staticmethod
    def _code_key(phone, country_code):
        """Redis key: 验证码"""
        return f'sms:code:{country_code}:{phone}'

    @staticmethod
    def _rate_key(phone, country_code):
        """Redis key: 发送频率限制"""
        return f'sms:rate:{country_code}:{phone}'

    @staticmethod
    def _attempt_key(phone, country_code):
        """Redis key: 验证尝试次数"""
        return f'sms:attempt:{country_code}:{phone}'

    @staticmethod
    def send_code(phone, country_code):
        """
        生成并发送短信验证码。

        Returns:
            dict: {success, message, code}
        """
        code_len = _cfg.get('SMS_CODE_LENGTH', 6)
        expire_sec = _cfg.get('SMS_CODE_EXPIRE_SECONDS', 300)
        rate_sec = _cfg.get('SMS_RATE_LIMIT_SECONDS', 60)

        # 频率限制 —— Redis TTL 实现
        if _code_cache.get(SMSService._rate_key(phone, country_code)):
            return {
                'success': False,
                'message': f'请等待 {rate_sec} 秒后再重新获取验证码',
                'code': None,
            }

        code = get_random_string(length=code_len, allowed_chars='0123456789')

        # 主存储：Redis，带 TTL 自动过期
        _code_cache.set(
            SMSService._code_key(phone, country_code),
            code,
            timeout=expire_sec,
        )
        # 重置验证尝试次数
        _code_cache.set(
            SMSService._attempt_key(phone, country_code),
            0,
            timeout=expire_sec,
        )
        # 设置频率限制
        _code_cache.set(
            SMSService._rate_key(phone, country_code),
            1,
            timeout=rate_sec,
        )

        # 审计日志：写入 MySQL
        try:
            SMSVerificationCode.objects.create(
                phone=phone,
                country_code=country_code,
                code=code,
                expires_at=timezone.now() + timedelta(seconds=expire_sec),
            )
        except Exception:
            logger.exception('Failed to write SMS audit log')

        # SMS provider integration point
        logger.info(
            f'[SMS] 验证码 {code} 已发送至 {country_code}{phone}'
        )

        return {
            'success': True,
            'message': '验证码发送成功',
            'code': code if settings.DEBUG else None,
        }

    @staticmethod
    def verify_code(phone, country_code, code):
        """
        校验短信验证码。验证码一次性使用，校验成功后立即删除。

        Returns:
            bool: 验证通过返回 True
        """
        max_attempts = _cfg.get('SMS_MAX_VERIFY_ATTEMPTS', 5)

        # 暴力破解防护：检查尝试次数
        attempts = _code_cache.get(SMSService._attempt_key(phone, country_code), 0)
        if attempts >= max_attempts:
            logger.warning(
                f'[SMS] 验证码尝试次数超限 {country_code}{phone} (attempts={attempts})'
            )
            return False

        # 主校验：从 Redis 读取
        stored_code = _code_cache.get(SMSService._code_key(phone, country_code))

        if stored_code is None:
            # Redis 中不存在（已过期或未发送）
            return False

        if stored_code != code:
            # 验证失败：递增尝试次数
            _code_cache.set(
                SMSService._attempt_key(phone, country_code),
                attempts + 1,
                timeout=_cfg.get('SMS_CODE_EXPIRE_SECONDS', 300),
            )
            return False

        # 验证成功：立即删除 Redis 中的验证码（一次性使用）
        _code_cache.delete(SMSService._code_key(phone, country_code))
        _code_cache.delete(SMSService._attempt_key(phone, country_code))

        # 同步标记数据库记录为已使用
        try:
            SMSVerificationCode.objects.filter(
                phone=phone,
                country_code=country_code,
                code=code,
                is_used=False,
            ).update(is_used=True)
        except Exception:
            logger.exception('Failed to update SMS audit log')

        return True
