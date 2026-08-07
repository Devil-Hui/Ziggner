"""Ziggner Payment Gateways — 注册所有网关实现"""
from payment.gateways.base import BasePaymentGateway, PaymentGatewayFactory

# 注册网关（import 触发 @PaymentGatewayFactory.register 装饰器）
from payment.gateways import stripe     # noqa: F401, F811
from payment.gateways import paypal     # noqa: F401, F811
from payment.gateways import alipay     # noqa: F401, F811
from payment.gateways import mock       # noqa: F401, F811
