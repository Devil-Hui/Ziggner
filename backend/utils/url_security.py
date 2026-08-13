"""URL / 链接安全工具：协议级消毒 + 开放重定向防护。

- sanitize_link_url:  渲染为 <a href> 或导航前调用，拦截 javascript:/data:/vbscript:/file: 等危险协议（XSS 防护）。
- is_safe_redirect:    判断跳转 URL 是否安全（相对路径或同源/白名单主机）。
- sanitize_redirect_url: 不安全的跳转 URL 返回 ''（安全兜底）。
"""

from urllib.parse import urlsplit, urlunsplit

from django.conf import settings

# 允许作为链接/导航的安全协议
ALLOWED_LINK_SCHEMES = {"http", "https", "mailto", "tel"}
# 常见被用于 XSS / 数据外泄的协议，一律拦截
_BLOCKED_SCHEMES = {
    "javascript",
    "data",
    "vbscript",
    "file",
    "ftp",
    "ws",
    "wss",
}


def sanitize_link_url(url: str, *, allowed_schemes: set = None) -> str:
    """返回安全的链接地址；不安全（危险协议/无法解析）返回 ''。

    相对路径（以 / # ? 开头）视为内部链接直接放行。
    """
    if not url:
        return ""
    url = url.strip()
    if url.startswith(("/", "#", "?")):
        return url
    allowed = allowed_schemes or ALLOWED_LINK_SCHEMES
    try:
        parts = urlsplit(url)
    except ValueError:
        return ""
    scheme = (parts.scheme or "").lower()
    if scheme in _BLOCKED_SCHEMES or (scheme and scheme not in allowed):
        return ""
    # 有 scheme 时做规范化，无 scheme 的原样返回（防御性）
    return urlunsplit(parts) if parts.scheme else url


def is_safe_redirect(url: str, *, allowed_hosts: set = None) -> bool:
    """跳转 URL 是否安全：相对路径放行；绝对地址仅允许 http/https 且主机在白名单内。"""
    if not url:
        return False
    url = url.strip()
    if url.startswith(("/", "#", "?")):
        return True
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    if parts.scheme and parts.scheme.lower() not in ("http", "https"):
        return False
    host = (parts.netloc or "").lower().split(":")[0]
    if not host:
        return True
    if allowed_hosts:
        return host in {h.lower() for h in allowed_hosts}
    return host in {h.lower() for h in getattr(settings, "ALLOWED_HOSTS", [])}


def sanitize_redirect_url(url: str, *, allowed_hosts: set = None) -> str:
    """安全跳转 URL 原样返回，否则返回 ''。"""
    return url if is_safe_redirect(url, allowed_hosts=allowed_hosts) else ""
