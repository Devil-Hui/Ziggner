import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { Ease, Motion } from '../editorial'

/* ── IntersectionObserver hook ─────────────────────────────── */
function useInView(threshold = 0.15, rootMargin = '0px 0px -8% 0px') {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setInView(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin])
  return { ref, inView }
}

/* ── 1. 通用揭示：位移 + 淡入 ─────────────────────────────── */
const RevealBox = styled.div<{ $in: boolean; $delay: number; $y: number }>`
  opacity: 0;
  transform: translateY(${p => p.$y}px);
  transition: opacity ${Motion.reveal} ${Ease.cinema}, transform ${Motion.reveal} ${Ease.cinema};
  transition-delay: ${p => p.$delay}ms;
  will-change: opacity, transform;
  ${p =>
    p.$in &&
    css`
      opacity: 1;
      transform: translateY(0);
    `}
`

export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
  style,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  style?: CSSProperties
}) {
  const { ref, inView } = useInView()
  return (
    <RevealBox ref={ref} $in={inView} $delay={delay} $y={y} className={className} style={style}>
      {children}
    </RevealBox>
  )
}

/* ── 2. 文本遮罩揭示：行从下方滑出（电影感字幕感） ──────────── */
const MaskOuter = styled.span`
  display: block;
  overflow: hidden;
`

const MaskInner = styled.span<{ $in: boolean; $delay: number }>`
  display: block;
  transform: translateY(105%);
  transition: transform 0.9s ${Ease.reveal};
  transition-delay: ${p => p.$delay}ms;
  will-change: transform;
  ${p =>
    p.$in &&
    css`
      transform: translateY(0);
    `}
`

/**
 * 逐行遮罩揭示。用于巨型排版——每行独立滑出，营造电影字幕感。
 */
export function MaskLine({
  children,
  delay = 0,
  as: Tag = 'span',
}: {
  children: ReactNode
  delay?: number
  as?: 'span' | 'div'
}) {
  const { ref, inView } = useInView(0.1)
  return (
    <MaskOuter ref={ref} as={Tag}>
      <MaskInner $in={inView} $delay={delay}>
        {children}
      </MaskInner>
    </MaskOuter>
  )
}

/* ── 3. 缓慢缩放：图像缓慢呼吸（极慢，cinematic） ──────────── */
const zoom = keyframes`
  from { transform: scale(1.0); }
  to   { transform: scale(1.09); }
`

const ScaleBox = styled.div<{ $in: boolean }>`
  overflow: hidden;
  > * {
    transform: scale(1);
    ${p =>
      p.$in &&
      css`
        animation: ${zoom} ${Motion.slowScale} ${Ease.cinema} forwards;
      `}
  }
`

export function SlowScale({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView(0.05)
  return (
    <ScaleBox ref={ref} $in={inView} className={className}>
      {children}
    </ScaleBox>
  )
}

/* ── 4. 水平漂移：图像随滚动横向轻移 ──────────────────────── */
const DriftBox = styled.div<{ $offset: number; $in: boolean }>`
  transform: translateX(${p => (p.$in ? 0 : p.$offset)}px);
  transition: transform 2s ${Ease.cinema};
  will-change: transform;
`

export function Drift({
  children,
  offset = 60,
  className,
}: {
  children: ReactNode
  offset?: number
  className?: string
}) {
  const { ref, inView } = useInView(0.05)
  return (
    <DriftBox ref={ref} $offset={offset} $in={inView} className={className}>
      {children}
    </DriftBox>
  )
}

/* ── 5. 视差：随滚动位置位移 ──────────────────────────────── */
export function Parallax({
  children,
  speed = 0.12,
  className,
}: {
  children: ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const vh = window.innerHeight
      // -1 (below) → 0 (center) → 1 (above)
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / vh
      node.style.transform = `translate3d(0, ${(progress * speed * 100).toFixed(2)}px, 0)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [speed])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export default Reveal
