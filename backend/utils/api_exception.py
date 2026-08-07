"""DRF exception handling with a stable API error envelope."""

from logging import getLogger

from rest_framework.response import Response
from rest_framework.views import exception_handler

from utils.exceptions import (
    BusinessException,
    exception_to_envelope,
    flatten_errors,
)

logger = getLogger(__name__)

__all__ = ['custom_exception_handler', 'BusinessException', 'flatten_errors']


def _is_debug():
    try:
        from django.conf import settings

        return bool(getattr(settings, 'DEBUG', False))
    except Exception:
        return False


def _log_handled_exception(exc, response, *, view_name, request_id):
    if response.status_code == 429:
        logger.warning(
            'API request throttled: view=%s request_id=%s',
            view_name,
            request_id,
        )
    elif response.status_code >= 500:
        logger.error(
            'Handled server error: view=%s exception=%s request_id=%s',
            view_name,
            type(exc).__name__,
            request_id,
            exc_info=(type(exc), exc, exc.__traceback__),
        )
    else:
        logger.info(
            'API request rejected: view=%s status=%s exception=%s request_id=%s',
            view_name,
            response.status_code,
            type(exc).__name__,
            request_id,
        )


def custom_exception_handler(exc, context):
    view = context.get('view')
    view_name = view.__class__.__name__ if view else 'Unknown'
    request = context.get('request')
    request_id = getattr(request, 'request_id', None)
    debug = _is_debug()

    response = exception_handler(exc, context)
    if response is not None:
        _log_handled_exception(
            exc,
            response,
            view_name=view_name,
            request_id=request_id,
        )
        response.data = exception_to_envelope(
            exc,
            request_id,
            include_details=debug,
            debug=debug,
        )
        return response

    logger.error(
        'Unhandled API exception: view=%s exception=%s request_id=%s',
        view_name,
        type(exc).__name__,
        request_id,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    envelope = exception_to_envelope(
        exc,
        request_id,
        include_details=True,
        debug=debug,
    )
    return Response(envelope, status=envelope['http_status'])
