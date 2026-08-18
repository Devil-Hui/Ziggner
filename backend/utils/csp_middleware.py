"""API 层内容安全策略（CSP）纵深防御。

业务背景：Ziggner 后端只对外输出 JSON（DRF / 自研 BaseApiView），不存在需要
内联脚本的 HTML 页面；但为防御「把 API 响应当 HTML 渲染」类攻击（如点击劫持、
MIME 嗅探导致的脚本执行载体），对所有非 text/html 响应施加严格 CSP。
SPA（admin/shop）自身的 CSP 由边缘（Cloudflare / nginx）设定，不在本中间件范围，
以免误伤 Turnstile / Stripe 等第三方脚本。
"""


class CSPMiddleware:
    """对非 HTML 响应设置严格 CSP，HTML 响应保持不变。"""

    # API JSON 响应无需任何主动加载的资源；frame-ancestors/base-uri 锁死防嵌套与劫持。
    _CSP_VALUE = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        content_type = response.get("Content-Type", "") or ""
        # 仅对 API 的 JSON / 流式等非 HTML 响应施加；DRF 可浏览 API（HTML）不受影响。
        if "text/html" not in content_type:
            response["Content-Security-Policy"] = self._CSP_VALUE
        return response
