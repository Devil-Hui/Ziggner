/** VideoUploadDialog —— 视频上传弹窗（含头帧提取） */
import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../../../../store/AppContext'
import { extractVideoFrames } from '../../../../utils/videoFrameExtractor'
import type { VideoFrameResult } from '../../../../utils/videoFrameExtractor'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import * as S from './MediaManager.styles'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (item: StagedMediaItem) => void
}

export default function VideoUploadDialog({ open, onClose, onConfirm }: Props) {
  const { showToast } = useAppContext()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const frameResultRef = useRef<VideoFrameResult | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setProcessing(false)
      setPreviewUrl('')
    }
  }, [open])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        showToast('请选择视频文件', 'warning')
        return
      }
      setSelectedFile(file)
      setProcessing(true)
      handleExtractFrames(file)
    }
  }

  const handleExtractFrames = async (file: File) => {
    try {
      const result = await extractVideoFrames(file)
      setPreviewUrl(result.thumb.dataUrl)
      frameResultRef.current = result
      setProcessing(false)
    } catch (err) {
      showToast('视频头帧提取失败: ' + (err instanceof Error ? err.message : '未知错误'))
      setProcessing(false)
      setSelectedFile(null)
    }
  }

  const handleConfirm = () => {
    const result = frameResultRef.current
    if (!result) return

    const item: StagedMediaItem = {
      mediaType: 'video',
      videoBlob: selectedFile!,
      videoFrameThumb: result.thumb.blob,
      videoFrameList: result.list.blob,
      videoFrameLarge: result.large.blob,
      previewDataUrl: result.videoBlobUrl,
      fileName: selectedFile!.name,
      fileSize: selectedFile!.size,
      createdAt: Date.now(),
    }
    frameResultRef.current = null
    onConfirm(item)
    onClose()
  }

  if (!open) return null

  return (
    <S.DialogOverlay onClick={onClose}>
      <S.DialogBox onClick={(e) => e.stopPropagation()}>
        {processing ? (
          <>
            <S.DialogTitle>处理视频</S.DialogTitle>
            <S.ProcessingText>正在提取视频头帧...</S.ProcessingText>
          </>
        ) : selectedFile ? (
          <>
            <S.DialogTitle>预览视频头帧</S.DialogTitle>
            <div style={{ textAlign: 'center' }}>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="视频头帧"
                  style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
                />
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              </div>
            </div>
            <S.DialogActions>
              <S.ActionBtn onClick={onClose}>取消</S.ActionBtn>
              <S.ActionBtn $primary onClick={handleConfirm}>
                确认添加
              </S.ActionBtn>
            </S.DialogActions>
          </>
        ) : (
          <>
            <S.DialogTitle>添加视频</S.DialogTitle>
            <S.UploadZone onClick={() => fileInputRef.current?.click()}>
              <div>点击选择视频文件</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                支持 MP4 / WebM，最大 10MB，仅提取头帧预览
              </div>
            </S.UploadZone>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <S.DialogActions>
              <S.ActionBtn onClick={onClose}>取消</S.ActionBtn>
            </S.DialogActions>
          </>
        )}
      </S.DialogBox>
    </S.DialogOverlay>
  )
}