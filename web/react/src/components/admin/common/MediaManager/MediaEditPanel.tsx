/** MediaEditPanel —— 图片信息编辑面板（alt_text / sort_order）。
 * 编辑模式下点击媒体项"编辑"按钮打开，保存调用 MediaUpdateView。
 */
import { useState } from 'react'
import * as S from './MediaManager.styles'
import type { MediaEditPanelProps } from './MediaManager.types'

export default function MediaEditPanel({ media, onSave, onClose }: MediaEditPanelProps) {
  const [altText, setAltText] = useState(media.alt_text || '')
  const [sortOrder, setSortOrder] = useState(media.sort_order ?? 0)
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    onSave({ alt_text: altText.trim(), sort_order: Number(sortOrder) || 0 })
  }

  // 缩略图预览
  const previewSrc =
    media.media_type === 'image'
      ? media.thumb_url || media.list_url || media.large_url || ''
      : media.video_thumb_url || media.video_url || ''

  return (
    <S.DialogOverlay onClick={onClose}>
      <S.DialogBox onClick={(e) => e.stopPropagation()}>
        <S.DialogTitle>编辑图片信息</S.DialogTitle>
        <S.EditPanelWrap>
          {/* 预览 */}
          {previewSrc && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={previewSrc}
                alt={altText}
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  borderRadius: 4,
                  border: '1px solid #e5e7eb',
                }}
              />
            </div>
          )}

          {/* alt_text */}
          <S.FieldGroup>
            <S.FieldLabel>Alt 替代文本</S.FieldLabel>
            <S.FieldInput
              type="text"
              maxLength={200}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="用于 SEO 和屏幕阅读器，如：红色 T 恤正面图"
            />
            <S.FieldHint>{altText.length}/200</S.FieldHint>
          </S.FieldGroup>

          {/* sort_order */}
          <S.FieldGroup>
            <S.FieldLabel>排序值</S.FieldLabel>
            <S.FieldInput
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              placeholder="0"
            />
            <S.FieldHint>数值越小越靠前</S.FieldHint>
          </S.FieldGroup>
        </S.EditPanelWrap>

        <S.DialogActions>
          <S.ActionBtn onClick={onClose}>取消</S.ActionBtn>
          <S.ActionBtn $primary onClick={handleSave} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </S.ActionBtn>
        </S.DialogActions>
      </S.DialogBox>
    </S.DialogOverlay>
  )
}
