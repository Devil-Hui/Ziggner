// 链接协议级消毒：渲染为 <a href> 或做 window.location 跳转前调用，
// 拦截 javascript:/data:/vbscript:/file: 等危险协议（XSS 防护）。
// 相对路径（以 / # ? 开头）视为内部链接直接放行。

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

export function safeHref(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
}

export default safeHref;
