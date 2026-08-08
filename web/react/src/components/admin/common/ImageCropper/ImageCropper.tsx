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

export default function ImageCropper({
  file,
  onCrop,
  onCancel,
  aspectRatio = 1,
  maxWidth = 800,
  canvasWidth = 400,
}: ImageCropperProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 200, h: 200 })
  const dragRef = useRef<DragState | null>(null)
  const [scale, setScale] = useState(1)

  // 加载图片
  useEffect(() => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const scale = canvasWidth / img.width
      setScale(scale)
      // 初始裁剪区域：居中
      const cropW = Math.min(img.width * 0.6, img.width)
      const cropH = cropW / aspectRatio
      setCropRect({
        x: (img.width - cropW) / 2,
        y: (img.height - cropH) / 2,
        w: cropW,
        h: cropH,
      })
      setImgLoaded(true)
    }
    img.src = URL.createObjectURL(file)
    return () => { URL.revokeObjectURL(img.src) }
  }, [file, canvasWidth, aspectRatio])

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

        // 宽高比锁定
        if (aspectRatio > 0) {
          if (corner === 'tl' || corner === 'br' || corner === 'tr' || corner === 'bl') {
            h = w / aspectRatio
            if (corner.includes('t')) y = dragState.startRect.y + dragState.startRect.h - h
          }
        }

        return { x: Math.max(0, x), y: Math.max(0, y), w, h }
      })
    }
  }, [getCanvasPos, aspectRatio])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // 确认裁剪
  const handleConfirm = useCallback(() => {
    const img = imgRef.current!
    const maxOriginalW = Math.min(maxWidth, cropRect.w)
    const maxOriginalH = maxOriginalW / aspectRatio

    const sizes = [
      { key: 'thumb', w: 200, h: 200 },
      { key: 'list', w: 400, h: 400 },
      { key: 'large', w: 800, h: 800 },
      { key: 'original', w: maxOriginalW, h: maxOriginalH },
    ] as const

    const results: Record<string, { blob: Blob; dataUrl: string }> = {}

    const generateSize = (key: string, w: number, h: number): Promise<void> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        canvas.toBlob(
          (blob) => {
            if (blob) results[key] = { blob, dataUrl }
            resolve()
          },
          'image/jpeg',
          0.85
        )
      })
    }

    Promise.all(sizes.map((size) => generateSize(size.key, size.w, size.h))).then(() => {
      onCrop(results as unknown as MultiSizeCropResult)
    })
  }, [cropRect, maxWidth, aspectRatio, onCrop])

  if (!file) return null

  return (
    <S.Overlay onClick={onCancel}>
      <S.Dialog onClick={e => e.stopPropagation()}>
        <S.Header>
          <S.Title>{t('admin.imageCropper.title')}</S.Title>
          <S.Info>{t('admin.imageCropper.info').replace('{ratio}', String(aspectRatio))}</S.Info>
        </S.Header>
        <S.CanvasContainer>
          <S.Canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </S.CanvasContainer>
        <S.Actions>
          <S.Btn onClick={onCancel}>{t('admin.imageCropper.cancel')}</S.Btn>
          <S.Btn $primary onClick={handleConfirm}>{t('admin.imageCropper.confirm')}</S.Btn>
        </S.Actions>
      </S.Dialog>
    </S.Overlay>
  )
}