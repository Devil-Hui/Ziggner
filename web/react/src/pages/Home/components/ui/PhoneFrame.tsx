import styled from 'styled-components'
import { Ink, Elevation } from '../../editorial'

interface PhoneFrameProps {
  /** 畫面圖片來源（9:16 影像） */
  src?: string
  alt?: string
  /** 自訂畫面內容（優先於 src） */
  children?: React.ReactNode
  /** 手機寬度上限 */
  width?: number
  className?: string
}

/**
 * 手機外殼 — 純 CSS 繪製，無圖片資源。
 * ⚠️ DEPRECATED：落地页已改用 src/assets/landing 的实拍图 + FigureBox 图文同框，
 * 本组件当前无任何引用，保留仅为兼容；新需求请直接用 FigureBox。
 */
const Shell = styled.div<{ $width: number }>`
  position: relative;
  width: 100%;
  max-width: ${p => p.$width}px;
  margin-inline: auto;
  padding: 9px;
  border-radius: 42px;
  background: ${Ink.near};
  box-shadow: ${Elevation.float}, inset 0 0 0 1px rgba(255, 255, 255, 0.08);
`

const Screen = styled.div`
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 34px;
  overflow: hidden;
  background: ${Ink.near};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

/** 螢幕玻璃反光 */
const Glare = styled.span`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.14) 0%,
    rgba(255, 255, 255, 0) 38%,
    rgba(255, 255, 255, 0) 100%
  );
`

/** 瀏海 */
const Notch = styled.span`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 62px;
  height: 18px;
  border-radius: 999px;
  background: ${Ink.black};
  z-index: 2;
`

export default function PhoneFrame({
  src,
  alt = '',
  children,
  width = 250,
  className,
}: PhoneFrameProps) {
  return (
    <Shell $width={width} className={className}>
      <Screen>
        {children ??
          (src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : null)}
        <Glare />
        <Notch />
      </Screen>
    </Shell>
  )
}
