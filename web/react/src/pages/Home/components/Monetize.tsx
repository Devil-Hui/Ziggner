import styled from 'styled-components'
import { Font, Ink, Radius, Type, cardSurface, gridContainer, Rhythm, mq } from '../editorial'
import { landingImages } from '../../../assets/landing'
import { Reveal } from './Reveal'
import { Button, FigureBox, FigureImage, Pill, SectionHead } from './ui/primitives'
import { IconClock, IconUser, IconArrowRight, IconWallet } from './ui/Icon'

/* ── 資料 ─────────────────────────────────────────────────── */
const TASKS = [
  {
    brand: 'GlowSkin Co.',
    cat: 'Beauty',
    brief: '30-second faceless skincare routine with product close-ups.',
    reward: '$8,400',
    deadline: '3 days left',
  },
  {
    brand: 'FitFuel',
    cat: 'Fitness',
    brief: 'Five-minute home workout series with dynamic b-roll cuts.',
    reward: '$6,200',
    deadline: '5 days left',
  },
  {
    brand: 'TechNest',
    cat: 'Tech',
    brief: 'Faceless desk-setup review with screen-recording b-roll.',
    reward: '$5,100',
    deadline: '7 days left',
  },
]

const RISING = [
  { rank: 1, name: 'Mia Chen', niche: 'Beauty', followers: '128K', delta: '+42%' },
  { rank: 2, name: 'Leo Park', niche: 'Fitness', followers: '96K', delta: '+38%' },
  { rank: 3, name: 'Ava Torres', niche: 'Tech', followers: '84K', delta: '+31%' },
]

/* ── 區塊 ─────────────────────────────────────────────────── */
const Section = styled.section`
  padding-block: ${Rhythm.section};
  background: ${Ink.paper};
  border-bottom: 1px solid ${Ink.rule};
`

const Grid12 = styled.div`
  ${gridContainer};
  row-gap: clamp(1.75rem, 4vw, 2.5rem);
`

const HeadRow = styled.div`
  grid-column: 1 / -1;
`

/* ── 左：品牌任務 ─────────────────────────────────────────── */
const TasksCol = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;

  ${mq.mdUp} {
    grid-column: 1 / 8;
  }
`

const TaskFigure = styled.div`
  margin-bottom: 0.35rem;
`

const TaskCard = styled.div`
  ${cardSurface};
  border-radius: ${Radius.xl}px;
  padding: 0.9rem;
  display: flex;
  gap: 0.95rem;
  align-items: center;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(14, 16, 19, 0.08);
  }
`

const Thumb = styled.div`
  width: 84px;
  height: 64px;
  border-radius: ${Radius.md}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${Ink.sunken};
  border: 1px solid ${Ink.rule};
  color: ${Ink.graphite};
  flex-shrink: 0;

  svg {
    width: 26px;
    height: 26px;
  }
`

const TaskBody = styled.div`
  flex: 1;
  min-width: 0;
`

const TaskTop = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
`

const BrandName = styled.span`
  font-family: ${Font.display};
  font-size: 0.95rem;
  font-weight: 700;
  ${Type.tight}
  color: ${Ink.black};
`

const Brief = styled.p`
  font-size: 0.8rem;
  line-height: 1.5;
  color: ${Ink.graphite};
  margin: 0 0 0.35rem;
`

const Deadline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: ${Ink.faint};

  svg {
    width: 11px;
    height: 11px;
  }
`

const TaskRight = styled.div`
  text-align: right;
  flex-shrink: 0;
`

const Reward = styled.div`
  ${Type.tnum}
  font-family: ${Font.display};
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${Ink.black};
`

const Claim = styled.a`
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.35rem 0.85rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.black};
  color: ${Ink.paper};
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.3s ease;

  &:hover {
    background: ${Ink.brand};
  }
`

/* ── 右：排行榜 ───────────────────────────────────────────── */
const RankCol = styled.div`
  grid-column: 1 / -1;
  ${cardSurface};
  border-radius: ${Radius.xl}px;
  padding: 1.35rem;

  ${mq.mdUp} {
    grid-column: 8 / 13;
  }
`

const RankTitle = styled.h3`
  font-family: ${Font.display};
  font-size: 1rem;
  font-weight: 700;
  ${Type.tight}
  color: ${Ink.black};
  margin: 0 0 0.2rem;
`

const RankSub = styled.p`
  font-size: 0.78rem;
  color: ${Ink.graphite};
  margin: 0 0 1.1rem;
`

const RankFigure = styled.div`
  margin-bottom: 1.1rem;
`

const RankRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0;

  & + & {
    border-top: 1px solid ${Ink.rule};
  }
`

const RankNum = styled.div<{ $top: boolean }>`
  ${Type.tnum}
  width: 26px;
  height: 26px;
  border-radius: ${Radius.sm}px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${p => (p.$top ? Ink.black : Ink.sunken)};
  border: 1px solid ${p => (p.$top ? Ink.black : Ink.rule)};
  color: ${p => (p.$top ? Ink.paper : Ink.graphite)};
`

const RankAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${Ink.sunken};
  border: 1px solid ${Ink.rule};
  color: ${Ink.graphite};
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
`

const RankWho = styled.div`
  flex: 1;
  min-width: 0;
`

const RankName = styled.div`
  font-size: 0.88rem;
  font-weight: 700;
  color: ${Ink.black};
`

const RankNiche = styled.div`
  font-size: 0.74rem;
  color: ${Ink.graphite};
`

const RankStat = styled.div`
  text-align: right;
`

const RankFollowers = styled.div`
  ${Type.tnum}
  font-family: ${Font.display};
  font-size: 0.9rem;
  font-weight: 700;
  color: ${Ink.black};
`

const RankDelta = styled.div`
  ${Type.tnum}
  font-size: 0.72rem;
  font-weight: 700;
  color: ${Ink.up};
`

/* ── CTA ──────────────────────────────────────────────────── */
const CtaWrap = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
`

export default function Monetize() {
  return (
    <Section id="monetize">
      <Grid12>
        <HeadRow>
          <Reveal>
            <SectionHead
              eyebrow="Marketplace"
              tone="brand"
              title="Don’t just create. Get paid."
              lead="Matched brand briefs land in your dashboard — priced against your real engagement, not follower count."
            />
          </Reveal>
        </HeadRow>

        <TasksCol>
          <Reveal>
            <TaskFigure>
              <FigureBox
                label="Figure 06 — Live brand briefs"
                meta="3 open campaigns · updated hourly"
                flush
              >
                <FigureImage
                  src={landingImages.brandProducts.src}
                  alt={landingImages.brandProducts.alt}
                  loading="lazy"
                  style={{ width: 553, height: 338 }}
                />
              </FigureBox>
            </TaskFigure>
          </Reveal>

          {TASKS.map((t, i) => (
            <Reveal key={t.brand} delay={i * 70}>
              <TaskCard>
                <Thumb>
                  <IconWallet />
                </Thumb>
                <TaskBody>
                  <TaskTop>
                    <BrandName>{t.brand}</BrandName>
                    <Pill $tone="ink">{t.cat}</Pill>
                  </TaskTop>
                  <Brief>{t.brief}</Brief>
                  <Deadline>
                    <IconClock /> {t.deadline}
                  </Deadline>
                </TaskBody>
                <TaskRight>
                  <Reward>{t.reward}</Reward>
                  <Claim href="#start">Claim</Claim>
                </TaskRight>
              </TaskCard>
            </Reveal>
          ))}
        </TasksCol>

        <RankCol>
          <Reveal delay={100}>
            <RankFigure>
              <FigureBox label="Figure 07 — Creator payouts" meta="This week" flush>
                <FigureImage
                  src={landingImages.creatorDesk.src}
                  alt={landingImages.creatorDesk.alt}
                  loading="lazy"
                  style={{ width: 345, height: 361 }}
                />
              </FigureBox>
            </RankFigure>

            <RankTitle>Rising Creators This Week</RankTitle>
            <RankSub>Fastest-growing faceless creators on Ziggner</RankSub>
            {RISING.map(r => (
              <RankRow key={r.rank}>
                <RankNum $top={r.rank === 1}>{r.rank}</RankNum>
                <RankAvatar>
                  <IconUser />
                </RankAvatar>
                <RankWho>
                  <RankName>{r.name}</RankName>
                  <RankNiche>{r.niche}</RankNiche>
                </RankWho>
                <RankStat>
                  <RankFollowers>{r.followers}</RankFollowers>
                  <RankDelta>{r.delta}</RankDelta>
                </RankStat>
              </RankRow>
            ))}
          </Reveal>
        </RankCol>

        <CtaWrap>
          <Reveal delay={120}>
            <Button href="#start">
              Join the Incubator <IconArrowRight />
            </Button>
          </Reveal>
        </CtaWrap>
      </Grid12>
    </Section>
  )
}
