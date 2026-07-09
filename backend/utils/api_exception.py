"""
DRF 全局异常处理器。

- 注册于 settings.REST_FRAMEWORK['EXCEPTION_HANDLER']。
- 所有异常（DRF 原生 / Django 原生 / 业务异常 / 未知异常）统一通过
  utils.exceptions.exception_to_envelope 转换为一致的错误信封，
  与 CustomExceptionMiddleware 共用同一套结构。
- BusinessException / flatten_errors 在此重新导出，保证旧 import 路径兼容。
"""
import traceback

from rest_framework.views import exception_handler
from rest_framework.response import Response
from logging import getLogger

from utils.exceptions import (
    AppException,
    BusinessException,
    flatten_errors,
    exception_to_envelope,
)

logger = getLogger(__name__)

__all__ = ['custom_exception_handler', 'BusinessException', 'flatten_errors']


def _is_debug():
    try:
        from django.conf import settings
        return bool(getattr(settings, 'DEBUG', False))
    except Exception:
        return False


def custom_exception_handler(exc, context):
    view = context.get('view')
    view_name = view.__class__.__name__ if view else 'Unknown'
    logger.error(
        'Exception in API handler:\n'
        f'View: {view_name}\n'
        f'Exception: {type(exc).__name__}: {exc}\n'
        f'Traceback:\n{"".join(traceback.format_tb(exc.__traceback__))}'
    )

    request = context.get('request')
    request_id = getattr(request, 'request_id', None)
    debug = _is_debug()

    # DRF 能识别的异常（ValidationError / NotFound / PermissionDenied / Auth / 我们的 AppException 等）
    response = exception_handler(exc, context)
    if response is not None:
        response.data = exception_to_envelope(
            exc, request_id, include_details=debug, debug=debug
        )
        return response

    # DRF 未处理的异常（Django 原生 / 未知 Python 异常）-> 包装为 500 信封
    envelope = exception_to_envelope(
        exc, request_id, include_details=True, debug=debug
    )
    return Response(envelope, status=envelope['code'])
