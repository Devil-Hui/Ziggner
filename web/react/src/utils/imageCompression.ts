/**
 * 图片压缩工具 —— 基于 browser-image-compression
 *
 * 在上传前对图片进行客户端压缩，在体积与视觉质量间取得平衡（保真优先）。
 * 使用 MozJPEG 有损压缩算法（Canvas.toBlob JPEG），仅对 >200KB 的图生效。
 * 默认档位：最长边 ≤2560px、目标 ≤2.5MB、JPEG 质量 0.92（接近视觉无损）。
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
  maxSizeMB: 2.5,
  maxWidthOrHeight: 2560,
  initialQuality: 0.92,
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

/**
 * 上传前统一预处理：体积/尺寸护栏 + 自动压缩。
 *
 * 同时服务于「dropzone 队列直传」与「对话框内手动选图」两条入口。
 * 原先护栏只写在 ImageUploadDialog 的 handleFileSelect（手动选图）里，
 * 队列模式走 useEffect 直接 setSelectedFile 绕过了它，导致大图未经压缩
 * 直接进 ImageCropper 触发 canvas 解码 OOM（页面闪退）。集中到这里后两条
 * 路径都受保护。
 *
 * @returns ok=false 表示被护栏拒绝（已通过 onReject 提示）；ok=true 时 file 为最终待裁剪文件
 */
export interface PrepareImageResult {
  ok: boolean
  file?: File
  compressed?: boolean
  ratio?: number
}

export async function prepareImageForUpload(
  file: File,
  opts: { onReject?: (msg: string) => void } = {},
): Promise<PrepareImageResult> {
  if (!file.type.startsWith('image/')) {
    opts.onReject?.('请选择图片文件')
    return { ok: false }
  }

  const MAX_BYTES = 15 * 1024 * 1024
  if (file.size > MAX_BYTES) {
    opts.onReject?.('图片过大（>15MB），请压缩后再上传')
    return { ok: false }
  }

  // 轻量解码检查尺寸，>8192px 直接拒绝（避免后续 canvas 解码 OOM）
  try {
    const bmp = await createImageBitmap(file)
    const { width, height } = bmp
    bmp.close()
    if (width > 8192 || height > 8192) {
      opts.onReject?.(`图片尺寸过大（${width}×${height}），请先缩小至 8192px 以内`)
      return { ok: false }
    }
  } catch {
    // 解码失败：交给压缩流程/后端兜底校验
  }

  // 大图自动压缩（>200KB 触发，compressImage 内部对更小文件直接透传）
  if (file.size > 200 * 1024) {
    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 2.5,
        maxWidthOrHeight: 2560,
        initialQuality: 0.92,
      })
      if (compressed.size < file.size) {
        const ratio = ((1 - compressed.size / file.size) * 100).toFixed(0)
        return { ok: true, file: compressed, compressed: true, ratio: Number(ratio) }
      }
      return { ok: true, file }
    } catch {
      // 压缩失败：原图 >5MB 则拒绝（避免超大原图送进裁剪器再次 OOM），否则透传原图
      if (file.size > 5 * 1024 * 1024) {
        opts.onReject?.('压缩失败且原图过大，请选择更小的图片')
        return { ok: false }
      }
      return { ok: true, file }
    }
  }

  return { ok: true, file }
}
