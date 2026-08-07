/** MediaManager 组件类型 */

import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import type { ProductMediaItem } from '../../../../api/admin'

export interface MediaManagerProps {
  /** 当前暂存媒体列表变更回调（创建模式） */
  onChange?: (items: StagedMediaItem[]) => void
  /** 编辑模式 SPU ID（存在时启用编辑模式：上传直接落库） */
  spuId?: number
  /** 商品类型，控制显隐（virtual 时隐藏） */
  productKind?: 'physical' | 'virtual'
  /** 编辑模式已保存媒体列表（来自 SPUAdminDetailView） */
  savedMedia?: ProductMediaItem[]
  /** 媒体信息更新回调（编辑模式，alt_text / sort_order） */
  onMediaUpdate?: (mediaId: number, data: { alt_text?: string; sort_order?: number }) => Promise<void>
}

export type PreviewTab = 1 | 2 | 3

export interface ImageUploadDialogProps {
  open: boolean
  /** 预选文件（来自 dropzone 队列），存在时直接进入裁剪 */
  file?: File | null
  onClose: () => void
  /** 裁剪完成回调，返回四尺寸结果 + 源文件 */
  onConfirm: (result: import('../ImageCropper/ImageCropper.types').MultiSizeCropResult, sourceFile: File) => void
  /** 跳过当前文件（队列模式） */
  onSkip?: () => void
}

export interface VideoUploadDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (item: StagedMediaItem) => void
}

/** 上传/裁剪队列状态 */
export interface UploadQueueState {
  total: number
  completed: number
  currentFileName: string
  status: 'idle' | 'processing' | 'done'
  /** 0-100，编辑模式 XHR 上传时使用 */
  percent?: number
}

/** MediaItem 单项 Props（支持暂存项和已保存项） */
export interface MediaItemProps {
  item: StagedMediaItem | ProductMediaItem
  index: number
  onRemove: (id: number) => void
  onEdit?: (item: ProductMediaItem) => void
}

/** MediaEditPanel Props */
export interface MediaEditPanelProps {
  media: ProductMediaItem
  onSave: (data: { alt_text: string; sort_order: number }) => void
  onClose: () => void
}
