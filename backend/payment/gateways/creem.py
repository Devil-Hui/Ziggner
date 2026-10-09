"""
Creem 支付网关（Merchant of Record）。

为什么接Creem
--------------
中国大陆个人开发者无法注册 Stripe；PayPal 能开但提现到国内卡每笔固定 $35。
Creem 允许个人注册、直接结算到支付宝，且以法律上的卖方身份承担
VAT/ GST / 销售税代缴与拒付（chargeback）——数字模板最怕的就是拒付。

接口要点（与其它网关不同，务必注意）
------------------------------------
- 鉴权头是``x-api-key``，不是 ``Authorization: Bearer``
- 金额单位是**最小货币单位**（美元即美分），4990 = $49.90
- Checkout 是 Creem 侧的实体，本项目``pay_url`` 直接是它的 ``checkout_url``
- Webhook 签名头``creem-signature`` = hex(HMAC-SHA256(secret, 原始请求体))
  ——必须用未重新序列化的raw body 验签
"""
import hashlib
import hmac
import logging
from decimal import Decimal
from typing import Optional

import requests
from django.conf import settings

from payment.gateways.base import (
    BasePaymentGateway,
    GatewayRefundRejectedError,
    GatewayRefundUnknownError,
    PaymentGatewayFactory,
)

logger = logging.getLogger('biz')

# Creem 事件 → 内部事件。严格白名单：未命中的一律视为通知类，不推进支付状态
# （与 Stripe/PayPal 的处理原则一致，避免把 dispute.created 误判成退款成功）。
EVENT_MAP = {
    'checkout.completed': 'payment_completed',
    'refund.created': 'refund_completed',
    'dispute.created': 'payment_failed',
}


def _api_base() -> str:
    return getattr(settings, 'CREEM_API_BASE', 'https://api.creem.io').rstrip('/')


def _headers() -> dict:
    key = getattr(settings, 'CREEM_API_KEY', '')
    if not key:
        raise ValueError('GATEWAY_NOT_CONFIGURED: creem')
    return {'x-api-key': key, 'Content-Type': 'application/json'}


def _resolve_product_id(payment_no: str) -> str:
    """按订单首个商品反查 Creem product_id。

    本项目的下单入口只把 payment_no 传给网关（product_name 是 'Order <order_no>'
    这种占位串，不含商品标识），而 Creem 建 checkout 必须指定 product。
    因此在网关内回查订单 —— 走 payment_no → PaymentLog → Order → OrderItem。
    """
    mapping = getattr(settings, 'CREEM_PRODUCT_MAP', {}) or {}
    if not mapping:
        raise ValueError('GATEWAY_NOT_CONFIGURED: creem_product_map')

    from apps.payment.models import PaymentLog
    payment = (
        PaymentLog.objects.select_related('order')
        .filter(payment_no=payment_no)
        .first()
    )
    if not payment or not payment.order:
        raise ValueError(f'CREEM_ORDER_NOT_FOUND: {payment_no}')

    items = payment.order.items.select_related('sku').all()
    for item in items:
        # OrderItem 只冗余存了 spu_name 字符串，稳定的商品标识要从 SKU 上取 spu_id
        spu_id = getattr(getattr(item, 'sku', None), 'spu_id', None)
        product_id = mapping.get(str(spu_id)) if spu_id else None
        if product_id:
            return product_id

    raise ValueError(f'CREEM_PRODUCT_NOT_MAPPED: order={payment.order.order_no}')


@PaymentGatewayFactory.register('creem')
class CreemGateway(BasePaymentGateway):
    """Creem Checkout 网关"""

    def create_payment(self, payment_no: str, currency: str, amount: float,
                       product_name: str, success_url: str, cancel_url: str) -> dict:
        product_id = _resolve_product_id(payment_no)
        payload = {'product_id': product_id}
        if success_url:
            payload['success_url'] = success_url

        try:
            resp = requests.post(
                f'{_api_base()}/v1/checkouts',
                json=payload,
                headers=_headers(),
                timeout=15,
            )
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f'Creem checkout creation failed for {payment_no}: {e}')
            raise ValueError(f'CREEM_GATEWAY_ERROR: {e}')

        data = resp.json()
        checkout_id = data.get('checkout_id') or data.get('id', '')
        pay_url = data.get('checkout_url', '')
        if not checkout_id or not pay_url:
            raise ValueError('CREEM_RESPONSE_INVALID')

        logger.info(f'Creem checkout created: {checkout_id} for {payment_no}')
        return {'gateway_id': checkout_id, 'pay_url': pay_url}

    def retrieve_payment(self, gateway_payment_id: str) -> dict:
        try:
            resp = requests.get(
                f'{_api_base()}/v1/checkouts',
                params={'checkout_id': gateway_payment_id},
                headers=_headers(),
                timeout=15,
            )
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f'Creem checkout query failed {gateway_payment_id}: {e}')
            return {'status': 'unavailable'}

        data = resp.json()
        status = (data.get('status') or data.get('payment_status') or '').lower()
        # Creem 的 checkout 状态：completed / pending(处理中) / canceled / expired
        if status in ('completed', 'paid'):
            internal = 'succeeded'
        elif status in ('canceled', 'cancelled', 'expired', 'failed'):
            internal = 'failed'
        elif status in ('pending', 'processing'):
            internal = 'pending'
        else:
            internal = 'unknown'

        return {
            'status': internal,
            'amount': data.get('order', {}).get('amount'),
            'currency': data.get('order', {}).get('currency'),
        }

    def verify_webhook(self, raw_body: str, signature: str, headers: Optional[dict] = None) -> bool:
        """校验 ``creem-signature``：hex(HMAC-SHA256(secret, raw_body))。

        必须对**原始字节**验签，不能对解析后再 dumps 的 JSON 验签，
        键顺序/空格差异都会导致不匹配。
        """
        secret = getattr(settings, 'CREEM_WEBHOOK_SECRET', '')
        if not secret or not signature or not raw_body:
            return False
        expected = hmac.new(
            secret.encode('utf-8'),
            raw_body.encode('utf-8') if isinstance(raw_body, str) else raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature.strip())

    def create_refund(
        self,
        gateway_payment_id: str,
        amount: Decimal,
        currency: str,
        reason: str = '',
        idempotency_key: str = '',
    ) -> dict:
        payload = {
            'checkout_id': gateway_payment_id,
            # Creem 退款金额同样是最小单位（美分）
            'amount': int(round(float(amount) * 100)),
        }
        if reason:
            payload['reason'] = reason[:200]

        try:
            resp = requests.post(
                f'{_api_base()}/v1/refunds',
                json=payload,
                headers=_headers(),
                timeout=15,
            )
            resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            status = getattr(e.response, 'status_code', 0)
            if status in (400, 404, 422):
                raise GatewayRefundRejectedError(f'CREEM_REFUND_REJECTED: {e}')
            # 5xx / 网络异常：请求可能已到达网关，必须走对账，不能直接判失败
            raise GatewayRefundUnknownError(f'CREEM_REFUND_UNKNOWN: {e}')
        except requests.exceptions.RequestException as e:
            raise GatewayRefundUnknownError(f'CREEM_REFUND_UNKNOWN: {e}')

        data = resp.json()
        return {
            'gateway_refund_id': data.get('refund_id') or data.get('id', ''),
            'status': 'succeeded' if (data.get('status') or '').lower() in ('succeeded', 'processed') else 'pending',
            'amount': amount,
            'currency': currency,
        }

    def query_refund(self, gateway_request_id: str, gateway_refund_id: str = '') -> dict:
        """退款状态查询：Creem 未提供单查接口时返回 unavailable，交由对账兜底。"""
        return {'status': 'unavailable'}