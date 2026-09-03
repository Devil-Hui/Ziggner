"""
邮箱验证码服务 —— 三阶段验证流程。

三阶段:
  1. send_code(email)       → 发送6位验证码到邮箱（SMTP + Celery异步）
  2. verify_code(email,code) → 校验验证码，成功后 issue_verification_token()
  3. register(token, ...)   → 解码令牌获取已验证邮箱，完成注册

验证码存 Redis (DB 2)，令牌为 JWT（无需 Redis）。
"""
import logging
import socket as _socket
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone

import jwt
from django.conf import settings
from django.core.cache import caches
from django.core.mail import send_mail
from django.utils.crypto import get_random_string


def _patch_gmail_proxy() -> None:
    """Gmail SMTP（smtp.gmail.com）在国内网络不可直连。

    对发往 *.gmail.com 的连接走宿主机 HTTP 代理（host.docker.internal:10808）转发；
    其余主机保持直连。smtplib 通过 socket.create_connection 建连，此处全局 patch 一次。
    """
    try:
        import socks  # PySocks
    except ImportError:
        return
    _orig_create_connection = _socket.create_connection
    _PROXY_HOST = 'host.docker.internal'
    _PROXY_PORT = 10808

    def _proxied_create_connection(address, timeout=None, source_address=None):
        host = address[0] if isinstance(address, tuple) else str(address)
        if 'gmail.com' in host:
            # PySocks 的 socksocket.settimeout 在部分版本有兼容问题，建连后由 smtplib 自行管理超时
            sock = socks.socksocket()
            sock.set_proxy(socks.HTTP, addr=_PROXY_HOST, port=_PROXY_PORT)
            sock.connect(address)
            return sock
        return _orig_create_connection(address, timeout, source_address)

    _socket.create_connection = _proxied_create_connection


_patch_gmail_proxy()


from apps.users.models import EmailTemplate
from utils.html_sanitize import sanitize_email_html


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
        rendered = tpl.render(context)
        # 出口消毒：兜底历史遗留的未消毒模板数据（入库消毒仅覆盖新增/修改）
        rendered['html'] = sanitize_email_html(rendered.get('html') or '')
        return rendered
    # 内置默认（数据库模板未配置时）
    if template_type == 'admin_welcome':
        platform_name = context.get('platform_name', 'Ziggner')
        year = context.get('year', str(datetime.now(dt_timezone.utc).year))
        return {
            'subject': f'欢迎加入 {platform_name} 管理后台',
            'html': (
                f'<div style="max-width:480px;margin:0 auto;padding:32px 24px;'
                f'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;'
                f'color:#1a1a2e;background:#fff;border-radius:8px;">'
                f'<div style="font-size:22px;font-weight:600;">{platform_name}</div>'
                f'<div style="font-size:18px;font-weight:600;margin:12px 0;">'
                f'欢迎，{context.get("real_name", context.get("username", ""))}！</div>'
                f'<div style="font-size:14px;line-height:1.7;color:#444;">'
                f'您的后台管理员账号已创建成功。请验证邮箱以接收系统通知与登录验证码：'
                f'<br/><a href="{context.get("verify_url", "")}">{context.get("verify_url", "")}</a>'
                f'</div>'
                f'<div style="font-size:11px;color:#aaa;text-align:center;margin-top:24px;">'
                f'© {year} {platform_name}</div>'
                f'</div>'
            ),
            'text': (
                f'欢迎加入 {platform_name}！\n'
                f'您的后台管理员账号已创建成功。请验证邮箱：\n'
                f'{context.get("verify_url", "")}\n© {year} {platform_name}'
            ),
        }
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


def _send_template_with_account(account: dict, recipient: str, template_type: str, context: dict) -> None:
    """用指定账号发送模板邮件（SMTP 失败会抛异常，由调用方切换账号）。

    context 为模板占位符字典（如 {'code': '123456'} 或完整的欢迎邮件上下文）。
    """
    from django.core.mail import EmailMultiAlternatives, get_connection

    rendered = _render_template(template_type, context)
    msg = EmailMultiAlternatives(
        subject=rendered['subject'],
        body=rendered['text'] or '',
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
        # 显式连接/读写超时：Gmail 网络不稳定时快速失败并切换账号，避免接口长时间挂起
        timeout=int(account.get('timeout', 3)),
    )
    msg.connection = conn
    msg.send(fail_silently=False)


def _send_with_account(account: dict, recipient: str, code: str, template_type: str) -> None:
    """用指定账号发送验证码邮件（兼容旧调用；委托通用模板发送）。"""
    _send_template_with_account(account, recipient, template_type, {'code': code})


# 国内邮箱域名集合（智能路由：国内收件人优先用国内账号发，国外用国外账号）
_DOMESTIC_MAIL_DOMAINS = {
    '163.com', '126.com', 'yeah.net', 'qq.com', 'foxmail.com', '139.com',
    'sina.com', 'sohu.com', 'vip.qq.com', 'gmail.cn', 'outlook.cn',
}


def _is_domestic_email(email: str) -> bool:
    """按收件/发件地址判断是否为国内邮箱（域名匹配或 .cn/.com.cn 后缀）"""
    if '@' not in email:
        return False
    domain = email.rsplit('@', 1)[1].lower().strip()
    return domain in _DOMESTIC_MAIL_DOMAINS or domain.endswith(('.cn', '.com.cn'))


def _deliver_template_email(recipient: str, template_type: str, context: dict) -> None:
    """多发件账号池：智能路由 + 额度感知轮换发送（通用模板发送）。

    - 路由：收件人国内邮箱 → 国内账号优先（163）；国外邮箱 → 国外账号优先（Gmail），
      各自走稳定通道（国内网络访问 Gmail 不稳定，反之亦然）
    - 跳过当日已达 daily_limit 的账号
    - 发送失败自动切换下一个账号（兜底保证送达）
    - 全部失败抛异常（调用方返回 500，不再假装成功）

    context 为模板占位符字典（如 {'code': '123456'} 或完整欢迎邮件上下文）。
    """
    accounts = list(getattr(settings, 'EMAIL_ACCOUNTS', None) or [])
    if not accounts:
        raise RuntimeError('no email account configured')

    # 智能路由排序：账号地域与收件人地域匹配优先，其次按当日用量升序（最空闲优先）
    domestic_recipient = _is_domestic_email(recipient)

    def _route_key(acc: dict):
        domestic_account = _is_domestic_email(str(acc.get('user', '')))
        return (0 if domestic_account == domestic_recipient else 1, _account_usage(acc))

    accounts.sort(key=_route_key)
    errors = []
    for account in accounts:
        usage = _account_usage(account)
        if usage >= int(account.get('daily_limit', 500)):
            errors.append(f"{account.get('user')}: daily limit {usage} reached")
            continue
        try:
            _send_template_with_account(account, recipient, template_type, context)
        except Exception as e:
            logger.warning(f'[EMAIL] account {account.get("user")} failed to send to {recipient}: {e}')
            errors.append(f"{account.get('user')}: {e}")
            continue
        # 发送成功 → 记录该账号当日用量
        _code_cache.set(_account_day_key(account.get('user', '')), usage + 1, timeout=86400)
        return
    msg = 'all email accounts failed: ' + ('; '.join(errors) if errors else 'no usable account')
    raise RuntimeError(msg)


def _deliver_verify_email(recipient: str, code: str, template_type: str = 'verify_code') -> None:
    """多发件账号池：发送验证码邮件（兼容旧调用；委托通用模板发送）。"""
    _deliver_template_email(recipient, template_type, {'code': code})


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
    # 管理员欢迎邮件 + 邮箱验证令牌（JWT 链接，非 Redis 验证码）
    # ============================================================

    @staticmethod
    def issue_admin_email_verify_token(user) -> str:
        """签发管理员邮箱验证 JWT 令牌（欢迎邮件链接用）。

        Token payload:
            account_no: 对外账户号
            email:      用户邮箱（小写）
            type:       'admin_email_verify'
            exp:        默认 7 天
        """
        expire_minutes = _cfg.get('ADMIN_EMAIL_VERIFY_TOKEN_EXPIRE_MINUTES', 60 * 24 * 7)
        now = datetime.now(dt_timezone.utc)
        account_no = ''
        try:
            account_no = user.profile.account_no
        except Exception:
            account_no = ''
        payload = {
            'account_no': account_no,
            'email': (user.email or '').lower(),
            'type': 'admin_email_verify',
            'iat': now,
            'exp': now + timedelta(minutes=expire_minutes),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    @staticmethod
    def decode_admin_email_verify_token(token: str) -> dict:
        """解码并校验管理员邮箱验证令牌，返回 payload dict。

        Raises:
            ValueError: 令牌无效 / 已过期 / 类型不符
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=['HS256'],
                options={'require': ['exp', 'email', 'type']},
            )
        except jwt.ExpiredSignatureError:
            raise ValueError('邮箱验证链接已过期，请重新获取')
        except jwt.InvalidTokenError:
            raise ValueError('无效的邮箱验证链接')

        if payload.get('type') != 'admin_email_verify':
            raise ValueError('令牌类型不正确')

        return payload

    @staticmethod
    def send_admin_welcome_email(user, context: dict | None = None) -> None:
        """渲染 admin_welcome 模板并通过多账号池发送欢迎邮件。

        context 可携带 role / login_url / support_url 等；缺失时以 settings 默认值补全。
        验证令牌注入 verify_url，供模板渲染「验证邮箱」按钮。
        发送失败抛异常（由 Celery 任务 try/except 兜底，不影响建号）。
        """
        from django.utils import timezone as _tz

        context = dict(context or {})
        platform_name = getattr(settings, 'PLATFORM_NAME', 'Ziggner')
        login_url = getattr(settings, 'FRONTEND_URL', 'https://admin.ziggner.com')
        support_url = getattr(settings, 'SUPPORT_URL', 'https://ziggner.com/support')

        base = {
            'platform_name': platform_name,
            'real_name': (f"{user.first_name} {user.last_name}".strip() or user.username),
            'username': user.username,
            'email': user.email,
            'role': context.get('role', 'customer'),
            'login_url': login_url,
            'support_url': support_url,
            'year': str(_tz.now().year),
        }
        base.update(context)

        # 验证令牌链接（供新管理员一键验证邮箱）
        token = EmailService.issue_admin_email_verify_token(user)
        base['verify_url'] = f"{login_url.rstrip('/')}/verify-email?token={token}"

        _deliver_template_email(user.email, 'admin_welcome', base)


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
        if getattr(settings, 'ENABLE_MOCK_PAYMENT', False) or settings.DEBUG:
            result['code'] = code
        return result

    @staticmethod
    def get_verify_email(verify_id: str) -> str:
        """根据 verify_id 取回发送验证码时的邮箱（两步流程用）"""
        return _code_cache.get(f'email_verify_email:{verify_id}') or ''

    @staticmethod
    def verify_code(verify_id: str, code: str, consume: bool = True) -> bool:
        """校验验证码。

        Args:
            verify_id: 发送验证码时返回的 verify_id
            code: 用户输入的验证码
            consume: True=校验成功后立即销毁（注册等一次性场景）；
                     False=仅校验不销毁（管理员登录等需容错场景，后续调 consume_code 显式消费）

        安全保障：
            - 验证码 10 分钟自动过期（Redis TTL）
            - 每 verify_id 最多尝试 5 次，超限自动销毁（防暴破）
            - 发新码时旧码立即作废
            - 60s 发送频率限制 + 全局日额度限制
        """
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
        if consume:
            EmailVerifyService.consume_code(verify_id)
        return True

    @staticmethod
    def consume_code(verify_id: str) -> None:
        """显式消费验证码（登录成功后调用，使验证码不可再用于后续请求）"""
        _code_cache.delete(f'email_verify:{verify_id}')
        # 清除活跃指针（后续发新码无需再作废）
        email = EmailVerifyService.get_verify_email(verify_id)
        if email:
            _code_cache.delete(EmailVerifyService._active_key(email))

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

        result = {'verify_id': verify_id, 'expire_seconds': expire_sec}
        if getattr(settings, 'ENABLE_MOCK_PAYMENT', False) or settings.DEBUG:
            result['code'] = code
        return result

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
