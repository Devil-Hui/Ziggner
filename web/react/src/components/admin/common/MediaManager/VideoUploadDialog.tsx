/** VideoUploadDialog —— 视频上传弹窗（含头帧提取） */
import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../../../../store/AppContext'
import { extractVideoFrames } from '../../../../utils/videoFrameExtractor'
import type { VideoFrameResult } from '../../../../utils/videoFrameExtractor'
import type { StagedMediaItem } from '../../../../utils/mediaStaging'
import * as S from './MediaManager.styles'
import { useTranslation } from '@/i18n'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (item: StagedMediaItem) => void
}

export default function VideoUploadDialog({ open, onClose, onConfirm }: Props) {
  const { t } = useTranslation()
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
        showToast(t('admin.mediaManager.selectVideo'), 'warning')
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
      showToast(t('admin.mediaManager.frameExtractFailed') + ': ' + (err instanceof Error ? err.message : t('admin.mediaManager.unknownError')))
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
            <S.DialogTitle>{t('admin.mediaManager.processingVideo')}</S.DialogTitle>
            <S.ProcessingText>{t('admin.mediaManager.extractingFrames')}</S.ProcessingText>
          </>
        ) : selectedFile ? (
          <>
            <S.DialogTitle>{t('admin.mediaManager.previewFrame')}</S.DialogTitle>
            <div style={{ textAlign: 'center' }}>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={t('admin.mediaManager.videoFrame')}
                  style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
                />
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              </div>
            </div>
            <S.DialogActions>
              <S.ActionBtn onClick={onClose}>{t('common.cancel')}</S.ActionBtn>
              <S.ActionBtn $primary onClick={handleConfirm}>
                确认添加
              </S.ActionBtn>
            </S.DialogActions>
          </>
        ) : (
          <>
            <S.DialogTitle>{t('admin.mediaManager.addVideo')}</S.DialogTitle>
            <S.UploadZone onClick={() => fileInputRef.current?.click()}>
              <div>{t('admin.mediaManager.clickSelectVideo')}</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                支持 MP4 / WebM / MOV，最大 200MB，仅提取头帧预览
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
              <S.ActionBtn onClick={onClose}>{t('common.cancel')}</S.ActionBtn>
            </S.DialogActions>
          </>
        )}
      </S.DialogBox>
    </S.DialogOverlay>
  )
}