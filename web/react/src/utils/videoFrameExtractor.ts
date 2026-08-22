/**
 * 视频头帧提取工具
 * ================
 * 从视频文件中提取第一帧（跳转到 1 秒或 10% 位置），生成 3 尺寸 Blob
 * 返回原视频的 blob URL 用于 CSS 预览
 */

import { WEBP_QUALITY } from './imageCompression'
import { matchBestRatio } from '../components/admin/common/ImageCropper/ImageCropper'

export interface VideoFrameResult {
  thumb: { blob: Blob; dataUrl: string }   // 200 × 200/ratio（按源帧最佳比例）
  list: { blob: Blob; dataUrl: string }    // 400 × 400/ratio
  large: { blob: Blob; dataUrl: string }   // 800 × 800/ratio
  videoBlob: Blob
  videoBlobUrl: string
}

function generateFrameSizes(
  video: HTMLVideoElement,
  currentTime: number
): Promise<{ thumb: { blob: Blob; dataUrl: string }; list: { blob: Blob; dataUrl: string }; large: { blob: Blob; dataUrl: string } }> {
  return new Promise((resolve) => {
    video.currentTime = currentTime
    video.onseeked = () => {
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      // 视频封面按源帧比例自动匹配最合适的标准比例（与图片裁切策略一致）
      const ratio = matchBestRatio(videoWidth, videoHeight)
      const deriveH = (w: number) => Math.max(1, Math.round(w / ratio))
      const sizes = [
        { key: 'thumb', w: 200, h: deriveH(200) },
        { key: 'list', w: 400, h: deriveH(400) },
        { key: 'large', w: 800, h: deriveH(800) },
      ] as const
      const results: Record<string, { blob: Blob; dataUrl: string }> = {}
      let completed = 0

      for (const size of sizes) {
        const canvas = document.createElement('canvas')
        canvas.width = size.w
        canvas.height = size.h
        const ctx = canvas.getContext('2d')!
        // 保持宽高比，居中裁剪到目标比例
        const scale = Math.max(size.w / videoWidth, size.h / videoHeight)
        const sw = size.w / scale
        const sh = size.h / scale
        const sx = (videoWidth - sw) / 2
        const sy = (videoHeight - sh) / 2
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size.w, size.h)
        // 视频封面也统一 WebP，与全局图片策略一致
        const dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY)
        canvas.toBlob(
          (blob) => {
            completed++
            if (blob) results[size.key] = { blob, dataUrl }
            // 无论 blob 是否为 null，都跟踪完成数，防止 Promise 永不 resolve
            if (completed === sizes.length) {
              resolve(results as any)
            }
          },
          'image/webp',
          WEBP_QUALITY
        )
      }
    }
  })
}

export function extractVideoFrames(file: File): Promise<VideoFrameResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    const blobUrl = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      // 跳转到 1 秒或视频时长的 10%
      const seekTime = Math.min(1, video.duration * 0.1)
      generateFrameSizes(video, seekTime).then((frames) => {
        const result: VideoFrameResult = {
          ...frames,
          videoBlob: file,
          videoBlobUrl: blobUrl,
        }
        resolve(result)
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('Failed to load video, please check the file format'))
    }

    video.src = blobUrl
    video.load()
  })
}

/**
 * 清理视频 blob URL
 */
export function revokeVideoBlobUrl(url: string): void {
  URL.revokeObjectURL(url)
}