"""邮件 HTML 白名单消毒（nh3 —— ammonia Rust 库的 Python 绑定）。

邮件模板由管理后台富文本编辑，html_body 会原文送达收件人邮件客户端。
为防存储型 XSS 载体（管理员账号被盗 / 管理员会话被劫持后注入恶意脚本
随验证码、欢迎邮件批量送达全体用户），采用双端消毒：

- 入库消毒：admin_email_template.EmailTemplateUpdateView 保存前清洗；
- 出口消毒：email_service._render_template 渲染后清洗（兜底历史遗留的
  未消毒数据，即使模板早于本功能入库也能保证发出去的是干净的）。

白名单面向邮件场景：inline style 是邮件排版的主要手段（邮件客户端
普遍不支持 <style> 标签），故对所有标签放行 style；script/iframe/
object/svg/on* 事件属性/JavaScript 伪协议一律剥离。
"""
import logging

import nh3

_logger = logging.getLogger('biz')

_ALLOWED_TAGS = frozenset({
    'a', 'b', 'blockquote', 'br', 'center', 'div', 'em', 'font',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol',
    'p', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table',
    'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
})

_ALLOWED_ATTRIBUTES = {
    'a': {'href', 'target', 'title'},
    'img': {'src', 'alt', 'width', 'height'},
    'font': {'color', 'face', 'size'},
    'table': {'width', 'bgcolor', 'cellpadding', 'cellspacing', 'border'},
    'td': {'colspan', 'rowspan', 'bgcolor'},
    'th': {'colspan', 'rowspan', 'bgcolor'},
}

_ALLOWED_URL_SCHEMES = frozenset({'http', 'https', 'mailto'})

# 全部标签通用属性前缀：style（邮件排版核心）与 data-*（编辑器状态）
_GENERIC_ATTR_PREFIXES = frozenset({'style', 'data-'})


def sanitize_email_html(html: str) -> str:
    """白名单消毒邮件 HTML；空输入原样返回。

    消毒库自身异常时 fail-closed：降级为转义后的纯文本 <pre>，
    绝不把未消毒 HTML 发送给收件人。
    """
    if not html:
        return html
    try:
        return nh3.clean(
            html,
            tags=_ALLOWED_TAGS,
            attributes=_ALLOWED_ATTRIBUTES,
            generic_attribute_prefixes=_GENERIC_ATTR_PREFIXES,
            url_schemes=_ALLOWED_URL_SCHEMES,
            strip_comments=True,
        )
    except Exception:  # noqa: BLE001 - 消毒失败必须 fail-closed
        _logger.warning('邮件 HTML 消毒失败，降级为纯文本发送')
        from django.utils.html import escape
        return f'<pre>{escape(html)}</pre>'
