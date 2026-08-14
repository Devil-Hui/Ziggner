/** ImageUploadDialog —— 图片上传 + 裁剪弹窗。
 * 支持队列模式：接收 dropzone 预选文件，直接进入裁剪流程。
 * 上传前自动压缩图片（>200KB 触发，目标 ~85% 质量 JPEG）。
 */
import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../../../../store/AppContext'
import ImageCropper from '../ImageCropper/ImageCropper'
import type { MultiSizeCropResult } from '../ImageCropper/ImageCropper.types'
import { compressImage } from '../../../../utils/imageCompression'
import * as S from './MediaManager.styles'

interface Props {
  open: boolean
  /** 预选文件（来自 dropzone 队列），存在时直接进入裁剪 */
  file?: File | null
  onClose: () => void
  /** 裁剪完成回调，返回四尺寸结果 + 源文件 */
  onConfirm: (result: MultiSizeCropResult, sourceFile: File) => void
  /** 跳过当前文件（队列模式） */
  onSkip?: () => void
}

export default function ImageUploadDialog({ open, file, onClose, onConfirm, onSkip }: Props) {
  const { showToast } = useAppContext()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 队列模式：外部传入 file 时直接进入裁剪
  useEffect(() => {
    if (file) {
      setSelectedFile(file)
    }
  }, [file])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (!f.type.startsWith('image/')) {
        showToast('请选择图片文件', 'warning')
        return
      }
      // 大图自动压缩（>200KB 触发，~85% 质量 JPEG）
      if (f.size > 200 * 1024) {
        setCompressing(true)
        try {
          const compressed = await compressImage(f, { maxSizeMB: 1, maxWidthOrHeight: 2048, initialQuality: 0.85 })
          const ratio = ((1 - compressed.size / f.size) * 100).toFixed(0)
          if (compressed.size < f.size) {
            showToast(`图片已压缩 (-${ratio}%)`, 'success')
          }
          setSelectedFile(compressed)
        } catch {
          setSelectedFile(f) // 压缩失败用原图
        } finally {
          setCompressing(false)
        }
      } else {
        setSelectedFile(f)
      }
    }
  }

  const handleCropConfirm = (results: MultiSizeCropResult) => {
    if (selectedFile) {
      onConfirm(results, selectedFile)
    }
    setSelectedFile(null)
  }

  const handleCancel = () => {
    setSelectedFile(null)
    onClose()
  }

  if (!open) return null

  return (
    <S.DialogOverlay onClick={handleCancel}>
      <S.DialogBox onClick={(e) => e.stopPropagation()}>
        {selectedFile ? (
          <>
            <S.DialogTitle>裁剪图片 — {selectedFile.name}</S.DialogTitle>
            <ImageCropper
              file={selectedFile}
              onCrop={handleCropConfirm}
              onCancel={() => {
                setSelectedFile(null)
                // 队列模式下跳过当前文件
                if (file && onSkip) {
                  onSkip()
                }
              }}
              aspectRatio={1}
              maxWidth={2048}
            />
            {file && onSkip && (
              <S.DialogActions>
                <S.ActionBtn onClick={() => { setSelectedFile(null); onSkip() }}>跳过此张</S.ActionBtn>
              </S.DialogActions>
            )}
          </>
        ) : (
          <>
            <S.DialogTitle>添加图片</S.DialogTitle>
            <S.UploadZone onClick={() => !compressing && fileInputRef.current?.click()} style={{ opacity: compressing ? 0.6 : 1 }}>
              {compressing ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                  <div>正在压缩图片...</div>
                  <div style={{ fontSize: 12, marginTop: 8, color: '#999' }}>大图自动压缩可减小 60-80% 体积</div>
                </div>
              ) : (
                <>
                  <div>点击或拖拽选择图片</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    支持 JPG / PNG / WebP，最大 10MB（自动压缩）
                  </div>
                </>
              )}
            </S.UploadZone>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <S.DialogActions>
              <S.ActionBtn onClick={handleCancel}>取消</S.ActionBtn>
            </S.DialogActions>
          </>
        )}
      </S.DialogBox>
    </S.DialogOverlay>
  )
}
