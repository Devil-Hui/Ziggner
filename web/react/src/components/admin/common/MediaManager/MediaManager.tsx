/** MediaManager —— 媒体管理区块主组件。
 * 创建模式（无 spuId）：dropzone → 裁剪队列 → IndexedDB 暂存。
 * 编辑模式（有 spuId）：dropzone → 裁剪 → XHR 上传到已有 SPU；支持 hover 编辑/删除。
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import * as S from './MediaManager.styles'
import MediaItem from './MediaItem'
import MediaPreviewTabs from './MediaPreviewTabs'
import ImageUploadDialog from './ImageUploadDialog'
import VideoUploadDialog from './VideoUploadDialog'
import MediaEditPanel from './MediaEditPanel'
import { Icon } from '../Icon'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import {
  getAllStagedItems,
  addStagedItem,
  deleteStagedItem,
} from '../../../../utils/mediaStaging'
import type { ProductMediaItem } from '../../../../api/admin'
import { adminAPI } from '../../../../api/admin'
import type { MultiSizeCropResult } from '../ImageCropper/ImageCropper.types'
import type { MediaManagerProps, UploadQueueState } from './MediaManager.types'

const MAX_IMAGES = 5
const MAX_VIDEOS = 1

const INITIAL_QUEUE: UploadQueueState = {
  total: 0,
  completed: 0,
  currentFileName: '',
  status: 'idle',
  percent: 0,
}

export default function MediaManager({
  onChange,
  spuId,
  savedMedia,
  onMediaUpdate,
}: MediaManagerProps) {
  const isEditMode = !!spuId

  // 创建模式暂存项
  const [items, setItems] = useState<StagedMediaItem[]>([])
  // 编辑模式已保存媒体
  const [savedItems, setSavedItems] = useState<ProductMediaItem[]>([])
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showVideoDialog, setShowVideoDialog] = useState(false)

  // 裁剪队列
  const [queueFiles, setQueueFiles] = useState<File[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [uploadQueue, setUploadQueue] = useState<UploadQueueState>(INITIAL_QUEUE)

  // 编辑面板
  const [editingMedia, setEditingMedia] = useState<ProductMediaItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const queueFilesRef = useRef<File[]>([])
  const [dragging, setDragging] = useState(false)

  // 启动时加载数据
  useEffect(() => {
    if (isEditMode) {
      // 编辑模式：优先用 savedMedia prop，否则拉取
      if (savedMedia && savedMedia.length >= 0) {
        setSavedItems(savedMedia)
      }
      if (spuId) {
        adminAPI.getMediaBySPU(spuId)
          .then((data) => setSavedItems(Array.isArray(data) ? data : []))
          .catch(() => {})
      }
    } else {
      // 创建模式：从 IndexedDB 加载
      getAllStagedItems().then((data) => {
        setItems(data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spuId])

  // savedMedia prop 变化时同步
  useEffect(() => {
    if (isEditMode && savedMedia) {
      setSavedItems(savedMedia)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMedia])

  const notifyChange = useCallback(
    (newItems: StagedMediaItem[]) => {
      setItems(newItems)
      onChange?.(newItems)
    },
    [onChange]
  )

  // ── Dropzone 事件 ──

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
      if (files.length === 0) return
      startQueue(files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditMode, items]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith('image/'))
      if (files.length === 0) return
      startQueue(files)
      // 重置 input 以便重复选择同一文件
      e.target.value = ''
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditMode, items]
  )

  const startQueue = useCallback(
    (files: File[]) => {
      let selected = files
      // 创建模式校验图片数量上限
      if (!isEditMode) {
        const remain = MAX_IMAGES - items.filter((item) => item.mediaType === 'image').length
        if (remain <= 0) {
          alert('图片数量已达上限')
          return
        }
        selected = files.slice(0, remain)
      }
      if (selected.length === 0) return
      queueFilesRef.current = selected
      setQueueFiles(selected)
      setQueueIndex(0)
      setUploadQueue({
        total: selected.length,
        completed: 0,
        currentFileName: selected[0].name,
        status: 'processing',
        percent: 0,
      })
      setShowImageDialog(true)
    },
    [isEditMode, items]
  )

  // ── 裁剪完成处理 ──

  const handleCropConfirm = useCallback(
    async (result: MultiSizeCropResult, sourceFile: File) => {
      if (isEditMode && spuId) {
        // 编辑模式：构建 FormData 上传到已有 SPU（XHR 进度）
        const formData = new FormData()
        formData.append('thumb', result.thumb.blob, `thumb_${sourceFile.name}`)
        formData.append('list', result.list.blob, `list_${sourceFile.name}`)
        formData.append('large', result.large.blob, `large_${sourceFile.name}`)
        formData.append('original', result.original.blob, `original_${sourceFile.name}`)
        formData.append('alt_text', '')
        try {
          setUploadQueue((q) => ({ ...q, percent: 0, currentFileName: sourceFile.name }))
          const newMedia = await adminAPI.uploadMedia(spuId, formData, (percent) => {
            setUploadQueue((q) => ({ ...q, percent }))
          })
          setSavedItems((prev) => [...prev, newMedia])
          advanceQueue()
        } catch (err) {
          alert(err instanceof Error ? err.message : '上传失败')
          advanceQueue()
        }
      } else {
        // 创建模式：暂存 IndexedDB
        const staged: StagedMediaItem = {
          mediaType: 'image',
          thumbBlob: result.thumb.blob,
          listBlob: result.list.blob,
          largeBlob: result.large.blob,
          originalBlob: result.original.blob,
          previewDataUrl: result.thumb.dataUrl,
          fileName: sourceFile.name,
          fileSize: sourceFile.size,
          createdAt: Date.now(),
        }
        const stagedId = await addStagedItem(staged)
        const updated = [...items, { ...staged, id: stagedId }]
        notifyChange(updated)
        advanceQueue()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditMode, spuId, items, notifyChange]
  )

  /** 推进裁剪队列到下一张（使用 ref 避免闭包过期） */
  const advanceQueue = useCallback(() => {
    setQueueIndex((prevIdx) => {
      const nextIdx = prevIdx + 1
      const nextFile = queueFilesRef.current[nextIdx]
      setUploadQueue((q) => {
        const completed = q.completed + 1
        if (nextIdx >= q.total) {
          // 队列完成
          setTimeout(() => {
            setShowImageDialog(false)
            setQueueFiles([])
            queueFilesRef.current = []
            setUploadQueue(INITIAL_QUEUE)
          }, 300)
          return { ...q, completed, status: 'done', percent: 100, currentFileName: '' }
        }
        // 下一张
        return {
          ...q,
          completed,
          percent: 0,
          currentFileName: nextFile?.name || '',
        }
      })
      return nextIdx
    })
  }, [])

  const handleSkip = useCallback(() => {
    advanceQueue()
  }, [advanceQueue])

  // ── 删除处理 ──

  const handleRemove = useCallback(
    async (id: number) => {
      if (isEditMode) {
        // 编辑模式：删除已保存媒体（active 需二次确认）
        const target = savedItems.find((mediaItem) => mediaItem.id === id)
        if (target && target.status === 'active') {
          if (!window.confirm('此媒体已上线，确认删除？')) return
        }
        try {
          await adminAPI.deleteMedia(id)
          setSavedItems((prev) => prev.filter((mediaItem) => mediaItem.id !== id))
        } catch (err) {
          alert(err instanceof Error ? err.message : '删除失败')
        }
      } else {
        await deleteStagedItem(id)
        const updated = items.filter((i) => i.id !== id)
        notifyChange(updated)
      }
    },
    [isEditMode, savedItems, items, notifyChange]
  )

  // ── 编辑面板保存 ──

  const handleEditSave = useCallback(
    async (data: { alt_text: string; sort_order: number }) => {
      if (!editingMedia) return
      try {
        if (onMediaUpdate) {
          await onMediaUpdate(editingMedia.id, data)
        } else {
          await adminAPI.updateMedia(editingMedia.id, data)
        }
        // 局部刷新已保存媒体列表
        if (spuId) {
          const fresh = await adminAPI.getMediaBySPU(spuId)
          setSavedItems(Array.isArray(fresh) ? fresh : [])
        } else {
          setSavedItems((prev) =>
            prev.map((m) => (m.id === editingMedia.id ? { ...m, ...data } : m))
          )
        }
        setEditingMedia(null)
      } catch (err) {
        alert(err instanceof Error ? err.message : '更新失败')
      }
    },
    [editingMedia, onMediaUpdate, spuId]
  )

  // ── 计数 ──
  const imageCount = isEditMode
    ? savedItems.filter((i) => i.media_type === 'image').length
    : items.filter((item) => item.mediaType === 'image').length
  const videoCount = isEditMode
    ? savedItems.filter((i) => i.media_type === 'video').length
    : items.filter((item) => item.mediaType === 'video').length

  // 当前队列文件
  const currentQueueFile = queueFiles[queueIndex] || null
  const showProgress = uploadQueue.status === 'processing' || uploadQueue.status === 'done'
  const progressPercent =
    isEditMode && uploadQueue.status === 'processing'
      ? Math.round((uploadQueue.completed / Math.max(uploadQueue.total, 1)) * 100 * 0.7 + (uploadQueue.percent || 0) * 0.3)
      : Math.round((uploadQueue.completed / Math.max(uploadQueue.total, 1)) * 100)

  return (
    <S.Container>
      <S.Header>
        <div>
          <S.Title>商品媒体</S.Title>
          <S.Hint>
            (图片 {imageCount}/{MAX_IMAGES}，视频 {videoCount}/{MAX_VIDEOS})
          </S.Hint>
        </div>
        <S.ButtonGroup>
          <S.ActionBtn
            $primary
            disabled={imageCount >= MAX_IMAGES}
            onClick={() => fileInputRef.current?.click()}
          >
            + 添加图片
          </S.ActionBtn>
          <S.ActionBtn
            disabled={videoCount >= MAX_VIDEOS}
            onClick={() => setShowVideoDialog(true)}
          >
            + 添加视频
          </S.ActionBtn>
        </S.ButtonGroup>
      </S.Header>

      {/* 隐藏的文件选择 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* 拖拽上传区 */}
      <S.Dropzone
        $dragging={dragging}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
        onDrop={handleDrop}
      >
        <S.DropzoneIcon><Icon name="upload" size={36} color="#bbb" /></S.DropzoneIcon>
        <S.DropzoneText>拖拽图片到此处，或点击选择</S.DropzoneText>
        <S.DropzoneSubText>
          支持 JPG / PNG / WebP，单张最大 10MB{isEditMode ? '（编辑模式：裁剪后直接上传）' : '（裁剪后暂存，随表单提交）'}
        </S.DropzoneSubText>
      </S.Dropzone>

      {/* 上传/裁剪进度条 */}
      {showProgress && (
        <S.QueueProgress>
          <S.ProgressBarTrack>
            <S.ProgressBarFill $percent={progressPercent} />
          </S.ProgressBarTrack>
          <S.ProgressLabel>
            <span>
              {uploadQueue.status === 'done'
                ? '处理完成'
                : `处理中：${uploadQueue.currentFileName || ''}`}
            </span>
            <span>{uploadQueue.completed}/{uploadQueue.total}（{progressPercent}%）</span>
          </S.ProgressLabel>
        </S.QueueProgress>
      )}

      {/* 媒体缩略图网格 */}
      <S.MediaGrid>
        {isEditMode ? (
          savedItems.length === 0 && !showProgress ? (
            <S.EmptyHint>暂无媒体，拖拽或点击上方区域添加</S.EmptyHint>
          ) : (
            savedItems.map((item, idx) => (
              <MediaItem
                key={item.id}
                item={item}
                index={idx}
                onRemove={handleRemove}
                onEdit={setEditingMedia}
              />
            ))
          )
        ) : (
          items.length === 0 && !showProgress ? (
            <S.EmptyHint>暂无媒体，拖拽或点击上方区域添加</S.EmptyHint>
          ) : (
            items.map((item, idx) => (
              <MediaItem
                key={item.id ?? idx}
                item={item}
                index={idx}
                onRemove={handleRemove}
              />
            ))
          )
        )}
      </S.MediaGrid>

      {/* 预览区（创建模式） */}
      {!isEditMode && <MediaPreviewTabs items={items} />}

      {/* 裁剪对话框（队列模式） */}
      <ImageUploadDialog
        open={showImageDialog}
        file={currentQueueFile}
        onClose={() => { setShowImageDialog(false); setUploadQueue(INITIAL_QUEUE) }}
        onConfirm={handleCropConfirm}
        onSkip={handleSkip}
      />

      {/* 视频对话框 */}
      <VideoUploadDialog
        open={showVideoDialog}
        onClose={() => setShowVideoDialog(false)}
        onConfirm={async (item: StagedMediaItem) => {
          if (isEditMode && spuId) {
            // 视频暂不支持编辑模式直接上传，提示
            alert('编辑模式暂不支持新增视频，请通过创建模式上传')
          } else {
            const stagedId = await addStagedItem(item)
            const updated = [...items, { ...item, id: stagedId }]
            notifyChange(updated)
          }
          setShowVideoDialog(false)
        }}
      />

      {/* 媒体信息编辑面板 */}
      {editingMedia && (
        <MediaEditPanel
          media={editingMedia}
          onSave={handleEditSave}
          onClose={() => setEditingMedia(null)}
        />
      )}
    </S.Container>
  )
}
