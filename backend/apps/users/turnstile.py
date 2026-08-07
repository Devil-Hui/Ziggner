import json
import logging
from http.client import HTTPSConnection
from urllib.parse import urlencode

from django.conf import settings


logger = logging.getLogger('security')

TURNSTILE_HOST = 'challenges.cloudflare.com'
TURNSTILE_PATH = '/turnstile/v0/siteverify'
MAX_RESPONSE_BYTES = 64 * 1024


class TurnstileUnavailable(RuntimeError):
    pass


def verify_turnstile(token: str) -> bool:
    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        raise TurnstileUnavailable('Turnstile secret is not configured')
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
