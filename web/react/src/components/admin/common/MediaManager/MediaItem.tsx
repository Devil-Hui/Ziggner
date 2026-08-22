/** MediaItem —— 单个媒体项（缩略图 + hover 操作浮层：编辑 / 删除）。
 * 支持两种数据源：StagedMediaItem（创建模式暂存）和 ProductMediaItem（编辑模式已保存）。
 * 交互：点击视频/图片 → 打开大图预览（视频直接播放）；长按 2s → 进入拖动排序。
 */
import { useRef } from 'react'
import * as S from './MediaManager.styles'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import type { ProductMediaItem } from '../../../../api/admin'
import { resolveMediaUrl } from '../../../../api/chat'

interface Props {
  item: StagedMediaItem | ProductMediaItem
  index: number
  onRemove: (id: number) => void
  onEdit?: (item: ProductMediaItem) => void
  /** 点击媒体项打开预览（视频直接播放） */
  onPreview?: (url: string, kind: 'image' | 'video', name: string) => void
  /** 拖拽激活态（长按 2s 后置真，视觉反馈 + 允许拖动） */
  dragActive?: boolean
  /** 指针按下：交给父组件启动长按计时 */
  onDragHandleDown?: (e: React.PointerEvent, index: number) => void
}

/** 类型守卫：判断是否为已保存媒体项（后端返回） */
function isSavedMedia(item: StagedMediaItem | ProductMediaItem): item is ProductMediaItem {
  return 'media_type' in item
}

export default function MediaItem({ item, onRemove, onEdit, onPreview, dragActive, onDragHandleDown }: Props) {
  const saved = isSavedMedia(item)
  const mediaType = saved ? item.media_type : (item as StagedMediaItem).mediaType
  const id = saved ? item.id : (item as StagedMediaItem).id
  const fileName = saved ? (item.alt_text || `媒体#${item.id}`) : (item as StagedMediaItem).fileName
  // 区分「普通点击（预览）」与「长按 2s 拖动结束后的点击（忽略）」
  const pressStartRef = useRef(0)

  // 缩略图 src（编辑模式需 resolveMediaUrl 把 /media/ 相对路径转为后端绝对 URL）
  let src: string
  if (saved) {
    const mediaItem = item as ProductMediaItem
    const rawUrl = mediaItem.media_type === 'image'
      ? (mediaItem.thumb_url || mediaItem.list_url || mediaItem.large_url || '')
      : (mediaItem.video_thumb_url || mediaItem.video_url || '')
    src = resolveMediaUrl(rawUrl) || rawUrl
  } else {
    const stagedItem = item as StagedMediaItem
    src = stagedItem.mediaType === 'image'
      ? (stagedItem.previewDataUrl || (stagedItem.thumbBlob ? URL.createObjectURL(stagedItem.thumbBlob) : ''))
      : (stagedItem.previewDataUrl || (stagedItem.videoBlob ? URL.createObjectURL(stagedItem.videoBlob) : ''))
  }

  const handlePreviewClick = () => {
    // 长按拖动结束后的 click（距按下 >1.5s）忽略，避免误弹预览
    if (Date.now() - pressStartRef.current > 1500) return
    // 视频：优先用原视频 URL 播放；图片：用大图/原图预览
    let playUrl = src
    if (mediaType === 'video') {
      const videoUrl = saved
        ? resolveMediaUrl((item as ProductMediaItem).video_url || '') || (item as ProductMediaItem).video_url
        : (item as StagedMediaItem).videoBlob ? URL.createObjectURL((item as StagedMediaItem).videoBlob!) : src
      if (videoUrl) playUrl = videoUrl
    }
    onPreview?.(playUrl, mediaType, fileName)
  }

  return (
    <S.ItemWrap
      title={fileName}
      $dragActive={dragActive}
      onPointerDown={(e) => {
        // 拖拽句柄：左键/触屏按下时交给父组件长按计时（点击预览与长按拖动互不冲突）
        if (e.button === 0 || e.pointerType !== 'mouse') {
          pressStartRef.current = Date.now()
          onDragHandleDown?.(e, index)
        }
      }}
      onClick={handlePreviewClick}
    >
      {mediaType === 'image' ? (
        <S.ItemImg src={src} alt={fileName} />
      ) : (
        <S.ItemVideo src={src} muted preload="metadata" playsInline />
      )}

      {/* 视频点击提示（首次上传后点击即可直接播放观看） */}
      {mediaType === 'video' && (
        <S.VideoPlayBadge title="点击播放">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </S.VideoPlayBadge>
      )}

      {/* hover 操作浮层：编辑（仅已保存项）/ 删除 */}
      <S.HoverOverlay className="hover-overlay">
        {saved && onEdit && (
          <S.OverlayBtn
            type="button"
            title="编辑"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item as ProductMediaItem)
            }}
          >
            ✎
          </S.OverlayBtn>
        )}
        <S.OverlayBtn
          type="button"
          title="删除"
          onClick={(e) => {
            e.stopPropagation()
            if (id != null) onRemove(id)
          }}
        >
          ×
        </S.OverlayBtn>
      </S.HoverOverlay>

      {/* 状态点（已保存项显示审核状态） */}
      {saved && (item as ProductMediaItem).status !== 'active' && (
        <S.StatusDot $status={(item as ProductMediaItem).status} />
      )}

      <S.ItemBadge $type={mediaType}>
        {mediaType === 'video' ? 'VID' : 'IMG'}
      </S.ItemBadge>
    </S.ItemWrap>
  )
}
