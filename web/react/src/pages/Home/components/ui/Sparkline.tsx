import styled, { css, keyframes } from 'styled-components'
import { Ink } from '../../editorial'

interface SparklineProps {
  /** 數據點序列，由左至右 */
  data: number[]
  /** 線條顏色 */
  color?: string
  /** 是否繪製漸層填充 */
  fill?: boolean
  /** 是否播放描線動畫 */
  animate?: boolean
  className?: string
}

const trace = keyframes`
  from { stroke-dashoffset: 400; }
  to   { stroke-dashoffset: 0; }
`

const W = 100
const H = 32

/**
 * 以 div 包住原生 svg，避免 styled.svg API 相容性問題；
 * 動畫以 css`` 標記，確保 keyframes 可正確插值。
 */
const Wrap = styled.div<{ $animate: boolean }>`
  width: 100%;

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .line {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  ${p =>
    p.$animate &&
    css`
      .line {
        stroke-dasharray: 400;
        animation: ${trace} 1.6s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
    `}
`

/**
 * 迷你趨勢線 — 手寫 SVG，無圖表庫依賴。
 * 供指標卡與創作者檔案復用。
 */
export default function Sparkline({
  data,
  color = Ink.brand,
  fill = false,
  animate = true,
  className,
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pad = 3

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - pad - ((v - min) / span) * (H - pad * 2)
    return [x, y] as const
  })

  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const gradId = `spark-${color.replace('#', '')}`

  return (
    <Wrap $animate={animate} className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {fill && (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} />
          </>
        )}
        <path
          className="line"
          d={line}
          stroke={color}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Wrap>
  )
}
