/**
 * Koboyo hand-drawn refresh icon (koboyo.com/icons/refresh-cw)
 * 通过相对路径引用本地下载的 svg 源文件（src/assets/icons/refresh-koboyo.svg），
 * 该文件为唯一源；运行时提取 path/viewBox 渲染，保留 currentColor 主题跟随。
 * 用法：<KoboyoRefreshIcon size={18} />
 */
import React from 'react'
import refreshSvg from '../../../../assets/icons/refresh-koboyo.svg?raw'

// 从 svg 源文件提取 path 与 viewBox（去除 path 自身 stroke，交由外层控制颜色）
const REFRESH_PATH = (refreshSvg.match(/<path[\s\S]*?<\/path>/)?.[0] ?? '').replace('stroke="currentColor"', '')
const REFRESH_VIEWBOX = refreshSvg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24'
const REFRESH_STROKE_WIDTH = refreshSvg.match(/stroke-width="([^"]+)"/)?.[1] ?? '2.5'

interface KoboyoRefreshIconProps {
  size?: number
  color?: string
  className?: string
  title?: string
}

export const KoboyoRefreshIcon: React.FC<KoboyoRefreshIconProps> = ({
  size = 18,
  color,
  className,
  title,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={REFRESH_VIEWBOX}
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth={REFRESH_STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    style={{ verticalAlign: 'middle', display: 'inline-block' }}
  >
    {title && <title>{title}</title>}
    <g dangerouslySetInnerHTML={{ __html: REFRESH_PATH }} />
  </svg>
)

export default KoboyoRefreshIcon
