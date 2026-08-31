import styled from 'styled-components'
import type { ComponentType, SVGProps } from 'react'
import { Font, Ink, Radius, Type, cardSurface, gridContainer, Rhythm, mq } from '../editorial'
import { landingImages } from '../../../assets/landing'
import { Reveal } from './Reveal'
import { FigureBox, FigureImage, SectionHead } from './ui/primitives'
import { IconHook, IconMic, IconClapper, IconMessage, IconUpload, IconChart } from './ui/Icon'

/* ── 資料 ─────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, title: 'Pick a Niche', desc: 'Choose a topic the AI will master.' },
  { n: 2, title: 'Generate Script', desc: 'AI writes a viral-ready script.' },
  { n: 3, title: 'Auto Hook', desc: 'A scroll-stopping opener is crafted.' },
  { n: 4, title: 'Add Captions', desc: 'Subtitles are auto-generated.' },
  { n: 5, title: 'Insert B-roll', desc: 'B-roll boosts watch time.' },
  { n: 6, title: 'Publish & Grow', desc: 'Post daily and track growth.' },
]

type AgentIcon = ComponentType<SVGProps<SVGSVGElement>>

const AGENTS: { Icon: AgentIcon; name: string; role: string; color: string }[] = [
  { Icon: IconHook, name: 'Hook Generator', role: 'Writes scroll-stopping openers', color: Ink.brand },
  { Icon: IconMic, name: 'Voice & Script', role: 'Narrates with your cloned tone', color: Ink.brandDeep },
  { Icon: IconClapper, name: 'B-roll Finder', role: 'Sources matching stock footage', color: Ink.cyan },
  { Icon: IconMessage, name: 'Caption Bot', role: 'Adds accurate styled subtitles', color: Ink.amber },
  { Icon: IconUpload, name: 'Auto Poster', role: 'Schedules posts at peak hours', color: Ink.rose },
  { Icon: IconChart, name: 'Analytics', role: 'Tracks retention and revenue', color: Ink.up },
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

/* ── 左：六步驟（1px 細線連接） ──────────────────────────── */
const Layout = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1.75rem, 4vw, 3rem);
  align-items: start;

  ${mq.mdUp} {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
`

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: 1rem;

  ${mq.lgUp} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const Step = styled.li`
  ${cardSurface};
  position: relative;
  height: 100%;
  border-radius: ${Radius.xl}px;
  padding: 1.25rem 1rem;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(14, 16, 19, 0.08);
  }
`

const Num = styled.div`
  width: 34px;
  height: 34px;
  margin-bottom: 0.85rem;
  border-radius: ${Radius.sm}px;
  background: ${Ink.black};
  color: ${Ink.paper};
  font-family: ${Font.display};
  ${Type.tnum}
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StepTitle = styled.h3`
  font-family: ${Font.display};
  font-size: 0.95rem;
  font-weight: 700;
  ${Type.tight}
  color: ${Ink.black};
  margin: 0 0 0.35rem;
`

const StepDesc = styled.p`
  font-size: 0.78rem;
  line-height: 1.5;
  color: ${Ink.graphite};
  margin: 0;
`

/* ── 右：實拍圖 ───────────────────────────────────────────── */
const AsideFigure = styled.div`
  ${mq.mdUp} {
    position: sticky;
    top: 96px;
  }
`

/* ── AI 智能體（淺色卡片區） ─────────────────────────────── */
const TeamReveal = styled(Reveal)`
  grid-column: 1 / -1;
`

const Team = styled.div`
  border-radius: ${Radius.xxl}px;
  padding: clamp(1.5rem, 3.5vw, 2.5rem);
  background: ${Ink.paperAlt};
  border: 1px solid ${Ink.rule};
`

const TeamHead = styled.div`
  text-align: center;
  margin-bottom: 1.75rem;
`

const TeamTitle = styled.h3`
  font-family: ${Font.display};
  font-size: clamp(1.25rem, 2.4vw, 1.75rem);
  font-weight: 800;
  ${Type.tight}
  color: ${Ink.black};
  margin: 0 0 0.4rem;
`

const TeamSub = styled.p`
  font-size: 0.9rem;
  line-height: 1.6;
  color: ${Ink.graphite};
  margin: 0 auto;
  max-width: 52ch;
`

const Agents = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;

  ${mq.mdUp} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  ${mq.lgUp} {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
`

const Agent = styled.div`
  background: ${Ink.paper};
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.lg}px;
  padding: 1.05rem 0.9rem;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: ${Ink.ruleStrong};
    box-shadow: 0 8px 24px rgba(14, 16, 19, 0.08);
  }
`

const AIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  margin: 0 auto 0.7rem;
  border-radius: ${Radius.md}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.$color};
  color: ${Ink.paper};

  svg {
    width: 21px;
    height: 21px;
  }
`

const AName = styled.div`
  font-family: ${Font.display};
  font-size: 0.88rem;
  font-weight: 700;
  color: ${Ink.black};
  margin-bottom: 0.25rem;
`

const ARole = styled.div`
  font-size: 0.72rem;
  line-height: 1.45;
  color: ${Ink.graphite};
`

export default function Journey() {
  return (
    <Section id="journey">
      <Grid12>
        <HeadRow>
          <Reveal>
            <SectionHead
              eyebrow="The workflow"
              title="From zero to creator in 30 days"
              lead="Six steps, fully automated. Your only job is choosing the niche — the agents handle the rest."
            />
          </Reveal>
        </HeadRow>

        <Layout>
          <Steps>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 70}>
                <Step>
                  <Num>{s.n}</Num>
                  <StepTitle>{s.title}</StepTitle>
                  <StepDesc>{s.desc}</StepDesc>
                </Step>
              </Reveal>
            ))}
          </Steps>

          <Reveal delay={120}>
            <AsideFigure>
              <FigureBox
                label="Figure 05 — The 30-day creator journey"
                meta="Day 1 → Day 30"
                flush
              >
                <FigureImage
                  src={landingImages.journey.src}
                  alt={landingImages.journey.alt}
                  loading="lazy"
                />
              </FigureBox>
            </AsideFigure>
          </Reveal>
        </Layout>

        <TeamReveal delay={100}>
          <Team>
            <TeamHead>
              <TeamTitle>Your AI creator team</TeamTitle>
              <TeamSub>
                Six specialised agents working in parallel on every single video you publish.
              </TeamSub>
            </TeamHead>
            <Agents>
              {AGENTS.map(a => (
                <Agent key={a.name}>
                  <AIcon $color={a.color}>
                    <a.Icon />
                  </AIcon>
                  <AName>{a.name}</AName>
                  <ARole>{a.role}</ARole>
                </Agent>
              ))}
            </Agents>
          </Team>
        </TeamReveal>
      </Grid12>
    </Section>
  )
}
