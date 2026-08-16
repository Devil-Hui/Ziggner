/** MediaItem —— 单个媒体项（缩略图 + hover 操作浮层：编辑 / 删除）。
 * 支持两种数据源：StagedMediaItem（创建模式暂存）和 ProductMediaItem（编辑模式已保存）。
 */
import * as S from './MediaManager.styles'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import type { ProductMediaItem } from '../../../../api/admin'
import { resolveMediaUrl } from '../../../../api/chat'

interface Props {
  item: StagedMediaItem | ProductMediaItem
  index: number
  onRemove: (id: number) => void
  onEdit?: (item: ProductMediaItem) => void
}

/** 类型守卫：判断是否为已保存媒体项（后端返回） */
function isSavedMedia(item: StagedMediaItem | ProductMediaItem): item is ProductMediaItem {
  return 'media_type' in item
}

export default function MediaItem({ item, onRemove, onEdit }: Props) {
  const saved = isSavedMedia(item)
  const mediaType = saved ? item.media_type : (item as StagedMediaItem).mediaType
  const id = saved ? item.id : (item as StagedMediaItem).id
  const fileName = saved ? (item.alt_text || `媒体#${item.id}`) : (item as StagedMediaItem).fileName

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

  return (
    <S.ItemWrap title={fileName}>
      {mediaType === 'image' ? (
        <S.ItemImg src={src} alt={fileName} />
      ) : (
        <S.ItemVideo src={src} muted />
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
