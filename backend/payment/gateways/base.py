"""
支付网关抽象基类 — 定义所有网关必须实现的接口。
新增网关只需继承 BasePaymentGateway 并实现所有抽象方法，
然后在 PaymentGatewayFactory.GATEWAYS 中注册。
"""
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Optional


class GatewayRefundUnknownError(RuntimeError):
    """The request may have reached the gateway, so its outcome must be reconciled."""


class GatewayRefundRejectedError(ValueError):
    """The gateway explicitly rejected the refund and no refund was created."""


class BasePaymentGateway(ABC):
    """支付网关统一抽象接口"""

    @abstractmethod
    def create_payment(self, payment_no: str, currency: str, amount: float,
                       product_name: str, success_url: str, cancel_url: str) -> dict:
        """创建支付订单，返回 { gateway_id, pay_url, ... }"""
        ...

    @abstractmethod
    def retrieve_payment(self, gateway_payment_id: str) -> dict:
        """查询支付状态，返回 { status, amount, currency }"""
        ...

    @abstractmethod
    def verify_webhook(self, raw_body: str, signature: str, headers: Optional[dict] = None) -> bool:
        """验签 webhook 回调"""
        ...

    @abstractmethod
    def create_refund(
        self,
        gateway_payment_id: str,
        amount: Decimal,
        currency: str,
        reason: str = '',
        idempotency_key: str = '',
    ) -> dict:
        """发起退款，返回 { gateway_refund_id, status, amount, currency }"""
        ...

    @abstractmethod
    def query_refund(self, gateway_request_id: str, gateway_refund_id: str = '') -> dict:
        """查询退款，返回明确状态或 {status: unavailable/unknown}。"""
        ...


class PaymentGatewayFactory:
    """支付网关工厂 — 根据 method 名称返回对应的网关实例"""

    GATEWAYS: dict[str, type[BasePaymentGateway]] = {}

    @classmethod
    def register(cls, method: str):
        """装饰器：注册网关"""
        def wrapper(gateway_cls: type[BasePaymentGateway]):
            cls.GATEWAYS[method] = gateway_cls
            return gateway_cls
        return wrapper

    @classmethod
    def get_gateway(cls, method: str) -> BasePaymentGateway:
        """获取网关实例，抛出 ValueError 如果未注册"""
        if method == 'mock':
            from django.conf import settings
            if not settings.ENABLE_MOCK_PAYMENT:
                raise ValueError('MOCK_PAYMENT_DISABLED')
        gateway_cls = cls.GATEWAYS.get(method)
        if not gateway_cls:
            raise ValueError(f'UNSUPPORTED_GATEWAY: {method}')
        return gateway_cls()
