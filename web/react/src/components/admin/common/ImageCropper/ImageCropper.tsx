/**
 * ImageCropper — 纯 Canvas 图片裁剪组件
 * ======================================
 * 零依赖，浏览器端裁剪，不消耗服务器资源。
 * 支持拖拽移动裁剪区域、四角缩放、宽高比锁定。
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from '../../../../i18n'
import type { ImageCropperProps, MultiSizeCropResult } from './ImageCropper.types'
import * as S from './ImageCropper.styles'
import { WEBP_QUALITY } from '../../../../utils/imageCompression'

interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

interface DragState {
  type: 'move' | 'resize'
  corner?: 'tl' | 'tr' | 'bl' | 'br'
  startX: number
  startY: number
  startRect: CropRect
}

const HANDLE_SIZE = 8
const MIN_CROP = 50

/** dataURL → Blob（toBlob 回调拿到 null 时的兜底，保证每个尺寸都有可用 Blob） */
function dataURLToBlob(dataUrl: string): Blob {
  const idx = dataUrl.indexOf(',')
  const head = idx >= 0 ? dataUrl.slice(0, idx) : ''
  const body = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
  const mime = head.match(/:(.*?);/) ?.[1] || 'image/webp'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** 比例数值 → 展示标签（0=自由；常见预设直映射，避免浮点比展示误差） */
function ratioLabel(r: number): string {
  if (r === 0) return '自由'
  if (Math.abs(r - 1) < 1e-6) return '1:1'
  if (Math.abs(r - 4 / 5) < 1e-6) return '4:5'
  if (Math.abs(r - 3 / 4) < 1e-6) return '3:4'
  if (Math.abs(r - 4 / 3) < 1e-6) return '4:3'
  if (Math.abs(r - 3 / 2) < 1e-6) return '3:2'
  if (Math.abs(r - 16 / 9) < 1e-6) return '16:9'
  return `${r.toFixed(2)}:1`
}

/** 常用标准比例（供选择器与"按源图自动匹配初次裁切"使用） */
export const STANDARD_RATIOS = [1, 4 / 5, 3 / 4, 4 / 3, 3 / 2, 16 / 9] as const

/**
 * 依据图片源尺寸自动匹配最合适的标准比例（主流电商/图库逻辑）：
 * 计算源图宽高比，取与之最接近的标准比例；竖图→4:5/3:4，方图→1:1，横图→4:3/3:2/16:9。
 * 返回 0 表示无接近项（调用方自行决定）。
 */
export function matchBestRatio(imgWidth: number, imgHeight: number, fallback = 1): number {
  if (!imgWidth || !imgHeight) return fallback
  const src = imgWidth / imgHeight
  let best: number = STANDARD_RATIOS[0]
  let bestDiff = Math.abs(src - best)
  for (const r of STANDARD_RATIOS) {
    const diff = Math.abs(src - r)
    if (diff < bestDiff) {
      best = r
      bestDiff = diff
    }
  }
  // 与最接近比例的偏差过大（如全景/长图）时仍返回该最接近项，让用户可再手动切换
  return best
}

export default function ImageCropper({
  file,
  onCrop,
  onCancel,
  aspectRatio = 1,
  aspectRatioOptions,
  maxWidth = 800,
  canvasWidth = 400,
}: ImageCropperProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 200, h: 200 })
  const dragRef = useRef<DragState | null>(null)
  const [scale, setScale] = useState(1)
  // 用户可选比例（选择器当前值）；0 表示自由比例。
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio)
  const ratioOptions = aspectRatioOptions ?? [...STANDARD_RATIOS, 0]

  // file 变化（新图片进入裁剪器）时同步初始比例，避免复用组件时残留上一次的选择
  useEffect(() => {
    setSelectedRatio(aspectRatio)
  }, [file, aspectRatio])

  // 加载图片
  useEffect(() => {
    if (!file) return
    setImgLoaded(false)
    setLoadError(false)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const scale = canvasWidth / img.width
      setScale(scale)
      // 初始裁剪区域：按当前比例居中，且不超出图片边界（竖图/横图均适配）
      const ratio = selectedRatio > 0 ? selectedRatio : 1
      const maxW = img.width
      const maxH = img.height
      let cropW = Math.min(maxW * 0.6, maxW)
      let cropH = ratio > 0 ? cropW / ratio : cropW
      if (cropH > maxH) {
        cropH = maxH
        cropW = cropH * ratio
      }
      setCropRect({
        x: Math.max(0, (maxW - cropW) / 2),
        y: Math.max(0, (maxH - cropH) / 2),
        w: cropW,
        h: cropH,
      })
      setImgLoaded(true)
    }
    // 关键：缺少 onerror 时，压缩产物若解码失败会静默空白且无任何提示
    img.onerror = () => {
      setLoadError(true)
      console.error('[ImageCropper] 图片解码失败（可能是压缩产物损坏）')
    }
    img.src = URL.createObjectURL(file)
    return () => { URL.revokeObjectURL(img.src) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, canvasWidth])

  // 绘制画布
  useEffect(() => {
    if (!imgLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imgRef.current!
    canvas.width = img.width * scale
    canvas.height = img.height * scale

    // 绘制原图（半透明）
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 裁剪区域（亮色）
    const cropX = cropRect.x * scale
    const cropY = cropRect.y * scale
    const cropW = cropRect.w * scale
    const cropH = cropRect.h * scale

    ctx.save()
    ctx.beginPath()
    ctx.rect(cropX, cropY, cropW, cropH)
    ctx.clip()
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    // 裁剪边框
    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropW, cropH)

    // 四角手柄
    const corners = [
      { x: cropX, y: cropY },
      { x: cropX + cropW, y: cropY },
      { x: cropX, y: cropY + cropH },
      { x: cropX + cropW, y: cropY + cropH },
    ]
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth = 1.5
    for (const c of corners) {
      ctx.fillRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
    }

    // 网格辅助线
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(cropX, cropY + (cropH / 3) * i)
      ctx.lineTo(cropX + cropW, cropY + (cropH / 3) * i)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cropX + (cropW / 3) * i, cropY)
      ctx.lineTo(cropX + (cropW / 3) * i, cropY + cropH)
      ctx.stroke()
    }
  }, [imgLoaded, cropRect, scale])

  // 鼠标事件
  const getCanvasPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }, [scale])

  const getCorner = useCallback((mx: number, my: number, cr: CropRect): DragState['corner'] | null => {
    const threshold = HANDLE_SIZE / scale
    const corners: { key: DragState['corner']; x: number; y: number }[] = [
      { key: 'tl', x: cr.x, y: cr.y },
      { key: 'tr', x: cr.x + cr.w, y: cr.y },
      { key: 'bl', x: cr.x, y: cr.y + cr.h },
      { key: 'br', x: cr.x + cr.w, y: cr.y + cr.h },
    ]
    for (const c of corners) {
      if (Math.abs(mx - c.x) < threshold && Math.abs(my - c.y) < threshold) return c.key
    }
    return null
  }, [scale])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e)
    const corner = getCorner(pos.x, pos.y, cropRect)

    if (corner) {
      dragRef.current = { type: 'resize', corner, startX: pos.x, startY: pos.y, startRect: { ...cropRect } }
    } else if (
      pos.x >= cropRect.x && pos.x <= cropRect.x + cropRect.w &&
      pos.y >= cropRect.y && pos.y <= cropRect.y + cropRect.h
    ) {
      dragRef.current = { type: 'move', startX: pos.x, startY: pos.y, startRect: { ...cropRect } }
    }
  }, [cropRect, getCanvasPos, getCorner])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    const pos = getCanvasPos(e)
    const dragState = dragRef.current
    const img = imgRef.current!
    const deltaX = pos.x - dragState.startX
    const deltaY = pos.y - dragState.startY

    if (dragState.type === 'move') {
      setCropRect(prev => {
        const newX = Math.max(0, Math.min(img.width - prev.w, dragState.startRect.x + deltaX))
        const newY = Math.max(0, Math.min(img.height - prev.h, dragState.startRect.y + deltaY))
        return { ...prev, x: newX, y: newY }
      })
    } else if (dragState.type === 'resize' && dragState.corner) {
      setCropRect(prev => {
        let { x, y, w, h } = dragState.startRect
        const corner = dragState.corner!

        if (corner.includes('r')) w = Math.min(img.width - x, Math.max(MIN_CROP, dragState.startRect.w + deltaX))
        if (corner.includes('l')) {
          const newW = Math.min(x + dragState.startRect.w, Math.max(MIN_CROP, dragState.startRect.w - deltaX))
          x = dragState.startRect.x + dragState.startRect.w - newW
          w = newW
        }
        if (corner.includes('b')) h = Math.min(img.height - y, Math.max(MIN_CROP, dragState.startRect.h + deltaY))
        if (corner.includes('t')) {
          const newH = Math.min(y + dragState.startRect.h, Math.max(MIN_CROP, dragState.startRect.h - deltaY))
          y = dragState.startRect.y + dragState.startRect.h - newH
          h = newH
        }

        // 宽高比锁定（使用用户当前所选比例；自由比例 selectedRatio===0 时不锁定）
        if (selectedRatio > 0) {
          if (corner === 'tl' || corner === 'br' || corner === 'tr' || corner === 'bl') {
            h = w / selectedRatio
            if (corner.includes('t')) y = dragState.startRect.y + dragState.startRect.h - h
          }
        }

        return { x: Math.max(0, x), y: Math.max(0, y), w, h }
      })
    }
  }, [getCanvasPos, aspectRatio, selectedRatio])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // 切换比例时，按新比例重算居中裁剪框（不重载图片，直接基于已解码的 imgRef）。
  // ratio>0 锁定该比例；ratio===0（自由）时初始仍给正方形，后续可任意拖拽。
  const resetCropForRatio = useCallback((ratio: number) => {
    const img = imgRef.current
    if (!img) return
    const maxW = img.width
    const maxH = img.height
    const effective = ratio > 0 ? ratio : 1
    let cropW = Math.min(maxW * 0.6, maxW)
    let cropH = effective > 0 ? cropW / effective : cropW
    if (cropH > maxH) {
      cropH = maxH
      cropW = cropH * effective
    }
    setCropRect({
      x: Math.max(0, (maxW - cropW) / 2),
      y: Math.max(0, (maxH - cropH) / 2),
      w: cropW,
      h: cropH,
    })
  }, [])

  // 确认裁剪
  const handleConfirm = useCallback(() => {
    const img = imgRef.current
    if (!img) {
      // 图片尚未加载/解码失败，避免 drawImage(null) 静默崩
      console.error('[ImageCropper] 确认裁剪时图片未就绪，已跳过')
      return
    }
    // 派生尺寸：宽度固定，高度按当前比例派生（自由比例用裁剪框实际宽高比）。
    const sizeRatio = selectedRatio > 0 ? selectedRatio : (cropRect.h ? cropRect.w / cropRect.h : 1)
    const deriveH = (w: number) => Math.max(1, Math.round(w / sizeRatio))
    const maxOriginalW = Math.min(maxWidth, cropRect.w)

    const sizes = [
      { key: 'thumb', w: 200, h: deriveH(200) },
      { key: 'list', w: 400, h: deriveH(400) },
      { key: 'large', w: 800, h: deriveH(800) },
      { key: 'original', w: maxOriginalW, h: deriveH(maxOriginalW) },
    ] as const

    const results: Record<string, { blob: Blob; dataUrl: string }> = {}

    const generateSize = (key: string, w: number, h: number): Promise<void> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, w, h)
        // 直接出 WebP（视觉近无损，体积优于 JPEG）；后端对已发 WebP 校验后原样落盘，免二次编码。
        // 透明背景由 WebP alpha 保留，无需铺白底。
        const dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY)
        canvas.toBlob(
          (blob) => {
            if (blob) results[key] = { blob, dataUrl }
            else results[key] = { blob: dataURLToBlob(dataUrl), dataUrl }
            resolve()
          },
          'image/webp',
          WEBP_QUALITY
        )
      })
    }

    Promise.all(sizes.map((size) => generateSize(size.key, size.w, size.h))).then(() => {
      onCrop(results as unknown as MultiSizeCropResult)
    })
  }, [cropRect, maxWidth, selectedRatio, onCrop])

  if (!file) return null

  return (
    <S.Overlay onClick={onCancel}>
      <S.Dialog onClick={e => e.stopPropagation()}>
        <S.Header>
          <S.Title>{t('admin.imageCropper.title')}</S.Title>
          <S.Info>{t('admin.imageCropper.info').replace('{ratio}', ratioLabel(selectedRatio))}</S.Info>
        </S.Header>
        <S.RatioBar>
          {ratioOptions.map((r) => (
            <S.RatioBtn
              key={r}
              $active={selectedRatio === r}
              onClick={() => { setSelectedRatio(r); resetCropForRatio(r) }}
            >
              {ratioLabel(r)}
            </S.RatioBtn>
          ))}
        </S.RatioBar>
        <S.CanvasContainer>
          <S.Canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </S.CanvasContainer>
        {loadError && (
          <div style={{ color: '#e74c3c', fontSize: 13, padding: '8px 16px', textAlign: 'center' }}>
            图片加载失败，无法裁剪。请关闭后重新选择，或换一张图片。
          </div>
        )}
        <S.Actions>
          <S.Btn onClick={onCancel}>{t('admin.imageCropper.cancel')}</S.Btn>
          <S.Btn
            $primary
            onClick={(!imgLoaded || loadError) ? undefined : handleConfirm}
            style={(!imgLoaded || loadError) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {t('admin.imageCropper.confirm')}
          </S.Btn>
        </S.Actions>
      </S.Dialog>
    </S.Overlay>
  )
}