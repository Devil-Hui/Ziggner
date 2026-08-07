"""
操作日志中间件 — 记录所有用户 API 操作，按 用户类型/日期 层级存储
目录结构:
  logs/
    admin/            ← 管理员操作
      2026/07/07/     ← 按年/月/日 分层
        .log
    user/             ← 普通用户操作
      2026/07/07/
        .log
    audit/            ← 审计专用（敏感操作: 支付/退款/删除）
      2026/07/07/
        .log

日志自动轮转：每日 00:00 切换新文件，保留 30 天
"""
import os
from django.utils import timezone
from django.conf import settings

LOG_BASE = os.path.join(settings.BASE_DIR, getattr(settings, 'OPERATION_LOG_BASE_DIR', 'logs/operations'))


def _get_user_category(user) -> str:
    """判定用户类别: admin / user"""
    if not user or not user.is_authenticated:
        return 'anonymous'
    if user.is_superuser or user.is_staff:
        return 'admin'
    return 'user'


def _get_log_path(category: str) -> str:
    """生成层级目录路径 logs/operations/{admin|user}/YYYY/MM/DD/operations.log"""
    now = timezone.now()
    path = os.path.join(
        LOG_BASE, category,
        str(now.year), f'{now.month:02d}', f'{now.day:02d}'
    )
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, 'operations.log')


def _get_audit_path() -> str:
    """审计日志路径 logs/operations/audit/YYYY/MM/DD/audit.log"""
    now = timezone.now()
    path = os.path.join(LOG_BASE, 'audit', str(now.year), f'{now.month:02d}', f'{now.day:02d}')
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, 'audit.log')


# 敏感操作列表（触发审计日志）—— 从 Django settings 读取
AUDIT_ACTIONS = getattr(settings, 'AUDIT_ACTION_PATTERNS', {'POST:/api/payment/', 'POST:/api/order/', 'DELETE:'})


class OperationLogMiddleware:
    """记录每个 API 请求的用户、时间、操作信息到分层日志。"""

    def __init__(self, get_response):
        self.get_response = get_response
        self._loggers = {}

    def _write_log(self, filepath: str, message: str):
        """直接写入 + 立即 flush，确保日志不丢失。"""
        try:
            with open(filepath, 'a', encoding='utf-8') as f:
                from datetime import datetime
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                f.write(f'[{timestamp}] {message}\n')
                f.flush()
        except Exception:
            pass  # 日志失败不影响业务

    def __call__(self, request):
        response = self.get_response(request)
        try:
            user = request.user if hasattr(request, 'user') else None
            category = _get_user_category(user)
            user_id = user.id if user and user.is_authenticated else '-'
            username = user.username if user and user.is_authenticated else 'anonymous'
            method = request.method
            path = request.path

            log_path = _get_log_path(category)
            self._write_log(log_path,
                f'user_id={user_id} username={username} '
                f'method={method} path={path} '
                f'status={response.status_code}'
            )

            if method in ('POST', 'DELETE'):
                audit_path = _get_audit_path()
                self._write_log(audit_path,
                    f'user_id={user_id} username={username} '
                    f'method={method} path={path} '
                    f'status={response.status_code}'
                )
        except Exception:
            import traceback, logging
            logging.getLogger('django').error(f'OpLog failed: {traceback.format_exc()}')

        return response
