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
    title: 'AI Twin',
    desc: 'Generate a digital twin that presents for you — your voice, your style, zero camera time.',
    badge: 'You, automated',
    image: landingImages.pathTwin,
    caption: 'Figure 02 — AI twin output',
  },
  {
    Icon: IconMoon,
    tone: 'ink',
    title: 'Faceless Creator',
    desc: 'Stay fully anonymous with stock b-roll, screen recordings and AI narration.',
    badge: '100% anonymous',
    image: landingImages.pathFaceless,
    caption: 'Figure 03 — Faceless workflow',
  },
  {
    Icon: IconZap,
    tone: 'blue',
    title: 'AI Optimized Creator',
    desc: 'Already filming? Let the AI rebuild your cuts for maximum retention and reach.',
    badge: 'Boost your reach',
    image: landingImages.pathOptimized,
    caption: 'Figure 04 — Optimized workflow',
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
              eyebrow="Creator modes"
              title="You don’t need to be on camera"
              lead="Pick how you want to show up — or not. Every path ships the same AI engine behind your content."
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
