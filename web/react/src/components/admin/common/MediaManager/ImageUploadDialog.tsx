/** ImageUploadDialog —— 图片上传 + 裁剪弹窗。
 * 支持队列模式：接收 dropzone 预选文件，直接进入裁剪流程。
 * 上传前自动压缩图片（>200KB 触发，保真优先：最长边≤2560px / ≤2.5MB / JPEG 0.92）。
 */
import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../../../../store/AppContext'
import ImageCropper from '../ImageCropper/ImageCropper'
import type { MultiSizeCropResult } from '../ImageCropper/ImageCropper.types'
import { prepareImageForUpload } from '../../../../utils/imageCompression'
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

  // 队列模式：外部传入 file 时，先校验+压缩再进入裁剪
  // 修复：原先直接 setSelectedFile(file) 绕过了尺寸/压缩防护，导致大图进裁剪器 OOM 闪退
  const preparedRef = useRef<File | null>(null)
  useEffect(() => {
    if (!file) {
      preparedRef.current = null
      return
    }
    if (preparedRef.current === file) return
    let cancelled = false
    setCompressing(true)
    prepareImageForUpload(file, {
      onReject: (msg) => {
        if (!cancelled) showToast(msg, 'warning')
      },
    }).then((res) => {
      if (cancelled) return
      setCompressing(false)
      if (res.ok && res.file) {
        preparedRef.current = file // 仅在成功后才标记，兼容 StrictMode 双调用
        setSelectedFile(res.file)
      } else if (onSkip) {
        preparedRef.current = file
        onSkip() // 被拒绝的文件在队列中跳过，避免整批卡死
      }
    })
    return () => {
      cancelled = true
    }
  }, [file])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCompressing(true)
    const res = await prepareImageForUpload(f, {
      onReject: (msg) => showToast(msg, 'warning'),
    })
    setCompressing(false)
    if (!res.ok || !res.file) return
    if (res.compressed && res.ratio != null) {
      showToast(`图片已压缩 (-${res.ratio}%)`, 'success')
    }
    setSelectedFile(res.file)
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
              maxWidth={2560}
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
                  <div style={{ fontSize: 12, marginTop: 8, color: '#999' }}>大图自动压缩（保真优先，最长边≤2560px）</div>
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
