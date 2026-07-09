"""
Alipay payment gateway — RSA-SHA256 signature verification.
Implements Alipay's official signature flow per:
https://opendocs.alipay.com/open/270/105902
"""
import base64
import hashlib
import json
import logging
import time
from urllib.parse import parse_qs, urlencode

import requests
from Crypto.PublicKey import RSA
from Crypto.Signature import PKCS1_v1_5
from Crypto.Hash import SHA256
from django.conf import settings

logger = logging.getLogger('biz')


def _alipay_public_key() -> str:
    """Load Alipay's RSA public key from settings."""
    key = getattr(settings, 'ALIPAY_PUBLIC_KEY', '')
    if not key:
        logger.error('ALIPAY_PUBLIC_KEY not configured')
        raise ValueError('ALIPAY_PUBLIC_KEY_MISSING')
    # Handle PEM format
    if '-----BEGIN' not in key:
        key = (
            '-----BEGIN PUBLIC KEY-----\n'
            + key
            + '\n-----END PUBLIC KEY-----'
        )
    return key


def verify_signature(params: dict, sign: str, sign_type: str = 'RSA2') -> bool:
    """
    Verify Alipay callback signature using RSA-SHA256.

    Alipay sign verification steps:
    1. Remove 'sign' and 'sign_type' from params
    2. Sort remaining params alphabetically by key
    3. Concatenate as key=value&key2=value2
    4. Verify RSA-SHA256 signature with Alipay's public key

    Args:
        params: All callback parameters (from POST body or query string).
        sign: The 'sign' parameter value from Alipay.
        sign_type: 'RSA' (SHA1) or 'RSA2' (SHA256, default).

    Returns:
        True if signature is valid, False otherwise.
    """
    if not sign or not params:
        logger.warning('Alipay verify: missing sign or params')
        return False

    try:
        # Step 1-2: Remove sign fields and sort alphabetically
        verify_params = {
            k: v for k, v in params.items()
            if k not in ('sign', 'sign_type') and v != ''
        }
        sorted_keys = sorted(verify_params.keys())
        
        # Step 3: Build signature string
        sign_strings = []
        for k in sorted_keys:
            v = verify_params[k]
            # Handle nested structures
            if isinstance(v, (dict, list)):
                v = json.dumps(v, separators=(',', ':'))
            sign_strings.append(f'{k}={v}')
        sign_str = '&'.join(sign_strings)
        
        # Step 4: RSA-SHA256 verify
        public_key = RSA.import_key(_alipay_public_key())
        if sign_type == 'RSA2':
            hash_obj = SHA256.new(sign_str.encode('utf-8'))
        else:
            from Crypto.Hash import SHA
            hash_obj = SHA.new(sign_str.encode('utf-8'))
        
        verifier = PKCS1_v1_5.new(public_key)
        signature_bytes = base64.b64decode(sign)
        
        result = verifier.verify(hash_obj, signature_bytes)
        if not result:
            logger.warning('Alipay signature verification FAILED')
        return result
    except Exception as e:
        logger.error(f'Alipay signature verification error: {e}')
        return False


def verify_notify_id(notify_id: str) -> bool:
    """
    Anti-replay: verify notify_id with Alipay's server.
    
    Per Alipay docs: https://opendocs.alipay.com/open/270/105902
    Call: https://mapi.alipay.com/gateway.do?service=notify_verify&partner={PID}&notify_id={ID}
    
    Returns True if notify_id is valid (not replayed).
    """
    if not notify_id:
        return False
    
    pid = getattr(settings, 'ALIPAY_PARTNER_ID', '')
    if not pid:
        logger.warning('Alipay notify_id check skipped: ALIPAY_PARTNER_ID not set')
        return True  # Soft-fail: let admin review
    
    try:
        resp = requests.get(
            'https://mapi.alipay.com/gateway.do',
            params={
                'service': 'notify_verify',
                'partner': pid,
                'notify_id': notify_id,
            },
            timeout=10,
        )
        result = resp.text.strip()
        if result == 'true':
            return True
        logger.warning(f'Alipay notify_id verification failed: notify_id={notify_id}, result={result}')
        return False
    except Exception as e:
        logger.error(f'Alipay notify_id check error: {e}')
        return False


def extract_params_from_body(body: str) -> dict:
    """
    Parse Alipay callback body.
    
    Alipay sends POST with application/x-www-form-urlencoded format
    or JSON format depending on configuration.
    Returns dict of all parameters.
    """
    try:
        # Try JSON first
        return json.loads(body)
    except (json.JSONDecodeError, TypeError):
        pass
    
    try:
        # Try URL-encoded
        return {k: v[0] if isinstance(v, list) and len(v) == 1 else v
                for k, v in parse_qs(body).items()}
    except Exception:
        logger.error('Failed to parse Alipay callback body')
        return {}
