/** MediaManager 样式 */
import styled from 'styled-components'
import { Color, Radius, Spacing, FontSize, Shadow } from '../../../../theme/tokens'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.md}px;
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const Title = styled.span`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.heading};
`

export const Hint = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  margin-left: ${Spacing.sm}px;
`

export const ButtonGroup = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
`

export const ActionBtn = styled.button<{ $primary?: boolean }>`
  padding: 6px 14px;
  border: 1px solid ${(p) => (p.$primary ? Color.primary : Color.border.medium)};
  border-radius: ${Radius.sm}px;
  background: ${(p) => (p.$primary ? Color.primary : '#fff')};
  color: ${(p) => (p.$primary ? '#fff' : Color.text.body)};
  font-size: ${FontSize.xs}px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ── 预览 Tab ──

export const TabBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${Spacing.sm}px;
  border-bottom: 2px solid ${Color.border.light};
`

export const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 0;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? Color.primary : 'transparent')};
  margin-bottom: -2px;
  background: transparent;
  color: ${(p) => (p.$active ? Color.primary : Color.text.secondary)};
  font-size: ${FontSize.sm}px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${Color.primary};
  }
`

// ── 拖拽上传区（Dropzone） ──

export const Dropzone = styled.div<{ $dragging?: boolean }>`
  border: 2px dashed ${(p) => (p.$dragging ? Color.primary : Color.border.medium)};
  border-radius: ${Radius.md}px;
  padding: 28px;
  text-align: center;
  cursor: pointer;
  color: ${Color.text.secondary};
  background: ${(p) => (p.$dragging ? Color.primaryLight : Color.bg.page)};
  transition: all 0.2s;

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
    background: ${Color.primaryLight};
  }
`

export const DropzoneIcon = styled.div`
  font-size: 28px;
  margin-bottom: 8px;
`

export const DropzoneText = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.body};
`

export const DropzoneSubText = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin-top: 4px;
`

// ── 上传进度条 ──

export const QueueProgress = styled.div`
  margin-top: ${Spacing.sm}px;
`

export const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: ${Color.border.light};
  border-radius: ${Radius.full}px;
  overflow: hidden;
`

export const ProgressBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${Color.primary};
  border-radius: ${Radius.full}px;
  transition: width 0.2s ease;
`

export const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  margin-top: 4px;
`

// ── 媒体网格 ──

export const MediaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${Spacing.sm}px;
  min-height: 80px;
  padding: ${Spacing.sm}px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.page};
`

export const EmptyHint = styled.div`
  width: 100%;
  text-align: center;
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
  padding: 20px 0;
`

// ── 媒体项 ──

export const ItemWrap = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  border: 1px solid ${Color.border.light};
  cursor: grab;
  flex-shrink: 0;

  &:hover .hover-overlay {
    opacity: 1;
  }
`

export const ItemImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const ItemVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

/** hover 操作浮层（编辑 / 删除） */
export const HoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
`

export const OverlayBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${Radius.sm}px;
  background: rgba(255, 255, 255, 0.9);
  color: ${Color.text.body};
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s;

  &:hover {
    background: #fff;
    color: ${Color.primary};
  }
`

export const RemoveBtn = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
`

export const ItemBadge = styled.span<{ $type: 'image' | 'video' }>`
  position: absolute;
  bottom: 2px;
  left: 2px;
  padding: 1px 5px;
  border-radius: 3px;
  background: ${(p) => (p.$type === 'video' ? '#e74c3c' : '#3498db')};
  color: #fff;
  font-size: 9px;
  font-weight: 600;
`

export const StatusDot = styled.span<{ $status: string }>`
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$status === 'active' ? '#2ecc71' : p.$status === 'rejected' ? '#e74c3c' : '#f1c40f'};
`

// ── 预览区 ──

export const PreviewArea = styled.div`
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  padding: ${Spacing.sm}px;
  min-height: 200px;
  background: #fff;
`

export const PreviewGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${Spacing.sm}px;
  justify-content: center;
`

export const PreviewCard = styled.div<{ $size: number }>`
  width: ${(p) => p.$size}px;
  text-align: center;
`

export const PreviewImg = styled.img`
  width: 100%;
  object-fit: contain;
  border-radius: ${Radius.sm}px;
`

export const PreviewLabel = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  margin-top: 4px;
`

// ── 上传对话框 ──

export const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

export const DialogBox = styled.div`
  background: #fff;
  border-radius: ${Radius.md}px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: ${Shadow.modal};
`

export const DialogTitle = styled.h3`
  margin: 0 0 16px;
  font-size: ${FontSize.md}px;
`

export const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
  margin-top: 16px;
`

export const UploadZone = styled.div`
  border: 2px dashed ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  color: ${Color.text.secondary};
  transition: all 0.2s;

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
`

export const ProcessingText = styled.div`
  text-align: center;
  padding: 20px;
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
`

// ── 媒体信息编辑面板 ──

export const EditPanelWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.md}px;
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const FieldLabel = styled.label`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  font-weight: 500;
`

export const FieldInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${Color.primary};
    box-shadow: 0 0 0 2px rgba(26, 86, 219, 0.1);
  }
`

export const FieldHint = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`