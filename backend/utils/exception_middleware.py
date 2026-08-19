"""
全局异常中间件。

职责：
- 为请求附加 request_id 与安全响应头。
- 将成功响应也统一包装为 {code, data, status, message, request_id}（前端 request.ts 依赖此契约）。
- 将视图直接返回的 4xx/5xx（Response({'detail': ...}, status)）补全 error_code / message / request_id。
- 捕获未被 DRF 处理的原生异常，交由 utils.exceptions.exception_to_envelope 统一格式化，
  与 DRF EXCEPTION_HANDLER 产生完全一致的错误信封。

关键修复（相对旧实现）：
- 移除 error_code = str(exc) 的反模式（ValueError 现映射为 BAD_REQUEST 并保留原消息）。
- 已是统一信封的响应（raise AppException / api_error_response）直接透传，避免双重包装。
- 视图返回的 4xx/5xx 按 HTTP 状态码映射到具体 error_code，替代千篇一律的 'HTTP_ERROR'。
"""
import json
import time
import uuid
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from rest_framework import status as http_status
from logging import getLogger

from utils.exceptions import exception_to_envelope, build_error_envelope, ErrorCodes, ErrorCategory

logger = getLogger(__name__)


def _clear_request_cache():
    """清理请求级缓存（admin_permissions 中的 thread-local 缓存）"""
    try:
        from apps.goods.admin_permissions import _clear_request_cache as _clr
        _clr()
    except Exception:
        pass


class CustomExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = str(uuid.uuid4())
        request.request_id = request_id
        start_time = time.time()

        if self.should_skip_middleware(request):
            return self.get_response(request)

        try:
            response = self.get_response(request)

            if not self.is_json_request(request):
                return self._add_security_headers(response, request_id)

            if self.is_success_status(response.status_code):
                data = self.parse_response_data(response)
                result = self._json_response({
                    'code': response.status_code,
                    'data': data,
                    'status': 'success',
                    'message': 'ok',
                    'request_id': request_id,
                }, status_code=response.status_code, request_id=request_id)
                result.cookies.update(response.cookies)
                _clear_request_cache()
                return result

            # 非 2xx 响应：补全统一错误信封
            # 鉴权失败（401/403）记录安全审计（节流防刷屏），满足可追溯要求
            if response.status_code in (401, 403):
                self._record_security_event(request, response.status_code, request_id)
            result = self._wrap_error_response(response, request_id)
            result.cookies.update(response.cookies)
            _clear_request_cache()
            return result

        except Exception as exc:
            logger.error(
                f'Error ID: {request_id} | '
                f'Exception: {type(exc).__name__} | '
                f'Path: {request.path}'
            )
            if settings.DEBUG:
                logger.debug(f'Debug traceback:\n{traceback_format(exc)}')
            result = self.handle_exception(request, exc, request_id)
            _clear_request_cache()
            return result

    # ---------------------------------------------------------------
    # 安全事件审计（鉴权失败 / 权限拒绝）
    # ---------------------------------------------------------------
    def _record_security_event(self, request, status_code: int, request_id: str) -> None:
        """记录鉴权失败/越权审计日志。同 IP+路径 60s 窗口去重，防接口探测刷屏。"""
        try:
            from utils.cache import Cache
            _sec = Cache('sec')
            ip = self._client_ip(request)
            key = f'auth:{status_code}:{ip}:{request.path}'
            if _sec.get(key):
                return
            _sec.set(key, 1, 60)

            user = getattr(request, 'user', None)
            from apps.goods.views.admin_audit import create_audit_log
            create_audit_log(
                user if user and getattr(user, 'is_authenticated', False) else None,
                'auth_failed' if status_code == 401 else 'permission_denied',
                'security', 0,
                extra_data={
                    'request_id': request_id,
                    'method': request.method,
                    'path': request.path,
                    'user_agent': (request.META.get('HTTP_USER_AGENT') or '')[:200],
                    'authenticated': bool(user and getattr(user, 'is_authenticated', False)),
                },
                ip_address=ip,
            )
        except Exception:
            logger.debug('security event audit skipped (non-fatal)', exc_info=True)

    @staticmethod
    def _client_ip(request) -> str | None:
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


    # ---------------------------------------------------------------
    # 错误响应用统一起居包
    # ---------------------------------------------------------------
    def _wrap_error_response(self, response, request_id):
        body = response.data if hasattr(response, 'data') else None
        # 已是统一信封（raise AppException / api_error_response 产生）-> 透传，避免双重包装
        if isinstance(body, dict) and body.get('status') in ('success', 'error') and 'error_code' in body:
            return self._json_response(body, status_code=response.status_code, request_id=request_id)

        message = self._extract_message(body)
        error_code, category = self._status_to_code(response.status_code)
        # 路由级 404 等场景下响应体为空或没有可读消息时，回退到该状态码对应的标准消息
        if not message or message == '请求失败':
            message = ErrorCodes.get(error_code).default_message
        envelope = build_error_envelope(
            error_code=error_code,
            message=message,
            status_code=response.status_code,
            request_id=request_id,
            category=category,
        )
        return self._json_response(envelope, status_code=response.status_code, request_id=request_id)

    def _extract_message(self, body):
        if isinstance(body, dict):
            if 'detail' in body:
                return str(body['detail'])
            if 'message' in body:
                return str(body['message'])
            for value in body.values():
                if isinstance(value, str):
                    return value
            try:
                return json.dumps(body, ensure_ascii=False)
            except (TypeError, ValueError):
                return '请求失败'
        if isinstance(body, str):
            return body
        return '请求失败'

    def _status_to_code(self, status_code):
        mapping = {
            400: (ErrorCodes.BAD_REQUEST.code, ErrorCategory.CLIENT),
            401: (ErrorCodes.UNAUTHORIZED.code, ErrorCategory.AUTH),
            403: (ErrorCodes.PERMISSION_DENIED.code, ErrorCategory.AUTH),
            404: (ErrorCodes.NOT_FOUND.code, ErrorCategory.CLIENT),
            405: (ErrorCodes.METHOD_NOT_ALLOWED.code, ErrorCategory.CLIENT),
            409: (ErrorCodes.CONFLICT.code, ErrorCategory.CLIENT),
            429: (ErrorCodes.RATE_LIMITED.code, ErrorCategory.CLIENT),
        }
        if 500 <= status_code < 600:
            return (ErrorCodes.INTERNAL_ERROR.code, ErrorCategory.SERVER)
        return mapping.get(status_code, (ErrorCodes.BAD_REQUEST.code, ErrorCategory.CLIENT))

    # ---------------------------------------------------------------
    # 响应工具
    # ---------------------------------------------------------------
    def _json_response(self, data, status_code=200, request_id=None):
        response = JsonResponse(data, status=status_code)
        return self._add_security_headers(response, request_id)

    def _add_security_headers(self, response, request_id=None):
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "frame-src 'self' https://*.paypal.com https://*.stripe.com;"
        )
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        if request_id:
            response['X-Request-ID'] = request_id
        return response

    def parse_response_data(self, response):
        if not hasattr(response, 'content'):
            return None
        try:
            return json.loads(response.content.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return response.content.decode()

    def handle_exception(self, request, exc, request_id=None):
        if not self.is_json_request(request):
            return self.handle_html_exception(exc, request_id)
        error_data = exception_to_envelope(exc, request_id, include_details=settings.DEBUG, debug=settings.DEBUG)
        return self._json_response(
            error_data,
            status_code=error_data['http_status'],
            request_id=request_id,
        )

    def handle_html_exception(self, exc, request_id=None):
        error_data = exception_to_envelope(exc, request_id, include_details=settings.DEBUG, debug=settings.DEBUG)
        response = HttpResponse(
            f"<h1>Error {error_data['code']}</h1><p>{error_data['message']}</p>",
            status=error_data['http_status'],
            content_type='text/html',
        )
        return self._add_security_headers(response, request_id)

    def is_json_request(self, request):
        if request.path.endswith('.json'):
            return True
        content_type = request.headers.get('Content-Type', '')
        accept = request.headers.get('Accept', '')
        return 'application/json' in content_type.lower() or 'application/json' in accept.lower()

    def is_success_status(self, status_code):
        return 200 <= status_code < 300

    def should_skip_middleware(self, request):
        skip_paths = [
            '/api/schema/',
            '/admin',
            '/static/',
            '/media/',
            '/health/',
        ]
        return any(request.path.startswith(path) for path in skip_paths)


def traceback_format(exc):
    import traceback
    return ''.join(traceback.format_tb(exc.__traceback__))
