import json
import logging
from http.client import HTTPSConnection
from urllib.parse import urlencode

from django.conf import settings


logger = logging.getLogger('security')

TURNSTILE_HOST = 'challenges.cloudflare.com'
TURNSTILE_PATH = '/turnstile/v0/siteverify'
MAX_RESPONSE_BYTES = 64 * 1024

# Cloudflare 测试密钥：本地/演示环境用它时，verify_turnstile 直接放行（不联网），
# 避免 dev 容器无外网导致登录卡在人机验证。生产使用真实密钥，此值不会命中。
TURNSTILE_TEST_SECRET = '1x00000000000000000000AA'


class TurnstileUnavailable(RuntimeError):
    pass


def verify_turnstile(token: str) -> bool:
    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        raise TurnstileUnavailable('Turnstile secret is not configured')
    # 本地/测试环境：使用 Cloudflare 测试密钥或 DJANGO_ENV=dev 时跳过真实网络校验，
    # 容器无外网也能登录；生产用真实密钥且 DJANGO_ENV=prod，不会命中此短路。
    if secret == TURNSTILE_TEST_SECRET or getattr(settings, 'DJANGO_ENV', '') == 'dev':
        return True
    if not token or len(token) > 4096:
        return False

    body = urlencode({'secret': secret, 'response': token}).encode('ascii')
    connection = None
    try:
        connection = HTTPSConnection(
            TURNSTILE_HOST,
            timeout=settings.TURNSTILE_VERIFY_TIMEOUT,
        )
        connection.request(
            'POST',
            TURNSTILE_PATH,
            body=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )
        response = connection.getresponse()
        payload_bytes = response.read(MAX_RESPONSE_BYTES + 1)
        if response.status != 200 or len(payload_bytes) > MAX_RESPONSE_BYTES:
            raise TurnstileUnavailable('Turnstile returned an invalid response')
        payload = json.loads(payload_bytes.decode('utf-8'))
        return payload.get('success') is True
    except TurnstileUnavailable:
        raise
    except (OSError, TimeoutError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
        logger.warning('Turnstile verification unavailable: %s', type(exc).__name__)
        raise TurnstileUnavailable('Turnstile verification unavailable') from exc
    finally:
        if connection is not None:
            connection.close()
