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
  align-items: flex-start;
  justify-content: space-between;
  gap: ${Spacing.md}px;
  flex-wrap: wrap;
`

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const Title = styled.span`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.heading};
`

/** 头部副标题：说明该环节的用途，替代括号参数文本 */
export const Subtitle = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  line-height: 1.4;
`

export const PillGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`

/** 计数胶囊：接近上限时转为警示色 */
export const Pill = styled.span<{ $warn?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${Radius.full}px;
  font-size: ${FontSize.xs}px;
  font-weight: 500;
  white-space: nowrap;
  color: ${(p) => (p.$warn ? '#b45309' : Color.text.secondary)};
  background: ${(p) => (p.$warn ? 'rgba(245, 158, 11, 0.12)' : Color.bg.page)};
  border: 1px solid ${(p) => (p.$warn ? 'rgba(245, 158, 11, 0.35)' : Color.border.light)};
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

export const Dropzone = styled.div<{ $dragging?: boolean; $compact?: boolean }>`
  border: 2px dashed ${(p) => (p.$dragging ? Color.primary : Color.border.medium)};
  border-radius: ${Radius.md}px;
  padding: ${(p) => (p.$compact ? '10px 16px' : '28px')};
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

/** 完整态内容：图标 + 文案 + 按钮行 */
export const DropzoneBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`

export const DropzoneActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${Spacing.sm}px;
  margin-top: 6px;
`

export const DropzonePrimaryBtn = styled.button`
  padding: 8px 20px;
  border: none;
  border-radius: ${Radius.sm}px;
  background: ${Color.primary};
  color: #fff;
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const DropzoneGhostBtn = styled.button`
  padding: 8px 14px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: #fff;
  color: ${Color.text.body};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** 紧凑态：一行式继续添加 */
export const CompactRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${Spacing.sm}px;
  flex-wrap: wrap;
`

export const CompactText = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
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
  align-items: center;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  margin-top: 4px;
`

/** 上传中旋转加载圈 */
export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  width: ${(p) => p.$size || 14}px;
  height: ${(p) => p.$size || 14}px;
  border: 2px solid ${Color.border.medium};
  border-top-color: ${Color.primary};
  border-radius: 50%;
  animation: mm-spin 0.8s linear infinite;
  @keyframes mm-spin {
    to {
      transform: rotate(360deg);
    }
  }
`

export const ProgressFile = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DoneCheck = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${Color.status.success};
  color: #fff;
  font-size: 9px;
  line-height: 1;
  flex-shrink: 0;
`

// ── 媒体网格 ──

export const MediaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${Spacing.sm}px;
`

/** 图片序号角标（第几张图），左下角 */
export const OrderBadge = styled.span`
  position: absolute;
  bottom: 4px;
  left: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${Radius.full}px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  pointer-events: none;
  z-index: 2;
`

/** 主图徽章（第 1 张图片），左上角 */
export const MainBadge = styled.span`
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 1px 6px;
  border-radius: 3px;
  background: ${Color.primary};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  pointer-events: none;
  z-index: 2;
`

export const EmptyHint = styled.div`
  width: 100%;
  text-align: center;
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
  padding: 20px 0;
`

// ── 媒体项 ──

export const ItemWrap = styled.div<{ $dragActive?: boolean }>`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  border: 1px solid ${Color.border.light};
  cursor: grab;
  flex-shrink: 0;
  touch-action: none; /* 触屏长按/拖动不被浏览器手势抢占 */
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;

  ${({ $dragActive }) =>
    $dragActive &&
    `
    border-color: ${Color.primary};
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    transform: scale(1.06);
    z-index: 5;
    cursor: grabbing;
    opacity: 0.95;
  `}

  &:hover .hover-overlay {
    opacity: 1;
  }
`

export const ItemImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none; /* 避免图片自身拦截拖拽/点击事件冒泡 */
`

export const ItemVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
`

/** 视频播放角标（点击即可直接播放观看） */
export const VideoPlayBadge = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
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
  top: 5px;
  right: 26px; /* 避开右上角 hover 删除按钮与左上角主图徽章 */
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

// ── 场景化预览（折叠式）：列表页卡片 + 详情页图集 ──

export const PreviewToggleRow = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 4px;
  border: none;
  background: transparent;
  color: ${Color.text.secondary};
  font-size: ${FontSize.sm}px;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: ${Color.primary};
  }
`

export const PreviewChevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  font-size: 11px;
  transition: transform 0.2s;
  transform: rotate(${(p) => (p.$open ? 90 : 0)}deg);
`

export const PreviewScenes = styled.div`
  display: flex;
  gap: ${Spacing.lg}px;
  flex-wrap: wrap;
  padding: ${Spacing.sm}px 4px 4px;
`

export const SceneCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const SceneCardInner = styled.div`
  width: 200px;
  padding: 10px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  background: #fff;
  box-shadow: ${Shadow.card};
`

export const SceneLabel = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  text-align: center;
`

export const SceneListImg = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: ${Radius.sm}px;
  display: block;
`

export const SceneDetailImg = styled.img`
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: ${Radius.sm}px;
  display: block;
  background: ${Color.bg.page};
`

/** 骨架线：模拟列表卡片下的商品名/价格 */
export const SceneLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
`

export const SceneLine = styled.div<{ $w: string }>`
  height: 8px;
  width: ${(p) => p.$w};
  border-radius: ${Radius.full}px;
  background: ${Color.border.light};
`

/** 详情场景：底部小图切换条 */
export const ThumbStrip = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
`

export const ThumbStripItem = styled.img<{ $active: boolean }>`
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  border: 2px solid ${(p) => (p.$active ? Color.primary : 'transparent')};
  box-sizing: border-box;
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