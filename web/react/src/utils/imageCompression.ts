/**
 * 图片压缩工具 —— 基于 browser-image-compression
 *
 * 在上传前对图片进行客户端压缩，显著减小文件体积同时保持视觉质量。
 * 使用 MozJPEG-quality 有损压缩算法（Canvas.toBlob JPEG），
 * 对 >500KB 的图片效果最明显（通常可减小 60-80% 体积）。
 *
 * @see https://github.com/donaldcwl/browser-image-compression
 */
import imageCompression from 'browser-image-compression'

export interface CompressionOptions {
  /** 最大文件大小 (MB)，默认 1MB */
  maxSizeMB?: number
  /** 最大宽或高 (px)，默认 2048（超过则等比缩放） */
  maxWidthOrHeight?: number
  /** 初始压缩质量 0-1，默认 0.85（视觉无损点） */
  initialQuality?: number
  /** 是否使用 Web Worker（不阻塞主线程），默认 true */
  useWebWorker?: boolean
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
  initialQuality: 0.85,
  useWebWorker: true,
}

/** 压缩库实际输出格式 → 扩展名（与后端 upload_security 的 _IMAGE_FORMATS 白名单一致） */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * browser-image-compression v2 返回的 Blob 文件名固定为 "blob"（无扩展名），
 * 直接上传会被后端扩展名校验拒绝（400「文件扩展名、真实内容或大小不符合要求」）。
 * 依据压缩产物的真实 MIME 重命名（JPEG→.jpg / PNG→.png / WebP→.webp / GIF→.gif），
 * MIME 无法识别时回退原文件扩展名。
 */
function buildUploadFilename(original: File, compressed: Blob): string {
  const base = original.name.replace(/\.[^./\\]+$/, '') || 'image'
  const fallbackExt = original.name.slice(base.length).replace(/^\./, '')
  const ext = EXT_BY_MIME[compressed.type] || fallbackExt
  return ext ? `${base}.${ext}` : base
}

/**
 * 压缩图片文件
 *
 * - 文件 <= 200KB：跳过压缩（原样返回）
 * - 文件 > 200KB：执行压缩，输出 JPEG/WebP
 * - 压缩后体积 >= 原始体积：返回原始文件（strict 模式保证不膨胀）
 *
 * @param file 原始图片 File 对象
 * @param options 压缩选项（可选）
 * @returns 压缩后的 File 对象（可能为原文件）
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<File> {
  // 小文件跳过压缩（压缩收益不足以抵消开销）
  if (file.size <= 200 * 1024) {
    return file
  }

  const config = { ...DEFAULT_OPTIONS, ...options }

  try {
    const compressed = await imageCompression(file, config)

    // 如果压缩后反而更大（罕见：已压缩的 PNG/WebP），返回原文件
    if (compressed.size >= file.size) {
      return file
    }

    // browser-image-compression v2 返回的是名为 "blob" 的纯 Blob，
    // 需按真实内容类型重命名，否则后端扩展名校验失败（400）
    return new File([compressed], buildUploadFilename(file, compressed), {
      type: compressed.type || file.type,
      lastModified: file.lastModified,
    })
  } catch (err) {
    // 压缩失败时返回原文件，不阻断上传流程
    console.warn('[imageCompression] 压缩失败，使用原图:', err)
    return file
  }
}

/**
 * 批量压缩图片（保留顺序）
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions,
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)))
}
