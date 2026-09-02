import styled from 'styled-components'
import { Font, Ink, Radius, Type, Elevation, cardSurface, gridContainer, Rhythm, mq } from '../editorial'
import { landingImages } from '../../../assets/landing'
import { Reveal } from './Reveal'
import { Button, FigureBox, FigureImage, IconBadge, SectionHead, type Tone } from './ui/primitives'
import { IconUser, IconMoon, IconZap, IconArrowRight } from './ui/Icon'

/* ── 資料 ─────────────────────────────────────────────────── */
const PATHS: {
  Icon: typeof IconUser
  tone: Tone
  title: string
  desc: string
  badge: string
  image: { src: string; alt: string }
  caption: string
}[] = [
  {
    Icon: IconUser,
    tone: 'brand',
    title: 'How to analyze competitors fast?',
    desc: 'The AI agent tracks competitor prices, sales and reviews in real time, then turns them into a one-click report.',
    badge: 'Fast competitor analysis',
    image: landingImages.agentCompetitor,
    caption: 'Figure 02 — Competitor analysis',
  },
  {
    Icon: IconMoon,
    tone: 'ink',
    title: 'How to build an e-commerce site fast?',
    desc: 'The AI agent generates your store, product pages and landing pages in minutes — no code required.',
    badge: 'Fast site builder',
    image: landingImages.agentSite,
    caption: 'Figure 03 — Site builder',
  },
  {
    Icon: IconZap,
    tone: 'blue',
    title: 'How to run marketing on autopilot?',
    desc: 'The AI agent handles customer service, campaigns and user growth while you focus on the big picture.',
    badge: 'AI marketing',
    image: landingImages.agentMarketing,
    caption: 'Figure 04 — AI marketing',
  },
]

/* ── 區塊 ─────────────────────────────────────────────────── */
const Section = styled.section`
  padding-block: ${Rhythm.section};
  background: ${Ink.paper};
  border-bottom: 1px solid ${Ink.rule};
`

const Grid12 = styled.div`
  ${gridContainer};
  row-gap: clamp(2rem, 5vw, 3rem);
`

const HeadRow = styled.div`
  grid-column: 1 / -1;
`

/* ── 三卡 ─────────────────────────────────────────────────── */
const Cards = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;

  ${mq.mdUp} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const PathCard = styled.div`
  ${cardSurface};
  border-radius: ${Radius.xl}px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${Elevation.hover};
  }
`

const PTitle = styled.h3`
  font-family: ${Font.display};
  font-size: 1.2rem;
  font-weight: 700;
  ${Type.tight}
  color: ${Ink.black};
  margin: 1rem 0 0.5rem;
`

const PDesc = styled.p`
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${Ink.graphite};
  margin: 0 0 1.25rem;
`

const PFigure = styled.div`
  margin-bottom: 1.1rem;
`

const PBadge = styled.div`
  margin-top: auto;
  padding: 0.55rem 0.9rem;
  border-radius: ${Radius.md}px;
  background: ${Ink.sunken};
  border: 1px solid ${Ink.rule};
  color: ${Ink.graphite};
  font-size: 0.78rem;
  font-weight: 700;
  text-align: center;
`

/* ── CTA ──────────────────────────────────────────────────── */
const CtaWrap = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
`

export default function Paths() {
  return (
    <Section id="paths">
      <Grid12>
        <HeadRow>
          <Reveal>
            <SectionHead
              eyebrow="AI e-commerce agents"
              title="Level up your e-commerce with AI"
              lead="Three AI agents every online store needs — analyze competitors, build your site, and run marketing on autopilot."
            />
          </Reveal>
        </HeadRow>

        <Cards>
          {PATHS.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <PathCard>
                <IconBadge $tone={p.tone} $size={44}>
                  <p.Icon />
                </IconBadge>
                <PTitle>{p.title}</PTitle>
                <PDesc>{p.desc}</PDesc>
                <PFigure>
                  <FigureBox label={p.caption} flush>
                    <FigureImage
                      src={p.image.src}
                      alt={p.image.alt}
                      loading="lazy"
                    />
                  </FigureBox>
                </PFigure>
                <PBadge>{p.badge}</PBadge>
              </PathCard>
            </Reveal>
          ))}
        </Cards>

        <CtaWrap>
          <Reveal delay={120}>
            <Button href="#start">
              Find My Path <IconArrowRight />
            </Button>
          </Reveal>
        </CtaWrap>
      </Grid12>
    </Section>
  )
}
