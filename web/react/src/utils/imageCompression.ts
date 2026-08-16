/**
 * 图片压缩工具 —— 纯原生 Canvas 实现（零第三方依赖）
 * ============================================================
 * 设计目标：可靠性 + 视觉无损。
 *
 * 为何抛弃 browser-image-compression：
 *   browser-image-compression@2 在 Vite / Cloudflare Pages 生产构建下，
 *   起 Web Worker 会因 import.meta.url 解析失败而返回损坏/0 字节 Blob，
 *   导致裁剪器 `new Image()` 加载失败、预览空白，且界面与日志均无提示，
 *   极难排查。两次线上反馈「压缩完图片不显示」根因皆在此。
 *
 * 现改用浏览器原生 Canvas 解码 + 重编码，产物 100% 可控、可验证。
 *
 * 高质量策略（配合后端归一化 WebP q90）：
 *   · 前端直接出 WebP q0.9（视觉近无损，体积优于 JPEG/PNG）—— 整条链路 WebP 化。
 *   · 尺寸未超限（<= maxWidthOrHeight）→ 原样返回，后端归一化为 WebP。
 *   · 尺寸超限 → 等比缩放后输出 WebP q0.9（保留透明通道 alpha）。
 *   · 小文件（<= 200KB）直接透传（后端归一化为 WebP）。
 *   · 极少数环境不支持 canvas WebP 编码时，回退 PNG，后端仍会归一化为 WebP。
 *
 * 注：浏览器原生 toBlob('image/webp') 仅「有损」支持（无 lossless 模式），
 * 但本项目已采用 q90 高质量有损 WebP（视觉近无损），故前端可直接出 WebP，
 * 后端对已发 WebP 校验后原样落盘，避免二次编码。
 */
export interface CompressionOptions {
  /** 最大宽或高 (px)，默认 2560（超过则等比缩放） */
  maxWidthOrHeight?: number
  /** 保留字段（向后兼容）；PNG 无损输出不依赖此参数 */
  initialQuality?: number
  /** 保留字段（向后兼容）；PNG 无损无法质量阶梯，仅尺寸缩放控制体积 */
  maxSizeMB?: number
  /** 保留字段（向后兼容） */
  minQuality?: number
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidthOrHeight: 2560,
  initialQuality: 0.95,
  maxSizeMB: 0,
  minQuality: 0.4,
}

/** WebP 编码质量（0-1，浏览器档）。后端对应 WEBP_QUALITY=90，强度一致，集中管理避免散落。 */
export const WEBP_QUALITY = 0.9

/** canvas → Blob 的 Promise 封装（toBlob 回调可能返回 null） */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * 压缩图片文件（原生 Canvas 实现）
 *
 * - 文件 <= 200KB：跳过压缩（原样返回，100% 无损）
 * - 文件 > 200KB：按需缩放 + 高质量重编码（或按 maxSizeMB 阶梯减肥）
 *
 * @returns 处理后的 File（可能等于原文件，失败时安全回退原图）
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<File> {
  // 小文件跳过处理（原样返回，100% 无损）
  if (file.size <= 200 * 1024) return file

  const config = { ...DEFAULT_OPTIONS, ...options }

  try {
    const bmp = await createImageBitmap(file)
    const { width, height } = bmp

    // 仅在超过尺寸上限时等比缩放；未超限则不重编码，原样返回
    // （保留原始画质，不再做有损 JPEG 压缩）
    const longest = Math.max(width, height)
    if (longest <= config.maxWidthOrHeight) {
      bmp.close()
      return file
    }

    const ratio = config.maxWidthOrHeight / longest
    const targetW = Math.max(1, Math.round(width * ratio))
    const targetH = Math.max(1, Math.round(height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bmp.close()
      return file
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // WebP 支持 alpha，无需铺白底；透明 PNG 源经 WebP 保留透明通道
    ctx.drawImage(bmp, 0, 0, targetW, targetH)
    bmp.close()

    // 优先出 WebP（视觉近无损）；toBlob 返回 null（极旧环境）→ 回退 PNG，后端仍归一化 WebP
    const webpBlob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
    const blob = webpBlob || (await canvasToBlob(canvas, 'image/png'))

    // 防御：编码失败 / 0 字节 → 回退原图（仅防异常，不防体积膨胀）
    if (!blob || blob.size === 0) return file

    const base = file.name.replace(/\.[^./\\]+$/, '') || 'image'
    const isWebp = blob.type === 'image/webp'
    return new File([blob], `${base}.${isWebp ? 'webp' : 'png'}`, {
      type: blob.type,
      lastModified: file.lastModified,
    })
  } catch (err) {
    // 处理失败：安全回退原图，不阻断上传流程
    console.warn('[imageCompression] 处理失败，使用原图:', err)
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

  // 大图自动处理（>200KB 触发，compressImage 内部对更小文件直接透传）。
  // WebP 路径：尺寸超限则缩放后出 WebP q0.9；未超限原样返回（后端归一化为 WebP）。
  if (file.size > 200 * 1024) {
    try {
      const compressed = await compressImage(file, {
        maxWidthOrHeight: 2560,
        initialQuality: 0.95,
      })
      // compressImage 仅在「尺寸超限」时返回新文件（WebP/PNG）；
      // 或在「未超限/异常」时返回原 file。故以「是否返回新对象」判定是否采用。
      if (compressed !== file) {
        const ratio = compressed.size < file.size
          ? Number(((1 - compressed.size / file.size) * 100).toFixed(0))
          : 0
        return { ok: true, file: compressed, compressed: true, ratio }
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
