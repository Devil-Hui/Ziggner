/** MediaPreviewTabs —— 折叠式场景预览（默认收起）：
 * 不再按内部尺寸（缩略图/列表图/原图）罗列，改为两个真实场景：
 * 「列表页」= 商品卡片效果（list 图 + 骨架占位）；「详情页」= 图集主图 + 小图切换条。
 */
import { useState } from 'react'
import * as S from './MediaManager.styles'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import { optionalMediaUrl } from '../../../../utils/mediaUrl'
import { useTranslation } from '@/i18n'

interface Props {
  items: StagedMediaItem[]
}

export default function MediaPreviewTabs({ items }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const images = items.filter((i) => i.mediaType === 'image')
  const videos = items.filter((i) => i.mediaType === 'video')

  if (items.length === 0) return null

  // 防越界：媒体被删除后 activeIdx 可能超限
  const idx = Math.min(activeIdx, Math.max(images.length - 1, 0))
  const activeImage = images[idx]

  const listSrc = activeImage
    ? optionalMediaUrl(activeImage.previewDataUrl || (activeImage.listBlob ? URL.createObjectURL(activeImage.listBlob) : undefined))
    : ''
  const detailSrc = activeImage
    ? optionalMediaUrl(
        (activeImage.originalBlob ? URL.createObjectURL(activeImage.originalBlob) : undefined) ||
        (activeImage.largeBlob ? URL.createObjectURL(activeImage.largeBlob) : undefined) ||
        activeImage.previewDataUrl
      )
    : ''
  const videoSrc = videos[0]
    ? optionalMediaUrl(videos[0].previewDataUrl || (videos[0].videoBlob ? URL.createObjectURL(videos[0].videoBlob) : undefined))
    : ''

  return (
    <S.PreviewArea>
      <S.PreviewToggleRow type="button" onClick={() => setOpen(!open)}>
        <S.PreviewChevron $open={open}>▶</S.PreviewChevron>
        {t('admin.mediaManager.previewToggle')}
      </S.PreviewToggleRow>

      {open && (
        <S.PreviewScenes>
          {/* 场景一：列表页商品卡片 */}
          <S.SceneCard>
            <S.SceneCardInner>
              {listSrc ? (
                <S.SceneListImg src={listSrc} alt="" />
              ) : videoSrc ? (
                <video src={videoSrc} muted style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
              ) : null}
              <S.SceneLines>
                <S.SceneLine $w="80%" />
                <S.SceneLine $w="45%" />
              </S.SceneLines>
            </S.SceneCardInner>
            <S.SceneLabel>{t('admin.mediaManager.previewList')}</S.SceneLabel>
          </S.SceneCard>

          {/* 场景二：详情页图集（主图 + 小图切换条） */}
          <S.SceneCard>
            <S.SceneCardInner>
              {detailSrc ? (
                <S.SceneDetailImg src={detailSrc} alt="" />
              ) : videoSrc ? (
                <video src={videoSrc} controls style={{ width: '100%', maxHeight: 240, borderRadius: 6, background: '#000', display: 'block' }} />
              ) : null}
              {images.length > 1 && (
                <S.ThumbStrip>
                  {images.map((it, i) => (
                    <S.ThumbStripItem
                      key={it.id ?? i}
                      src={optionalMediaUrl(it.previewDataUrl || (it.thumbBlob ? URL.createObjectURL(it.thumbBlob) : undefined))}
                      $active={i === idx}
                      onClick={() => setActiveIdx(i)}
                      alt=""
                    />
                  ))}
                </S.ThumbStrip>
              )}
            </S.SceneCardInner>
            <S.SceneLabel>{t('admin.mediaManager.previewDetail')}</S.SceneLabel>
          </S.SceneCard>
        </S.PreviewScenes>
      )}
    </S.PreviewArea>
  )
}
