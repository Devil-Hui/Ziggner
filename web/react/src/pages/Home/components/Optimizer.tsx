import styled from 'styled-components'
import { Font, Ink, Radius, Type, cardSurface, gridContainer, Rhythm } from '../editorial'
import { landingImages } from '../../../assets/landing'
import { Reveal } from './Reveal'
import { SectionHead } from './ui/primitives'
import TikTokPhone from './ui/TikTokPhone'
import { IconArrowRight } from './ui/Icon'

/* ── 資料 ─────────────────────────────────────────────────── */
const COMPARE = [
  { label: 'Views', before: '1.2K', after: '84K', delta: '+6,900%' },
  { label: '3s Retention', before: '24%', after: '71%', delta: '+47 pts' },
  { label: 'Avg Watch', before: '0:08', after: '0:41', delta: '+0:33' },
  { label: 'Completion', before: '12%', after: '48%', delta: '+36 pts' },
]

/* ── 區塊 ─────────────────────────────────────────────────── */
const Section = styled.section`
  padding-block: ${Rhythm.section};
  background: ${Ink.paperAlt};
  border-bottom: 1px solid ${Ink.rule};
`

const Grid12 = styled.div`
  ${gridContainer};
  row-gap: clamp(2rem, 5vw, 3rem);
`

const HeadRow = styled.div`
  grid-column: 1 / -1;
`

/* ── 前後對比（Before 左 → 箭头 → After → 指标卡最右） ─────── */
const Compare = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 1rem;
  flex-wrap: nowrap;
  padding-bottom: 24px;
`

const PhoneWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  width: 240px;
  flex-shrink: 0;
`

/** Compare 内的 Reveal：禁止被 flex 压缩，保证手机/箭头/指标卡保持原尺寸 */
const CompareReveal = styled(Reveal)`
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
`

/** 手机之间的箭头 */
const ArrowMid = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${Ink.paper};
  border: 1px solid ${Ink.rule};
  color: ${Ink.brand};
  box-shadow: 0 4px 14px rgba(14, 16, 19, 0.08);
  flex-shrink: 0;
  align-self: center;

  svg {
    width: 16px;
    height: 16px;
  }
`

/* ── 指標對照（竖排，放在最右侧） ─────────────────────────── */
const Stats = styled.div`
  ${cardSurface};
  border-radius: ${Radius.xl}px;
  padding: 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  width: 240px;
  height: 420px;
  flex-shrink: 0;
`

const Stat = styled.div`
  text-align: left;
`

const StatLabel = styled.div`
  ${Type.wideCaps}
  font-size: 0.7rem;
  font-weight: 600;
  color: ${Ink.faint};
  margin-bottom: 0.5rem;
`

const StatPair = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.5rem;
`

const Before = styled.span`
  ${Type.tnum}
  font-family: ${Font.display};
  font-size: 1.05rem;
  font-weight: 600;
  color: ${Ink.faint};
  text-decoration: line-through;
`

const ArrowSmall = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${Ink.faint};

  svg {
    width: 13px;
    height: 13px;
  }
`

const After = styled.span`
  ${Type.tnum}
  font-family: ${Font.display};
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${Ink.black};
`

const StatDelta = styled.div`
  ${Type.tnum}
  margin-top: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${Ink.up};
`

export default function Optimizer() {
  return (
    <Section id="optimizer">
      <Grid12>
        <HeadRow>
          <Reveal>
            <SectionHead
              eyebrow="AI Optimizer"
              tone="brand"
              title="Turn raw clips into retention-optimised videos"
              lead="Drop in any raw recording. The AI rebuilds it — hook, captions, b-roll, pacing — and ships a cut that holds attention to the last second."
            />
          </Reveal>
        </HeadRow>

        <Compare data-compare>
          <CompareReveal>
            <PhoneWrap>
              <TikTokPhone
                src={landingImages.clipRaw.src}
                alt={landingImages.clipRaw.alt}
                dim
                handle="@maya.skincare"
                caption="Raw clip — no hook, no captions, no cuts"
                music="original sound · Maya Chen"
                likes="128"
                comments="14"
                bookmarks="32"
                shares="Share"
                width={240}
              />
            </PhoneWrap>
          </CompareReveal>

          <CompareReveal delay={80}>
            <ArrowMid aria-hidden="true">
              <IconArrowRight />
            </ArrowMid>
          </CompareReveal>

          <CompareReveal delay={120}>
            <PhoneWrap>
              <TikTokPhone
                src={landingImages.clipAi.src}
                alt={landingImages.clipAi.alt}
                handle="@maya.skincare"
                caption="AI-optimized — hook, captions & b-roll added ✨"
                music="original sound · Maya Chen"
                likes="84.2K"
                comments="6,318"
                bookmarks="12,904"
                shares="Share"
                width={240}
              />
            </PhoneWrap>
          </CompareReveal>

          <CompareReveal delay={160}>
            <Stats data-stats>
              {COMPARE.map(c => (
                <Stat key={c.label}>
                  <StatLabel>{c.label}</StatLabel>
                  <StatPair>
                    <Before>{c.before}</Before>
                    <ArrowSmall>
                      <IconArrowRight />
                    </ArrowSmall>
                    <After>{c.after}</After>
                  </StatPair>
                  <StatDelta>{c.delta}</StatDelta>
                </Stat>
              ))}
            </Stats>
          </CompareReveal>
        </Compare>

        </Grid12>
    </Section>
  )
}
