/** ImageCropper 组件 Props */

export interface MultiSizeCropResult {
  thumb: { blob: Blob; dataUrl: string }   // 200x200
  list: { blob: Blob; dataUrl: string }    // 400x400
  large: { blob: Blob; dataUrl: string }   // 800x800
  original: { blob: Blob; dataUrl: string } // ≤2560px 最长边
}

export interface ImageCropperProps {
  /** 待裁剪的图片 File */
  file: File | null
  /** 裁剪完成回调 (多尺寸) */
  onCrop: (results: MultiSizeCropResult) => void
  /** 取消裁剪 */
  onCancel: () => void
  /** 裁剪宽高比 (默认 1:1) */
  aspectRatio?: number
  /** 原图最大宽度 (默认 2560) */
  maxWidth?: number
  /** 画布宽度 (默认 400) */
  canvasWidth?: number
}