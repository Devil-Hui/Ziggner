import { resolveMediaUrl } from '../api/chat'

/**
 * 统一商品图片 URL 解析，返回可安全渲染的 src。
 * - 空值 → undefined（不渲染）
 * - 回环地址 / 相对路径 → 解析为后端绝对 URL（修复「商品图片无法显示」）
 */
export function optionalMediaUrl(value: string | null | undefined): string | undefined {
  return resolveMediaUrl(value) || undefined
}