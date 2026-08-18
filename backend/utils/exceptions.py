"""
Ziggner 全局异常体系（统一错误处理） —— 唯一错误来源。

设计目标
--------
1. 错误分类（ErrorCategory）：CLIENT / AUTH / BUSINESS / SERVER / THIRDPARTY。
2. 全局错误码注册表（ErrorCodes）：每个错误码 = (code, http_status, default_message, category)，
   作为前后端共认的单一事实来源，杜绝散落的魔法字符串。
3. 异常类层次清晰（均继承 rest_framework.exceptions.APIException，可被 DRF EXCEPTION_HANDLER 捕获）：

    AppException                      # 基类，携带 error_code + category，并修正 HTTP 状态码
      ├─ ClientException   (4xx)
      │    ├─ ValidationException
      │    ├─ AuthException
      │    │    └─ PermissionException
      │    ├─ NotFoundException
      │    ├─ ConflictException
      │    ├─ RateLimitException
      │    └─ BusinessException        # 业务语义错误（如 STOCK_INSUFFICIENT）
      └─ ServerException   (5xx)
           └─ ThirdPartyException

4. 统一引用方式：
       from utils.exceptions import BusinessException, ErrorCodes, raise_business, api_error_response
       raise BusinessException(ErrorCodes.STOCK_INSUFFICIENT, detail='库存不足')

5. 与现有架构完全兼容：
   - DRF EXCEPTION_HANDLER（utils.api_exception.custom_exception_handler）与
     CustomExceptionMiddleware 共用 exception_to_envelope / build_error_envelope，
     产生完全一致的错误信封：{code, data, status, message, detail, error_code, category, request_id, details}。
   - 旧式 BusinessException(detail=..., code=..., error_code='STOCK_INSUFFICIENT') 仍可用。
"""
from typing import NamedTuple

from rest_framework import exceptions as drf_exceptions
from rest_framework.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_405_METHOD_NOT_ALLOWED,
    HTTP_409_CONFLICT,
    HTTP_429_TOO_MANY_REQUESTS,
    HTTP_500_INTERNAL_SERVER_ERROR,
    HTTP_502_BAD_GATEWAY,
    HTTP_503_SERVICE_UNAVAILABLE,
)


# ============================================================
# 1) 错误分类
# ============================================================
class ErrorCategory:
    CLIENT = 'CLIENT'          # 客户端错误（4xx，参数/校验）
    AUTH = 'AUTH'              # 认证 / 授权
    BUSINESS = 'BUSINESS'      # 业务规则错误（4xx 语义）
    SERVER = 'SERVER'          # 服务端错误（5xx）
    THIRDPARTY = 'THIRDPARTY'  # 第三方服务（支付等）


# ============================================================
# 2) 错误码注册表
# ============================================================
class ErrorCode(NamedTuple):
    code: str
    http_status: int
    default_message: str
    category: str


class ErrorCodes:
    TURNSTILE_REQUIRED = ErrorCode('TURNSTILE_REQUIRED', HTTP_400_BAD_REQUEST,
                                   'Complete the security verification.', ErrorCategory.CLIENT)
    TURNSTILE_INVALID = ErrorCode('TURNSTILE_INVALID', HTTP_400_BAD_REQUEST,
                                  'Security verification is invalid or expired.', ErrorCategory.CLIENT)
    TURNSTILE_UNAVAILABLE = ErrorCode('TURNSTILE_UNAVAILABLE', HTTP_503_SERVICE_UNAVAILABLE,
                                      'Security verification is temporarily unavailable.',
                                      ErrorCategory.THIRDPARTY)
    # ── 系统 / 服务端 (5xx) ──
    INTERNAL_ERROR = ErrorCode('INTERNAL_ERROR', HTTP_500_INTERNAL_SERVER_ERROR,
                               '服务器内部错误', ErrorCategory.SERVER)
    SERVICE_UNAVAILABLE = ErrorCode('SERVICE_UNAVAILABLE', HTTP_503_SERVICE_UNAVAILABLE,
                                    '服务暂时不可用，请稍后再试', ErrorCategory.SERVER)
    THIRD_PARTY_ERROR = ErrorCode('THIRD_PARTY_ERROR', HTTP_502_BAD_GATEWAY,
                                  '第三方服务异常', ErrorCategory.THIRDPARTY)

    # ── 客户端 / 校验 (4xx) ──
    VALIDATION_ERROR = ErrorCode('VALIDATION_ERROR', HTTP_400_BAD_REQUEST,
                                 '请求参数校验失败', ErrorCategory.CLIENT)
    BAD_REQUEST = ErrorCode('BAD_REQUEST', HTTP_400_BAD_REQUEST,
                            '请求格式错误', ErrorCategory.CLIENT)
    METHOD_NOT_ALLOWED = ErrorCode('METHOD_NOT_ALLOWED', HTTP_405_METHOD_NOT_ALLOWED,
                                   '请求方法不被允许', ErrorCategory.CLIENT)

    # ── 认证 / 授权 ──
    UNAUTHORIZED = ErrorCode('UNAUTHORIZED', HTTP_401_UNAUTHORIZED,
                             '请先登录', ErrorCategory.AUTH)
    AUTH_FAILED = ErrorCode('AUTH_FAILED', HTTP_401_UNAUTHORIZED,
                            '认证失败，请重新登录', ErrorCategory.AUTH)
    TOKEN_EXPIRED = ErrorCode('TOKEN_EXPIRED', HTTP_401_UNAUTHORIZED,
                              '登录已过期，请重新登录', ErrorCategory.AUTH)
    TOKEN_BLACKLISTED = ErrorCode('TOKEN_BLACKLISTED', HTTP_401_UNAUTHORIZED,
                                  '登录已失效，请重新登录', ErrorCategory.AUTH)
    PERMISSION_DENIED = ErrorCode('PERMISSION_DENIED', HTTP_403_FORBIDDEN,
                                  '权限不足，无法执行该操作', ErrorCategory.AUTH)
    # 会话因权限/凭证变更而失效，必须重新登录（安全戳不匹配）
    REAUTH_REQUIRED = ErrorCode('REAUTH_REQUIRED', HTTP_401_UNAUTHORIZED,
                                '您的权限或登录状态已变更，请重新登录', ErrorCategory.AUTH)

    # ── 资源 ──
    NOT_FOUND = ErrorCode('NOT_FOUND', HTTP_404_NOT_FOUND,
                          '请求的资源不存在', ErrorCategory.CLIENT)
    CONFLICT = ErrorCode('CONFLICT', HTTP_409_CONFLICT,
                         '资源状态冲突', ErrorCategory.CLIENT)
    RATE_LIMITED = ErrorCode('RATE_LIMITED', HTTP_429_TOO_MANY_REQUESTS,
                             '请求过于频繁，请稍后再试', ErrorCategory.CLIENT)

    # ── 业务规则（商品 / 库存 / 订单 / 支付 / 优惠 / 收藏） ──
    STOCK_INSUFFICIENT = ErrorCode('STOCK_INSUFFICIENT', HTTP_400_BAD_REQUEST,
                                   '库存不足', ErrorCategory.BUSINESS)
    SKU_NOT_AVAILABLE = ErrorCode('SKU_NOT_AVAILABLE', HTTP_400_BAD_REQUEST,
                                  '该规格暂时不可售', ErrorCategory.BUSINESS)
    CART_EMPTY = ErrorCode('CART_EMPTY', HTTP_400_BAD_REQUEST,
                           '购物车为空，无法结算', ErrorCategory.BUSINESS)
    NO_ITEMS_SELECTED = ErrorCode('NO_ITEMS_SELECTED', HTTP_400_BAD_REQUEST,
                                  '未选择任何商品', ErrorCategory.BUSINESS)
    ORDER_NOT_FOUND = ErrorCode('ORDER_NOT_FOUND', HTTP_404_NOT_FOUND,
                                '订单不存在', ErrorCategory.BUSINESS)
    ORDER_NOT_PAYABLE = ErrorCode('ORDER_NOT_PAYABLE', HTTP_400_BAD_REQUEST,
                                  '当前订单状态不可支付', ErrorCategory.BUSINESS)
    ORDER_NOT_CANCELABLE = ErrorCode('ORDER_NOT_CANCELABLE', HTTP_400_BAD_REQUEST,
                                     '当前订单状态不可取消', ErrorCategory.BUSINESS)
    ORDER_DUPLICATE = ErrorCode('ORDER_DUPLICATE', HTTP_409_CONFLICT,
                                '订单已提交，请勿重复操作', ErrorCategory.BUSINESS)
    PAYMENT_FAILED = ErrorCode('PAYMENT_FAILED', HTTP_400_BAD_REQUEST,
                               '支付失败，请重试', ErrorCategory.BUSINESS)
    PAYMENT_DUPLICATE = ErrorCode('PAYMENT_DUPLICATE', HTTP_409_CONFLICT,
                                  '订单已支付，请勿重复支付', ErrorCategory.BUSINESS)
    PAYMENT_AMOUNT_MISMATCH = ErrorCode('PAYMENT_AMOUNT_MISMATCH', HTTP_400_BAD_REQUEST,
                                        '支付金额与订单不符', ErrorCategory.BUSINESS)
    PAYMENT_UNSUPPORTED = ErrorCode('PAYMENT_UNSUPPORTED', HTTP_400_BAD_REQUEST,
                                    '不支持的支付方式', ErrorCategory.BUSINESS)
    COUPON_INVALID = ErrorCode('COUPON_INVALID', HTTP_400_BAD_REQUEST,
                               '优惠券不可用', ErrorCategory.BUSINESS)
    ADDRESS_INVALID = ErrorCode('ADDRESS_INVALID', HTTP_400_BAD_REQUEST,
                                '收货地址信息不完整', ErrorCategory.BUSINESS)
    FAVORITE_CONFLICT = ErrorCode('FAVORITE_CONFLICT', HTTP_409_CONFLICT,
                                  '该商品已在收藏夹中', ErrorCategory.BUSINESS)
    # 售后
    AFTER_SALE_UNAVAILABLE = ErrorCode('AFTER_SALE_UNAVAILABLE', HTTP_400_BAD_REQUEST,
                                       '该订单不可申请售后', ErrorCategory.BUSINESS)
    AFTER_SALE_AMOUNT_EXCEEDED = ErrorCode('AFTER_SALE_AMOUNT_EXCEEDED', HTTP_400_BAD_REQUEST,
                                           '退款金额超过订单实付金额', ErrorCategory.BUSINESS)
    AFTER_SALE_NOT_FOUND = ErrorCode('AFTER_SALE_NOT_FOUND', HTTP_404_NOT_FOUND,
                                     '售后申请不存在', ErrorCategory.BUSINESS)

    @classmethod
    def get(cls, code: str) -> ErrorCode:
        """按字符串错误码查找注册表；未命中回退 INTERNAL_ERROR。"""
        for val in vars(cls).values():
            if isinstance(val, ErrorCode) and val.code == code:
                return val
        return cls.INTERNAL_ERROR

    @classmethod
    def all(cls):
        return [v for v in vars(cls).values() if isinstance(v, ErrorCode)]


# ============================================================
# 3) 异常类层次
# ============================================================
class AppException(drf_exceptions.APIException):
    """
    所有应用异常的基类。携带稳定的 error_code 与 category，并修正 HTTP 状态码
    （APIException 默认用 self.status_code，这里确保与错误码声明一致）。
    """
    status_code = HTTP_500_INTERNAL_SERVER_ERROR
    default_code = 'INTERNAL_ERROR'

    def __init__(self, error_code: ErrorCode = ErrorCodes.INTERNAL_ERROR, detail=None, code=None):
        self.error_code_obj = error_code
        self.error_code = error_code.code
        self.category = error_code.category
        super().__init__(detail=detail if detail is not None else error_code.default_message)
        # 确保 HTTP 状态码与错误码声明一致（默认 APIException 用 self.status_code）
        self.status_code = code if code is not None else error_code.http_status


class ClientException(AppException):
    def __init__(self, error_code=ErrorCodes.BAD_REQUEST, detail=None):
        super().__init__(error_code, detail)


class ServerException(AppException):
    def __init__(self, error_code=ErrorCodes.INTERNAL_ERROR, detail=None):
        super().__init__(error_code, detail)


class ValidationException(ClientException):
    def __init__(self, detail=None, error_code=ErrorCodes.VALIDATION_ERROR):
        super().__init__(error_code, detail)


class AuthException(ClientException):
    def __init__(self, error_code=ErrorCodes.UNAUTHORIZED, detail=None):
        super().__init__(error_code, detail)


class PermissionException(AuthException):
    def __init__(self, detail=None, error_code=ErrorCodes.PERMISSION_DENIED):
        super().__init__(error_code, detail)


class NotFoundException(ClientException):
    def __init__(self, detail=None, error_code=ErrorCodes.NOT_FOUND):
        super().__init__(error_code, detail)


class ConflictException(ClientException):
    def __init__(self, error_code=ErrorCodes.CONFLICT, detail=None):
        super().__init__(error_code, detail)


class RateLimitException(ClientException):
    def __init__(self, error_code=ErrorCodes.RATE_LIMITED, detail=None):
        super().__init__(error_code, detail)


class BusinessException(ClientException):
    """
    业务异常：携带语义化 error_code（如 STOCK_INSUFFICIENT）。

    兼容旧签名：BusinessException(detail='库存不足', code=400, error_code='STOCK_INSUFFICIENT')
    """
    def __init__(self, error_code=None, detail=None, code=None):
        if isinstance(error_code, str):
            ec = ErrorCodes.get(error_code)
            super().__init__(ec, detail)
            if code is not None:
                self.status_code = code
        elif isinstance(error_code, ErrorCode):
            super().__init__(error_code, detail)
        else:
            super().__init__(ErrorCodes.BAD_REQUEST, detail)


class ThirdPartyException(ServerException):
    def __init__(self, error_code=ErrorCodes.THIRD_PARTY_ERROR, detail=None):
        super().__init__(error_code, detail)


# ============================================================
# 4) 工具函数
# ============================================================
def flatten_errors(detail, parent_field=''):
    """递归展平所有层级的 DRF 错误信息为可读字符串。"""
    errors = []
    if isinstance(detail, list):
        for error in detail:
            if parent_field:
                errors.append(f"{parent_field}: {error}")
            else:
                errors.append(str(error))
    elif isinstance(detail, dict):
        for field, sub_detail in detail.items():
            if field == 'non_field_errors':
                for sub in sub_detail:
                    errors.append(str(sub))
            else:
                nested = f"{parent_field}.{field}" if parent_field else field
                errors.append(flatten_errors(sub_detail, nested))
    else:
        if parent_field:
            errors.append(f"{parent_field}: {detail}")
        else:
            errors.append(str(detail))
    return '；'.join(errors) if errors else '未知错误'


def build_error_envelope(*, error_code: str, message: str, status_code: int,
                          request_id=None, details=None, category=None, data=None):
    """构造统一错误信封。detail 与 message 同值，兼容前端读取 .detail 的历史代码。"""
    return {
        'code': error_code,
        'http_status': status_code,
        'data': data,
        'status': 'error',
        'message': message,
        'detail': message,
        'error_code': error_code,
        'category': category,
        'request_id': request_id,
        'details': details if details is not None else {},
    }


def exception_to_envelope(exc, request_id=None, *, include_details=False, debug=False):
    """
    将任意异常映射为统一错误信封（dict）。DRF EXCEPTION_HANDLER 与
    CustomExceptionMiddleware 共用，保证信封结构完全一致。
    """
    import traceback
    from django.core.exceptions import (
        ValidationError as DjangoValidationError,
        PermissionDenied as DjangoPermissionDenied,
    )
    from django.http import Http404

    details = {}

    # 1) 应用异常（携带 error_code）
    if isinstance(exc, AppException):
        code = exc.error_code
        http_status = exc.status_code
        message = str(exc.detail)
        category = exc.category
    # 2) DRF 校验错误
    elif isinstance(exc, drf_exceptions.ValidationError):
        code = ErrorCodes.VALIDATION_ERROR.code
        http_status = exc.status_code or HTTP_400_BAD_REQUEST
        message = flatten_errors(exc.detail)
        category = ErrorCategory.CLIENT
        details = exc.detail
    # 3) DRF 认证 / 授权 / 未找到
    elif isinstance(exc, drf_exceptions.NotAuthenticated):
        code = ErrorCodes.UNAUTHORIZED.code
        http_status = HTTP_401_UNAUTHORIZED
        message = ErrorCodes.UNAUTHORIZED.default_message
        category = ErrorCategory.AUTH
    elif isinstance(exc, drf_exceptions.AuthenticationFailed):
        code = ErrorCodes.AUTH_FAILED.code
        http_status = HTTP_401_UNAUTHORIZED
        raw = exc.detail
        message = (raw.get('detail') if isinstance(raw, dict)
                   else (str(raw) if raw else ErrorCodes.AUTH_FAILED.default_message))
        if not message or message == exc.default_detail:
            message = '认证失败，请重新登录'
        category = ErrorCategory.AUTH
    elif isinstance(exc, drf_exceptions.PermissionDenied):
        code = ErrorCodes.PERMISSION_DENIED.code
        http_status = HTTP_403_FORBIDDEN
        message = (str(exc.detail) if getattr(exc, 'detail', None)
                   else ErrorCodes.PERMISSION_DENIED.default_message)
        category = ErrorCategory.AUTH
    elif isinstance(exc, drf_exceptions.Throttled):
        code = ErrorCodes.RATE_LIMITED.code
        http_status = exc.status_code or HTTP_429_TOO_MANY_REQUESTS
        raw = exc.detail
        message = (raw.get('detail') if isinstance(raw, dict)
                   else (str(raw) if raw else ErrorCodes.RATE_LIMITED.default_message))
        category = ErrorCategory.CLIENT
    elif isinstance(exc, (drf_exceptions.NotFound, Http404)):
        code = ErrorCodes.NOT_FOUND.code
        http_status = HTTP_404_NOT_FOUND
        message = (str(exc.detail) if getattr(exc, 'detail', None)
                   else ErrorCodes.NOT_FOUND.default_message)
        category = ErrorCategory.CLIENT
    elif isinstance(exc, drf_exceptions.APIException):
        code = getattr(exc, 'error_code', None)
        if not isinstance(code, str):
            code = ErrorCodes.INTERNAL_ERROR.code
        http_status = exc.status_code or HTTP_500_INTERNAL_SERVER_ERROR
        message = (str(exc.detail) if getattr(exc, 'detail', None)
                   else ErrorCodes.INTERNAL_ERROR.default_message)
        category = ErrorCategory.SERVER
    # 4) Django 原生异常
    elif isinstance(exc, DjangoPermissionDenied):
        code = ErrorCodes.PERMISSION_DENIED.code
        http_status = HTTP_403_FORBIDDEN
        message = str(exc) or ErrorCodes.PERMISSION_DENIED.default_message
        category = ErrorCategory.AUTH
    elif isinstance(exc, DjangoValidationError):
        code = ErrorCodes.VALIDATION_ERROR.code
        http_status = HTTP_400_BAD_REQUEST
        msgs = getattr(exc, 'messages', None) or (exc if isinstance(exc, (list, tuple)) else [str(exc)])
        message = '；'.join(str(m) for m in msgs) if isinstance(msgs, (list, tuple)) else str(msgs)
        category = ErrorCategory.CLIENT
    elif isinstance(exc, ValueError):
        code = ErrorCodes.BAD_REQUEST.code
        http_status = HTTP_400_BAD_REQUEST
        message = str(exc) or ErrorCodes.BAD_REQUEST.default_message
        category = ErrorCategory.CLIENT
    # 5) 兜底：服务端未知错误
    else:
        code = ErrorCodes.INTERNAL_ERROR.code
        http_status = HTTP_500_INTERNAL_SERVER_ERROR
        message = ErrorCodes.INTERNAL_ERROR.default_message if not debug else str(exc)
        category = ErrorCategory.SERVER

    if include_details and http_status >= 500:
        details = {
            'traceback': ''.join(traceback.format_tb(exc.__traceback__)) if exc.__traceback__ else '',
        }
    return build_error_envelope(
        error_code=code, message=message, status_code=http_status,
        request_id=request_id, details=details, category=category,
    )


# ============================================================
# 5) 便捷引用
# ============================================================
def api_error_response(error_code=ErrorCodes.BAD_REQUEST, detail=None, *,
                       status_code=None, extra=None, request=None):
    """
    View 中返回统一错误信封的便捷方法（替代散落的 Response({'detail': ...}, status)）。

        return api_error_response(ErrorCodes.ORDER_NOT_FOUND, Messages.ORDER_NOT_FOUND)

    与 raise BusinessException(...) 的区别：本函数直接返回 Response，不抛出异常。
    """
    from rest_framework.response import Response

    env = build_error_envelope(
        error_code=error_code.code,
        message=detail if detail is not None else error_code.default_message,
        status_code=status_code or error_code.http_status,
        request_id=getattr(request, 'request_id', None),
        category=error_code.category,
    )
    if extra:
        env.update(extra)
    return Response(env, status=env['http_status'])


def raise_business(error_code=ErrorCodes.BAD_REQUEST, detail=None):
    """业务异常快捷抛出。"""
    raise BusinessException(error_code, detail)
