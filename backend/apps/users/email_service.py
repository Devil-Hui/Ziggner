"""
邮箱验证码服务 —— 三阶段验证流程。

三阶段:
  1. send_code(email)       → 发送6位验证码到邮箱（SMTP + Celery异步）
  2. verify_code(email,code) → 校验验证码，成功后 issue_verification_token()
  3. register(token, ...)   → 解码令牌获取已验证邮箱，完成注册

验证码存 Redis (DB 2)，令牌为 JWT（无需 Redis）。
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone

import jwt
from django.conf import settings
from django.core.cache import caches
from django.core.mail import send_mail
from django.utils.crypto import get_random_string

from apps.users.models import EmailTemplate


def _get_template(template_type: str):
    """从数据库读取邮件模板，缺省回退到内置默认值"""
    try:
        tpl = EmailTemplate.objects.filter(template_type=template_type, is_active=True).first()
        if tpl:
            return tpl
    except Exception:
        pass
    return None


def _render_template(template_type: str, context: dict) -> dict:
    """渲染邮件内容：优先数据库模板，回退内置默认"""
    tpl = _get_template(template_type)
    if tpl:
        return tpl.render(context)
    # 内置默认（数据库模板未配置时）
    code = context.get('code', '')
    return {
        'subject': 'Ziggner - Email Verification',
        'html': f'''<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff;border-radius:8px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="6" fill="#1a56db"/><text x="16" y="23" text-anchor="middle" fill="#ffffff" font-size="18" font-family="Arial, sans-serif" font-weight="bold">Z</text></svg>
    <div style="font-size:22px;font-weight:600;letter-spacing:-0.5px;">Ziggner</div>
  </div>
  <div style="font-size:14px;line-height:1.6;color:#444;margin-bottom:20px;">
    Your verification code is:
  </div>
  <div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1a56db;background:#f5f7ff;padding:16px 24px;border-radius:6px;text-align:center;margin-bottom:24px;">
    {code}
  </div>
  <div style="font-size:12px;line-height:1.5;color:#888;">
    This code is valid for 10 minutes. For security reasons, never share this code with anyone.
  </div>
  <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;font-size:11px;color:#aaa;text-align:center;">
    Ziggner · Automated message. Please do not reply.
  </div>
</div>''',
        'text': f'Your verification code is: {code}\nValid for 10 minutes.',
    }


def _account_day_key(account_user: str) -> str:
    """发件账号当日用量 key（按自然日 UTC 计数，每 24h 重置）"""
    today = datetime.now(dt_timezone.utc).strftime('%Y%m%d')
    return f'email_account_sent:{account_user}:{today}'


def _account_usage(account: dict) -> int:
    """账号当日已发送数"""
    return _code_cache.get(_account_day_key(account.get('user', '')), 0)


def _send_with_account(account: dict, recipient: str, code: str, template_type: str) -> None:
    """用指定账号发送验证码邮件（SMTP 失败会抛异常，由调用方切换账号）"""
    from django.core.mail import EmailMultiAlternatives, get_connection

    rendered = _render_template(template_type, {'code': code})
    msg = EmailMultiAlternatives(
        subject=rendered['subject'],
        body=rendered['text'] or f'Your verification code is: {code}',
        from_email=account.get('from_email') or account.get('user') or settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
        connection=None,
    )
    msg.attach_alternative(rendered['html'], 'text/html')
    conn = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=account.get('host', 'smtp.163.com'),
        port=int(account.get('port', 465)),
        username=account.get('user', ''),
        password=account.get('password', ''),
        use_ssl=bool(account.get('use_ssl', True)),
        use_tls=bool(account.get('use_tls', False)),
    )
    msg.connection = conn
    msg.send(fail_silently=False)


def _deliver_verify_email(recipient: str, code: str, template_type: str = 'verify_code') -> None:
    """多发件账号池：额度感知轮换发送。

    - 跳过当日已达 daily_limit 的账号
    - 按当日用量升序优先选最空闲账号
    - 发送失败自动切换下一个账号
    - 全部失败抛异常（调用方返回 500，不再假装成功）
    """
    accounts = list(getattr(settings, 'EMAIL_ACCOUNTS', None) or [])
    if not accounts:
        raise RuntimeError('no email account configured')

    # 按当日用量升序（最空闲优先），额度用完的排最后（仍允许失败切换尝试）
    accounts.sort(key=lambda a: _account_usage(a))
    errors = []
    for account in accounts:
        usage = _account_usage(account)
        if usage >= int(account.get('daily_limit', 500)):
            errors.append(f"{account.get('user')}: daily limit {usage} reached")
            continue
        try:
            _send_with_account(account, recipient, code, template_type)
        except Exception as e:
            logger.warning(f'[EMAIL] account {account.get("user")} failed to send to {recipient}: {e}')
            errors.append(f"{account.get('user')}: {e}")
            continue
        # 发送成功 → 记录该账号当日用量
        _code_cache.set(_account_day_key(account.get('user', '')), usage + 1, timeout=86400)
        return
    msg = 'all email accounts failed: ' + ('; '.join(errors) if errors else 'no usable account')
    raise RuntimeError(msg)


logger = logging.getLogger(__name__)

_code_cache = caches['verification_code']
_cfg = getattr(settings, 'USERS_SETTINGS', {})


def generate_numeric_verification_code(length: int = 6) -> str:
    """Generate a verification code with Django's cryptographically secure RNG."""
    return get_random_string(length=length, allowed_chars='0123456789')


class EmailService:
    """邮箱验证码 + 验证令牌服务"""

    # ============================================================
    # Redis key 工具
    # ============================================================

    @staticmethod
    def _code_key(email):
        return f'email:code:{email}'

    @staticmethod
    def _rate_key(email):
        return f'email:rate:{email}'

    @staticmethod
    def _attempt_key(email):
        return f'email:attempt:{email}'

    # ============================================================
    # Phase 1: 发送验证码
    # ============================================================

    @staticmethod
    def send_code(email):
        """
        生成验证码 → 存入 Redis → 异步发送邮件。

        Returns:
            dict: {success, message, code}
        """
        code_len = _cfg.get('VERIFICATION_CODE_LENGTH', 6)
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE_SECONDS', 300)
        rate_sec = _cfg.get('VERIFICATION_RATE_LIMIT_SECONDS', 60)

        # 频率限制
        if _code_cache.get(EmailService._rate_key(email)):
            return {
                'success': False,
                'message': f'Please wait {rate_sec} seconds before requesting a new code.',
                'code': None,
            }

        code = get_random_string(length=code_len, allowed_chars='0123456789')

        # 存入 Redis
        _code_cache.set(EmailService._code_key(email), code, timeout=expire_sec)
        _code_cache.set(EmailService._attempt_key(email), 0, timeout=expire_sec)
        _code_cache.set(EmailService._rate_key(email), 1, timeout=rate_sec)

        # 异步通过 Celery 发送邮件；若不可用则同步发送
        EmailService._send_email(email, code)

        return {
            'success': True,
            'message': 'Verification code sent.',
            'code': code if settings.DEBUG else None,
        }

    @staticmethod
    def _send_email(email, code):
        """发送验证码邮件 —— 优先 Celery 异步，fallback 同步"""
        subject = 'Email Verification Code'
        message = (
            f'Your verification code is: {code}\n\n'
            f'This code will expire in {_cfg.get("VERIFICATION_CODE_EXPIRE_SECONDS", 300) // 60} minutes.'
        )
        try:
            from apps.users.tasks import send_verification_email
            send_verification_email.delay(subject, message, email)
            logger.info(f'[EMAIL] Celery task dispatched for {email}')
        except Exception:
            # Celery 不可用时同步发送
            logger.warning(f'[EMAIL] Celery unavailable, sending synchronously for {email}')
            EmailService._send_email_sync(subject, message, email)

    @staticmethod
    def _send_email_sync(subject, message, email):
        """同步发送邮件 —— SMTP"""
        from django.core.mail import send_mail
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info(f'[EMAIL] Verification code sent to {email} via SMTP')
        except Exception as e:
            logger.error(f'[EMAIL] Failed to send to {email}: {e}')

    # ============================================================
    # Phase 2: 校验验证码 + 签发临时令牌
    # ============================================================

    @staticmethod
    def verify_code(email, code):
        """校验邮箱验证码，一次性使用，成功后删除"""
        max_attempts = _cfg.get('VERIFICATION_MAX_ATTEMPTS', 5)

        # 爆破防护
        attempts = _code_cache.get(EmailService._attempt_key(email), 0)
        if attempts >= max_attempts:
            logger.warning(f'[EMAIL] Too many attempts for {email}')
            return False

        stored_code = _code_cache.get(EmailService._code_key(email))
        if stored_code is None:
            return False

        if stored_code != code:
            _code_cache.set(
                EmailService._attempt_key(email),
                attempts + 1,
                timeout=_cfg.get('VERIFICATION_CODE_EXPIRE_SECONDS', 300),
            )
            return False

        # 一次性使用：删除验证码
        _code_cache.delete(EmailService._code_key(email))
        _code_cache.delete(EmailService._attempt_key(email))
        return True

    @staticmethod
    def issue_verification_token(email):
        """
        签发 JWT 邮箱验证临时令牌。

        Token payload:
            email: 已验证的邮箱地址
            type:  'email_verification'
            exp:   过期时间（默认 5 分钟）

        Returns:
            str: signed JWT token
        """
        expire_minutes = _cfg.get('EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES', 5)
        now = datetime.now(dt_timezone.utc)
        payload = {
            'email': email,
            'type': 'email_verification',
            'iat': now,
            'exp': now + timedelta(minutes=expire_minutes),
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return token

    @staticmethod
    def decode_verification_token(token):
        """
        解码并校验邮箱验证令牌。

        Returns:
            str: 已验证的邮箱地址

        Raises:
            ValueError: 令牌无效或已过期
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=['HS256'],
                options={'require': ['exp', 'email', 'type']},
            )
        except jwt.ExpiredSignatureError:
            raise ValueError('Verification token has expired.')
        except jwt.InvalidTokenError:
            raise ValueError('Invalid verification token.')

        if payload.get('type') != 'email_verification':
            raise ValueError('Invalid token type.')

        return payload['email']


# ============================================================
# EmailVerifyService — 独立验证码流程（用于注册等场景）
# ============================================================

class EmailRateLimitError(Exception):
    """验证码发送频率超限（调用方应返回 429）"""

    def __init__(self, message='发送过于频繁，请稍后重试', retry_after=60):
        self.retry_after = retry_after
        super().__init__(message)


class EmailVerifyService:
    """发送6位数字验证码到指定邮箱，使用 verify_id 做键"""

    @staticmethod
    def _rate_key(email):
        return f'email_verify_rate:{email}'

    @staticmethod
    def _daily_key(email):
        # 按自然日（UTC）计数，每 24h 重置
        today = datetime.now(dt_timezone.utc).strftime('%Y%m%d')
        return f'email_verify_day:{email}:{today}'

    @staticmethod
    def _active_key(email):
        # 该邮箱当前生效的 verify_id（发新码时作废旧码）
        return f'email_verify_active:{email}'

    @staticmethod
    def _global_minute_key():
        # 全系统 60s 窗口计数（防恶意刷，保护发件账号额度）
        return 'email_verify_global_minute'

    @staticmethod
    def _global_day_key():
        today = datetime.now(dt_timezone.utc).strftime('%Y%m%d')
        return f'email_verify_global_day:{today}'

    @staticmethod
    def _enforce_send_limit(email: str) -> None:
        """发送频率限制：单邮箱 60s 冷却 + 单邮箱每日上限 + 全局限量（防刷爆发件账号额度）"""
        rate_sec = _cfg.get('VERIFICATION_RATE_LIMIT_SECONDS', 60)
        daily_max = _cfg.get('VERIFICATION_DAILY_LIMIT', 10)
        g_min = _cfg.get('VERIFICATION_GLOBAL_MINUTE_LIMIT', 10)
        g_day = _cfg.get('VERIFICATION_GLOBAL_DAILY_LIMIT', 200)
        if _code_cache.get(EmailVerifyService._rate_key(email)):
            raise EmailRateLimitError('发送过于频繁，请 60 秒后再试', retry_after=rate_sec)
        if _code_cache.get(EmailVerifyService._daily_key(email), 0) >= daily_max:
            raise EmailRateLimitError('今日发送次数已达上限，请明天再试', retry_after=3600)
        if _code_cache.get(EmailVerifyService._global_minute_key(), 0) >= g_min:
            raise EmailRateLimitError('系统发送繁忙，请稍后再试', retry_after=rate_sec)
        if _code_cache.get(EmailVerifyService._global_day_key(), 0) >= g_day:
            raise EmailRateLimitError('今日验证码发送量已达上限，请明天再试', retry_after=3600)

    @staticmethod
    def _mark_sent(email: str) -> None:
        rate_sec = _cfg.get('VERIFICATION_RATE_LIMIT_SECONDS', 60)
        _code_cache.set(EmailVerifyService._rate_key(email), 1, timeout=rate_sec)
        _code_cache.set(
            EmailVerifyService._daily_key(email),
            _code_cache.get(EmailVerifyService._daily_key(email), 0) + 1,
            timeout=86400,
        )
        _code_cache.set(
            EmailVerifyService._global_minute_key(),
            _code_cache.get(EmailVerifyService._global_minute_key(), 0) + 1,
            timeout=60,
        )
        _code_cache.set(
            EmailVerifyService._global_day_key(),
            _code_cache.get(EmailVerifyService._global_day_key(), 0) + 1,
            timeout=86400,
        )

    @staticmethod
    def _invalidate_previous(email: str) -> None:
        """发新码前作废该邮箱旧验证码（verify_id 换新，旧码立即失效）"""
        old_verify_id = _code_cache.get(EmailVerifyService._active_key(email))
        if old_verify_id:
            _code_cache.delete(f'email_verify:{old_verify_id}')
            _code_cache.delete(f'email_verify_email:{old_verify_id}')

    @staticmethod
    def send_verify_code(email: str) -> dict:
        """发送6位数字验证码到指定邮箱（验证码仅发邮件，不返回给客户端）"""
        EmailVerifyService._enforce_send_limit(email)

        code = generate_numeric_verification_code()
        verify_id = uuid.uuid4().hex[:12]
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE', 600)  # 10分钟

        # 发新作废旧：该邮箱旧验证码立即失效
        EmailVerifyService._invalidate_previous(email)
        # 存储验证码
        _code_cache.set(f'email_verify:{verify_id}', code, timeout=expire_sec)
        # 同时记录邮箱，供注册两步流程（verify_id+code → email）使用
        _code_cache.set(f'email_verify_email:{verify_id}', email, timeout=expire_sec)
        _code_cache.set(EmailVerifyService._active_key(email), verify_id, timeout=expire_sec)
        EmailVerifyService._mark_sent(email)

        # 发送邮件（账号池轮换，失败抛异常由视图返回 500）
        _deliver_verify_email(email, code, 'verify_code')

        result = {'verify_id': verify_id, 'expire_seconds': expire_sec}
        return result

    @staticmethod
    def get_verify_email(verify_id: str) -> str:
        """根据 verify_id 取回发送验证码时的邮箱（两步流程用）"""
        return _code_cache.get(f'email_verify_email:{verify_id}') or ''

    @staticmethod
    def verify_code(verify_id: str, code: str) -> bool:
        """校验验证码，一次性使用；每 verify_id 最多尝试 5 次，超限即销毁（防暴破）"""
        key = f'email_verify:{verify_id}'
        stored = _code_cache.get(key)
        if stored is None:
            return False
        if stored != code.strip():
            attempt_key = f'email_verify_attempt:{verify_id}'
            attempts = _code_cache.get(attempt_key, 0) + 1
            _code_cache.set(attempt_key, attempts, timeout=600)
            if attempts >= _cfg.get('VERIFICATION_MAX_ATTEMPTS', 5):
                _code_cache.delete(key)  # 超限销毁验证码
            return False
        _code_cache.delete(key)
        # 校验成功后清除活跃指针（后续发新码无需再作废）
        _code_cache.delete(EmailVerifyService._active_key(EmailVerifyService.get_verify_email(verify_id)))
        return True

    @staticmethod
    def send_admin_verify_code(email: str) -> dict:
        """发送管理员登录验证码（验证码仅发邮件，不返回给客户端；含发送频率限制 + 账号池轮换）。"""
        EmailVerifyService._enforce_send_limit(email)

        code = generate_numeric_verification_code()
        verify_id = uuid.uuid4().hex[:12]
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE', 600)

        # 发新作废旧：该邮箱旧验证码立即失效
        EmailVerifyService._invalidate_previous(email)
        _code_cache.set(f'email_verify:{verify_id}', code, timeout=expire_sec)
        _code_cache.set(f'email_verify_email:{verify_id}', email, timeout=expire_sec)
        _code_cache.set(EmailVerifyService._active_key(email), verify_id, timeout=expire_sec)
        EmailVerifyService._mark_sent(email)

        # 账号池轮换发送（失败抛异常，由视图返回 500）
        _deliver_verify_email(email, code, 'verify_code')

        return {'verify_id': verify_id, 'expire_seconds': expire_sec}

    @staticmethod
    def send_user_verify_code(email: str) -> dict:
        """发送用户注册验证码（含账号池轮换）。"""
        EmailVerifyService._enforce_send_limit(email)

        code = generate_numeric_verification_code()
        verify_id = uuid.uuid4().hex[:12]
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE', 600)

        EmailVerifyService._invalidate_previous(email)
        _code_cache.set(f'email_verify:{verify_id}', code, timeout=expire_sec)
        _code_cache.set(f'email_verify_email:{verify_id}', email, timeout=expire_sec)
        _code_cache.set(EmailVerifyService._active_key(email), verify_id, timeout=expire_sec)
        EmailVerifyService._mark_sent(email)

        # 账号池轮换发送（失败抛异常，由视图返回 500）
        _deliver_verify_email(email, code, 'verify_code')

        return {'verify_id': verify_id, 'expire_seconds': expire_sec}
