"""
腾讯云机器翻译（TMT）服务 — 商品多语言翻译。

使用腾讯云 TMT 的 TranslateText 接口（TC3-HMAC-SHA256 签名）。
配置项（环境变量）：
  - TENCENT_TMT_SECRET_ID   腾讯云 SecretId
  - TENCENT_TMT_SECRET_KEY  腾讯云 SecretKey
  - TENCENT_TMT_REGION      地域，默认 ap-guangzhou
  - TENCENT_TMT_PROJECT_ID  项目 ID，默认 0
"""
from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from logging import getLogger

from django.conf import settings

_logger = getLogger('biz')

TMT_HOST = 'tmt.tencentcloudapi.com'
TMT_SERVICE = 'tmt'
TMT_VERSION = '2018-03-21'
TMT_ACTION = 'TranslateText'
TMT_ACTION_LOWER = 'translatetext'

# 语言代码映射（腾讯云 TMT 支持的语言）
LANG_MAP = {
    'zh': 'zh',
    'en': 'en',
    'ar': 'ar',
}


def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def _sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def _sign(secret_id: str, secret_key: str, payload: dict) -> dict:
    """构造腾讯云 TC3-HMAC-SHA256 签名请求头。"""
    now = datetime.now(timezone.utc)
    timestamp = int(now.timestamp())
    date = now.strftime('%Y-%m-%d')

    # 1. 拼接规范请求串
    http_request_method = 'POST'
    canonical_uri = '/'
    canonical_query_string = ''
    canonical_headers = (
        f'content-type:application/json; charset=utf-8\n'
        f'host:{TMT_HOST}\n'
        f'x-tc-action:{TMT_ACTION_LOWER}\n'
    )
    signed_headers = 'content-type;host;x-tc-action'
    hashed_request_payload = _sha256_hex(json.dumps(payload, ensure_ascii=False))
    canonical_request = '\n'.join([
        http_request_method,
        canonical_uri,
        canonical_query_string,
        canonical_headers,
        signed_headers,
        hashed_request_payload,
    ])

    # 2. 拼接待签名字符串
    credential_scope = f'{date}/{TMT_SERVICE}/tc3_request'
    hashed_canonical_request = _sha256_hex(canonical_request)
    string_to_sign = '\n'.join([
        'TC3-HMAC-SHA256',
        str(timestamp),
        credential_scope,
        hashed_canonical_request,
    ])

    # 3. 计算签名
    secret_date = _hmac_sha256(('TC3' + secret_key).encode('utf-8'), date)
    secret_service = _hmac_sha256(secret_date, TMT_SERVICE)
    secret_signing = _hmac_sha256(secret_service, 'tc3_request')
    signature = hmac.new(secret_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    authorization = (
        f'TC3-HMAC-SHA256 Credential={secret_id}/{credential_scope}, '
        f'SignedHeaders={signed_headers}, Signature={signature}'
    )

    return {
        'Authorization': authorization,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': TMT_HOST,
        'X-TC-Action': TMT_ACTION,
        'X-TC-Timestamp': str(timestamp),
        'X-TC-Version': TMT_VERSION,
        'X-TC-Region': getattr(settings, 'TENCENT_TMT_REGION', 'ap-guangzhou'),
        'X-TC-RequestClient': 'ZiggnerBackend',
    }


def translate_text(text: str, source: str = 'zh', target: str = 'en') -> str:
    """调用腾讯云 TMT 翻译单段文本。

    Args:
        text: 待翻译文本。
        source: 源语言代码（zh/en/ar）。
        target: 目标语言代码（zh/en/ar）。

    Returns:
        翻译后的文本；失败时返回空字符串并记录日志。
    """
    text = (text or '').strip()
    if not text:
        return ''
    if source == target:
        return text

    secret_id = getattr(settings, 'TENCENT_TMT_SECRET_ID', '')
    secret_key = getattr(settings, 'TENCENT_TMT_SECRET_KEY', '')
    if not secret_id or not secret_key:
        _logger.warning('TENCENT_TMT_SECRET_ID / TENCENT_TMT_SECRET_KEY 未配置，跳过翻译')
        return ''

    payload = {
        'SourceText': text,
        'Source': LANG_MAP.get(source, source),
        'Target': LANG_MAP.get(target, target),
        'ProjectId': int(getattr(settings, 'TENCENT_TMT_PROJECT_ID', 0)),
    }

    try:
        import requests
        headers = _sign(secret_id, secret_key, payload)
        resp = requests.post(
            f'https://{TMT_HOST}/',
            headers=headers,
            data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
            timeout=15,
        )
        data = resp.json()
        if resp.status_code == 200 and data.get('Response', {}).get('TargetText'):
            return data['Response']['TargetText']
        _logger.warning('腾讯云翻译失败: %s %s', resp.status_code, data)
    except Exception as e:  # noqa: BLE001
        _logger.exception('腾讯云翻译异常: %s', e)
    return text


def translate_spu_fields(spu, source: str = 'zh') -> dict:
    """翻译 SPU 的 name/description 到 en/ar，返回 {字段: 译文}。

    仅翻译非空且目标字段为空的字段，避免覆盖用户已填写的译文。
    """
    result = {}
    for target, name_field, desc_field in (
        ('en', 'name_en', 'description_en'),
        ('ar', 'name_ar', 'description_ar'),
    ):
        if not getattr(spu, name_field) and spu.name:
            result[name_field] = translate_text(spu.name, source, target)
        if not getattr(spu, desc_field) and spu.description:
            result[desc_field] = translate_text(spu.description, source, target)
    return result