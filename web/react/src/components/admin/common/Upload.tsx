/**
 * Upload（统一图片上传组件）
 * ─────────────────────────
 * - 拖拽+点击双模式；虚线框 100%×200px、背景 #fafafa；拖拽悬停边框变蓝+浅蓝底；
 * - 多选（Ctrl/Shift）；文件卡片高 72px（缩略图+文件名+2px 进度条+百分比+移除X→垃圾桶）；
 * - 拖拽排序（HTML5 DnD，无需 react-dnd）；主图星标（点击切换，置顶）；
 * - 前端压缩：WebP 质量 0.8、长边 ≤2048、单文件 ≤5MB，超限前端拒绝并提示；
 * - 受控模式：value: string[]（已上传 URL）+ onChange；上传函数由调用方注入。
 */
import { useRef, useState, type CSSProperties } from 'react'
import styled from 'styled-components'
import { Color, FontSize, FontWeight, Radius, Spacing, Transition } from '../../../theme/tokens'
import { useTranslation } from '@/i18n'

const MAX_SIZE_MB = 5
const MAX_EDGE = 2048
const WEBP_QUALITY = 0.8

const DropZone = styled.div<{ $dragging: boolean }>`
  width: 100%;
  height: 200px;
  border: 2px dashed ${({ $dragging }) => ($dragging ? Color.primary : Color.border.medium)};
  border-radius: ${Radius.md}px;
  background: ${({ $dragging }) => ($dragging ? '#eff6ff' : '#fafafa')};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  color: ${Color.text.muted};
  font-size: ${FontSize.sm}px;
  transition: all ${Transition.fast};
  box-sizing: border-box;
  text-align: center;

  .icon { font-size: 28px; }
  .hint { color: ${Color.primary}; font-weight: ${FontWeight.medium}; }
`

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`

const Card = styled.div<{ $dragging?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 72px;
  padding: 0 12px;
  background: ${({ $dragging }) => ($dragging ? '#eff6ff' : '#fff')};
  border: 1px solid ${({ $dragging }) => ($dragging ? Color.primary : Color.border.light)};
  border-radius: ${Radius.md}px;
  cursor: grab;
  box-sizing: border-box;
  position: relative;

  &:active { cursor: grabbing; }

  img {
    width: 48px;
    height: 48px;
    border-radius: ${Radius.sm}px;
    object-fit: cover;
    flex-shrink: 0;
    background: ${Color.bg.page};
  }
`

const CardMain = styled.div`
  flex: 1;
  min-width: 0;

  .name {
    font-size: ${FontSize.sm}px;
    color: ${Color.text.body};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Track = styled.div`
  width: 100%;
  height: 2px;
  border-radius: 1px;
  background: ${Color.border.light};
  overflow: hidden;
  margin-top: 6px;
`

const Fill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  background: ${Color.primary};
  transition: width 0.3s ease;
`

const Percent = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const IconBtn = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: ${Color.text.muted};
  padding: 4px;
  border-radius: ${Radius.xs}px;
  transition: all ${Transition.fast};
  flex-shrink: 0;

  &:hover { color: ${Color.status.error}; background: #fef2f2; }
`

const StarBtn = styled.span<{ $main: boolean }>`
  position: absolute;
  top: 4px;
  left: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  z-index: 2;
  text-shadow: 0 0 2px rgba(255,255,255,0.8);
  color: ${({ $main }) => ($main ? '#f59e0b' : '#cbd5e1')};
  background: rgba(255,255,255,0.85);
  border-radius: 4px;
  padding: 1px 3px;

  &:hover { color: #f59e0b; }
`

export interface UploadProps {
  /** 已上传图片 URL 列表（受控） */
  value: string[]
  onChange: (urls: string[]) => void
  /** 上传函数：返回图片 URL */
  upload: (file: File) => Promise<string>
  /** 是否多选（默认 true） */
  multiple?: boolean
  maxFiles?: number
  accept?: string
  placeholder?: string
  className?: string
  style?: CSSProperties
}

interface CardState {
  url: string
  progress: number
  error?: string
}

export default function Upload({
  value,
  onChange,
  upload,
  multiple = true,
  maxFiles = 20,
  accept = 'image/*',
  placeholder,
  className,
  style,
}: UploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<Record<string, CardState>>({})
  const dragIndex = useRef<number | null>(null)

  const compressToWebP = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        reject(new Error(t('admin.upload.fileTooLarge', { name: file.name, size: String(MAX_SIZE_MB) })))
        return
      }
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error(t('admin.upload.compressFailed'))); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error(t('admin.upload.webpFailed'))); return }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }))
        }, 'image/webp', WEBP_QUALITY)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('admin.upload.invalidImage', { name: file.name }))) }
      img.src = url
    })

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return
    const remaining = maxFiles - value.length - Object.keys(busy).length
    if (remaining <= 0) return
    const batch = files.slice(0, remaining)

    await Promise.all(batch.map(async file => {
      const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setBusy(prev => ({ ...prev, [key]: { url: '', progress: 5 } }))
      try {
        const compressed = await compressToWebP(file)
        setBusy(prev => ({ ...prev, [key]: { url: '', progress: 30 } }))
        const url = await upload(compressed)
        setBusy(prev => ({ ...prev, [key]: { url, progress: 100 } }))
        onChange([...value, url])
        setTimeout(() => setBusy(prev => { const next = { ...prev }; delete next[key]; return next }), 400)
      } catch (e: any) {
        setBusy(prev => ({ ...prev, [key]: { url: '', progress: 0, error: e?.message || t('admin.upload.uploadFailed') } }))
      }
    }))
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const setMain = (index: number) => {
    if (index === 0) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.unshift(item)
    onChange(next)
  }

  const handleDrop = (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) return
    const next = [...value]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(index, 0, moved)
    onChange(next)
    dragIndex.current = null
  }

  const uploading = Object.keys(busy).length > 0

  return (
    <div className={className} style={style}>
      <DropZone
        $dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        <span className="icon">🖼️</span>
        <span>{placeholder ?? t('admin.upload.placeholder')}</span>
        <span className="hint">{multiple ? t('admin.upload.multiHint') : t('admin.upload.clickHint')}</span>
      </DropZone>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
      />

      {(value.length > 0 || uploading) && (
        <CardList>
          {value.map((url, i) => (
            <Card
              key={url}
              draggable
              onDragStart={() => { dragIndex.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            >
              <StarBtn $main={i === 0} title={i === 0 ? t('admin.upload.mainImage') : t('admin.upload.setMain')} onClick={() => setMain(i)}>★</StarBtn>
              <img src={url} alt="" loading="lazy" />
              <CardMain>
                <div className="name">{url.split('/').pop()?.slice(0, 40) || 'image'}</div>
                <Track><Fill $percent={100} /></Track>
              </CardMain>
              <IconBtn title={t('common.delete')} onClick={() => remove(i)}>🗑</IconBtn>
            </Card>
          ))}
          {Object.entries(busy).map(([key, st]) => (
            <Card key={key} $dragging={st.progress > 0 && st.progress < 100}>
              <CardMain>
                <div className="name">{st.error ? st.error : st.progress >= 100 ? t('admin.upload.done') : t('admin.upload.uploading')}</div>
                <Track><Fill $percent={st.progress} /></Track>
              </CardMain>
              <Percent>{st.progress}%</Percent>
              <IconBtn title={t('common.cancel')} onClick={() => setBusy(prev => { const next = { ...prev }; delete next[key]; return next })}>✕</IconBtn>
            </Card>
          ))}
        </CardList>
      )}
    </div>
  )
}
