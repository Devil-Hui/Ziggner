/**
 * HorizontalScroll — 横向可滚动容器 + 底部可拖拽滚动条
 * ───────────────────────────────────────────
 * 用于「一行放不下、需要横向滚动」的场景（字母导航、筛选标签等）。
 * - 原生滚动条隐藏，改为底部一条可拖拽的滚动条（thumb）
 * - 内容区支持按住拖拽平移（drag-to-scroll）
 * - 仅在内容溢出时出现滚动条；窗口/内容尺寸变化自动重算
 *
 * 用法：
 *   <HorizontalScroll>
 *     <AlphabetNav> ... </AlphabetNav>   // 内部保持 display:flex 即可
 *   </HorizontalScroll>
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { Color, Radius } from '../../theme/tokens'

const Viewport = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* IE/Edge */
  &::-webkit-scrollbar { display: none; }
  cursor: grab;
  &:active { cursor: grabbing; }
`

const Track = styled.div`
  position: relative;
  height: 4px;
  margin-top: 6px;
  background: ${Color.border.light};
  border-radius: ${Radius.xs}px;
  cursor: pointer;
`

const Thumb = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  background: ${Color.primary};
  border-radius: ${Radius.xs}px;
  min-width: 24px;
`

type Bar = { visible: boolean; left: number; width: number }

export const HorizontalScroll: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const vpRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [bar, setBar] = useState<Bar>({ visible: false, left: 0, width: 0 })

  const recalc = useCallback(() => {
    const vp = vpRef.current
    if (!vp) return
    const { scrollLeft, scrollWidth, clientWidth } = vp
    const overflow = scrollWidth - clientWidth
    if (overflow <= 1) {
      setBar({ visible: false, left: 0, width: 0 })
      return
    }
    const width = Math.max(24, (clientWidth / scrollWidth) * clientWidth)
    const left = (scrollLeft / overflow) * (clientWidth - width)
    setBar({ visible: true, left, width })
  }, [])

  useEffect(() => {
    const vp = vpRef.current
    if (!vp) return
    recalc()
    vp.addEventListener('scroll', recalc, { passive: true })
    const ro = new ResizeObserver(recalc)
    ro.observe(vp)
    return () => {
      vp.removeEventListener('scroll', recalc)
      ro.disconnect()
    }
  }, [recalc])

  // ── 内容区：按住拖拽平移 ──
  const contentDrag = useRef<{ x: number; scroll: number } | null>(null)
  const onVPDown = (e: React.PointerEvent) => {
    const vp = vpRef.current
    if (!vp) return
    contentDrag.current = { x: e.clientX, scroll: vp.scrollLeft }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onVPMove = (e: React.PointerEvent) => {
    const vp = vpRef.current
    const st = contentDrag.current
    if (!vp || !st) return
    vp.scrollLeft = st.scroll - (e.clientX - st.x)
  }
  const onVPUp = (e: React.PointerEvent) => {
    contentDrag.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  // ── 底部滚动条：拖拽 thumb 滚动 ──
  const thumbDrag = useRef<{ x: number; left: number } | null>(null)
  const onTrackDown = (e: React.PointerEvent) => {
    const track = trackRef.current
    const vp = vpRef.current
    if (!track || !vp || !bar.visible) return
    const rect = track.getBoundingClientRect()
    const overflow = vp.scrollWidth - vp.clientWidth
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const ratio = rect.width > bar.width ? clickX / (rect.width - bar.width) : 0
    const newScroll = ratio * overflow
    vp.scrollLeft = newScroll
    const newLeft = (newScroll / overflow) * (rect.width - bar.width)
    thumbDrag.current = { x: e.clientX, left: newLeft }
    recalc()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onTrackMove = (e: React.PointerEvent) => {
    const track = trackRef.current
    const vp = vpRef.current
    const td = thumbDrag.current
    if (!track || !vp || !td || !bar.visible) return
    const rect = track.getBoundingClientRect()
    const overflow = vp.scrollWidth - vp.clientWidth
    const dx = e.clientX - td.x
    let newLeft = td.left + dx
    newLeft = Math.max(0, Math.min(newLeft, rect.width - bar.width))
    vp.scrollLeft = overflow > 0 ? (newLeft / (rect.width - bar.width)) * overflow : 0
    recalc()
  }
  const onTrackUp = (e: React.PointerEvent) => {
    thumbDrag.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div className={className}>
      <Viewport
        ref={vpRef}
        onPointerDown={onVPDown}
        onPointerMove={onVPMove}
        onPointerUp={onVPUp}
        onPointerCancel={onVPUp}
      >
        {children}
      </Viewport>
      {bar.visible && (
        <Track
          ref={trackRef}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
        >
          <Thumb style={{ left: bar.left, width: bar.width }} />
        </Track>
      )}
    </div>
  )
}

export default HorizontalScroll
