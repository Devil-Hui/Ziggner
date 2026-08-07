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
        code_len = _cfg.get('SMS_CODE_LENGTH', 6)
        expire_sec = _cfg.get('SMS_CODE_EXPIRE_SECONDS', 300)
        rate_sec = _cfg.get('SMS_RATE_LIMIT_SECONDS', 60)

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
            f'This code will expire in {_cfg.get("SMS_CODE_EXPIRE_SECONDS", 300) // 60} minutes.'
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
        max_attempts = _cfg.get('SMS_MAX_VERIFY_ATTEMPTS', 5)

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
                timeout=_cfg.get('SMS_CODE_EXPIRE_SECONDS', 300),
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

class EmailVerifyService:
    """发送6位数字验证码到指定邮箱，使用 verify_id 做键"""

    @staticmethod
    def send_verify_code(email: str) -> dict:
        """发送6位数字验证码到指定邮箱"""
        code = generate_numeric_verification_code()
        verify_id = uuid.uuid4().hex[:12]
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE', 600)  # 10分钟

        # 存储验证码
        _code_cache.set(f'email_verify:{verify_id}', code, timeout=expire_sec)

        # 发送邮件
        subject = 'Ziggner - Email Verification'
        message = f'Your verification code is: {code}\nValid for 10 minutes.'
        html_message = f'''
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff;border-radius:8px;">
  <div style="font-size:22px;font-weight:600;margin-bottom:24px;letter-spacing:-0.5px;">Ziggner</div>
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
</div>'''

        try:
            send_mail(
                subject=subject,
                message=message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            logger.warning(f'[EMAIL] Failed to send verification code to {email}: {e}')

        result = {'verify_id': verify_id, 'expire_seconds': expire_sec, 'code': code}
        return result

    @staticmethod
    def verify_code(verify_id: str, code: str) -> bool:
        """校验验证码，一次性使用"""
        key = f'email_verify:{verify_id}'
        stored = _code_cache.get(key)
        if stored is None:
            return False
        if stored != code.strip():
            return False
        _code_cache.delete(key)
        return True

    @staticmethod
    def send_admin_verify_code(email: str) -> dict:
        """使用管理后台邮箱发送验证码。"""
        from django.core.mail import EmailMultiAlternatives
        from django.core.mail import get_connection

        code = generate_numeric_verification_code()
        verify_id = uuid.uuid4().hex[:12]
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE', 600)

        _code_cache.set(f'email_verify:{verify_id}', code, timeout=expire_sec)

        html = f'''
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff;border-radius:8px;">
  <div style="font-size:22px;font-weight:600;margin-bottom:24px;letter-spacing:-0.5px;">Ziggner</div>
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
</div>'''

        msg = EmailMultiAlternatives(
            subject='Ziggner - Email Verification',
            body=f'Your verification code is: {code}',
            from_email=settings.ADMIN_DEFAULT_FROM_EMAIL,
            to=[email],
            connection=None,
        )
        msg.attach_alternative(html, 'text/html')

        conn = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=settings.ADMIN_EMAIL_HOST,
            port=settings.ADMIN_EMAIL_PORT,
            username=settings.ADMIN_EMAIL_HOST_USER,
            password=settings.ADMIN_EMAIL_HOST_PASSWORD,
            use_ssl=settings.ADMIN_EMAIL_USE_SSL,
        )
        msg.connection = conn
        try:
            msg.send(fail_silently=False)
        except Exception as e:
            logger.warning(f'[EMAIL] Failed to send admin verify code to {email}: {e}')

        return {'verify_id': verify_id, 'expire_seconds': expire_sec}

    @staticmethod
    def send_user_verify_code(email: str) -> dict:
        """使用用户注册邮箱发送验证码（暂用默认配置）。"""
        from django.core.mail import EmailMultiAlternatives
        from django.core.mail import get_connection

        code = generate_numeric_verification_code()
        verify_id = uuid.uuid4().hex[:12]
        expire_sec = _cfg.get('VERIFICATION_CODE_EXPIRE', 600)

        _code_cache.set(f'email_verify:{verify_id}', code, timeout=expire_sec)

        html = f'''
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff;border-radius:8px;">
  <div style="font-size:22px;font-weight:600;margin-bottom:24px;letter-spacing:-0.5px;">Ziggner</div>
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
</div>'''

        msg = EmailMultiAlternatives(
            subject='Ziggner - Email Verification',
            body=f'Your verification code is: {code}',
            from_email=settings.USER_DEFAULT_FROM_EMAIL,
            to=[email],
            connection=None,
        )
        msg.attach_alternative(html, 'text/html')

        conn = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=settings.USER_EMAIL_HOST,
            port=settings.USER_EMAIL_PORT,
            username=settings.USER_EMAIL_HOST_USER,
            password=settings.USER_EMAIL_HOST_PASSWORD,
            use_ssl=settings.USER_EMAIL_USE_SSL,
        )
        msg.connection = conn
        try:
            msg.send(fail_silently=False)
        except Exception as e:
            logger.warning(f'[EMAIL] Failed to send user verify code to {email}: {e}')

        return {'verify_id': verify_id, 'expire_seconds': expire_sec}
