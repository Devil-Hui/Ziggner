/** MediaPreviewTabs —— 文字标签 Tab 切换预览 */
import { useState } from 'react'
import * as S from './MediaManager.styles'
import type { PreviewTab } from './MediaManager.types'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import { optionalMediaUrl } from '../../../../utils/mediaUrl'
import { useTranslation } from '@/i18n'

interface Props {
  items: StagedMediaItem[]
}

const TAB_CONFIG: { key: PreviewTab; labelKey: string }[] = [
  { key: 1, labelKey: 'admin.mediaManager.tabThumb' },
  { key: 2, labelKey: 'admin.mediaManager.tabList' },
  { key: 3, labelKey: 'admin.mediaManager.tabOriginal' },
]

export default function MediaPreviewTabs({ items }: Props) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<PreviewTab>(1)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const images = items.filter((i) => i.mediaType === 'image')
  const videos = items.filter((i) => i.mediaType === 'video')

  if (items.length === 0) {
    return <S.EmptyHint>{t('admin.mediaManager.noMedia')}</S.EmptyHint>
  }

  return (
    <S.PreviewArea>
      <S.TabBar>
        {TAB_CONFIG.map((tab) => (
          <S.TabBtn key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
            {t(tab.labelKey)}
          </S.TabBtn>
        ))}
      </S.TabBar>

      {/* Tab 1: 缩略图 + 大图并排 */}
      {activeTab === 1 && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: '0 0 auto', maxHeight: 300, overflowY: 'auto' }}>
            {images.map((item, idx) => (
              <S.PreviewImg
                key={item.id ?? idx}
                src={optionalMediaUrl(item.previewDataUrl || (item.thumbBlob ? URL.createObjectURL(item.thumbBlob) : undefined))}
                style={{ width: 60, height: 60, objectFit: 'cover', cursor: 'pointer', marginBottom: 4, border: selectedIndex === idx ? '2px solid #e74c3c' : '2px solid transparent' }}
                onClick={() => setSelectedIndex(idx)}
              />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {images[selectedIndex] && (
              <S.PreviewImg
                src={optionalMediaUrl(
                  (images[selectedIndex].originalBlob ? URL.createObjectURL(images[selectedIndex].originalBlob) : undefined) ||
                  (images[selectedIndex].largeBlob ? URL.createObjectURL(images[selectedIndex].largeBlob) : undefined) ||
                  images[selectedIndex].previewDataUrl
                )}
                style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Tab 2: 列表图 */}
      {activeTab === 2 && (
        <S.PreviewGrid>
          {images.map((item, idx) => (
            <S.PreviewCard key={item.id ?? idx} $size={200}>
              <S.PreviewImg
                src={optionalMediaUrl(item.previewDataUrl || (item.listBlob ? URL.createObjectURL(item.listBlob) : undefined))}
                style={{ width: 200, height: 200, objectFit: 'cover' }}
              />
              <S.PreviewLabel>{item.fileName}</S.PreviewLabel>
            </S.PreviewCard>
          ))}
        </S.PreviewGrid>
      )}

      {/* Tab 3: 原图/原视频 */}
      {activeTab === 3 && (
        <S.PreviewGrid>
          {images.map((item, idx) => (
            <S.PreviewCard key={item.id ?? idx} $size={300}>
              <S.PreviewImg
                src={optionalMediaUrl(
                  (item.originalBlob ? URL.createObjectURL(item.originalBlob) : undefined) ||
                  item.previewDataUrl
                )}
                style={{ maxWidth: 300, maxHeight: 300, objectFit: 'contain' }}
              />
              <S.PreviewLabel>{item.fileName}</S.PreviewLabel>
            </S.PreviewCard>
          ))}
          {videos.map((item, idx) => (
            <S.PreviewCard key={item.id ?? idx} $size={300}>
              <video
                src={optionalMediaUrl(item.previewDataUrl || (item.videoBlob ? URL.createObjectURL(item.videoBlob) : undefined))}
                controls
                style={{ maxWidth: 300, maxHeight: 300 }}
              />
              <S.PreviewLabel>{item.fileName}</S.PreviewLabel>
            </S.PreviewCard>
          ))}
        </S.PreviewGrid>
      )}
    </S.PreviewArea>
  )
}
