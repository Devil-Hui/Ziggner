import styled, { keyframes } from 'styled-components'
import { Ink, Font, Display, Type, Radius, Elevation, gridContainer, Ease, mq } from '../editorial'
import { landingImages } from '../../../assets/landing'
import { MaskLine, Reveal } from './Reveal'
import TikTokPhone from './ui/TikTokPhone'
import { IconSparkles, IconStar, IconPlay, IconArrowRight, IconUsers } from './ui/Icon'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`

/**
 * Hero — 左標題 + 右實拍圖／數據卡雙卡構圖
 * 產品價值前置：以真實創作者畫面與成長數據建立信任。
 * 背景柔光改為品牌紅極淡暈染（原紫調柔光已移除）。
 */
const Section = styled.section`
  position: relative;
  overflow: hidden;
  padding: clamp(6.5rem, 12vh, 9rem) 0 clamp(2.5rem, 5vw, 4rem);
  background: ${Ink.paper};
  border-bottom: 1px solid ${Ink.rule};
`

/** 背景柔光：品牌紅極淡暈染，僅作層次，不搶內容 */
const Blob = styled.span`
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
`

const BlobA = styled(Blob)`
  width: 460px;
  height: 460px;
  background: rgba(254, 44, 85, 0.07);
  top: -140px;
  right: -80px;
`

const BlobB = styled(Blob)`
  width: 380px;
  height: 380px;
  background: rgba(35, 88, 216, 0.06);
  bottom: -120px;
  left: -120px;
`

const Grid12 = styled.div`
  ${gridContainer};
  position: relative;
  z-index: 1;
  align-items: center;
  row-gap: clamp(2.5rem, 6vw, 4rem);
`

/* ── 左欄 ───────────────────────────────────────────────── */
const Left = styled.div`
  grid-column: 1 / -1;
  ${mq.mdUp} {
    grid-column: 1 / 7;
  }
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.brandSoft};
  border: 1px solid ${Ink.brandBorder};
  color: ${Ink.brand};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin-bottom: 1.4rem;
  animation: ${fadeUp} 0.8s ${Ease.cinema} both;

  svg {
    width: 14px;
    height: 14px;
  }
`

const Title = styled.h1`
  font-family: ${Font.display};
  font-size: ${Display.hero};
  font-weight: 800;
  line-height: 1.03;
  ${Type.tighter}
  color: ${Ink.black};
  margin: 0 0 1.1rem;

  em {
    font-style: normal;
    color: ${Ink.brand};
  }
`

const Sub = styled.p`
  font-size: clamp(0.95rem, 1.2vw, 1.075rem);
  line-height: 1.65;
  color: ${Ink.graphite};
  max-width: 46ch;
  margin: 0 0 1.9rem;
  animation: ${fadeUp} 0.8s ${Ease.cinema} 0.5s both;
`

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2.1rem;
  animation: ${fadeUp} 0.8s ${Ease.cinema} 0.6s both;
`

const PrimaryCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.9rem 1.65rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.black};
  color: ${Ink.paper};
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: ${Elevation.ink};
  transition: background 0.3s ${Ease.cinema}, transform 0.3s ${Ease.cinema};

  &:hover {
    background: #000;
    transform: translateY(-2px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const GhostCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.9rem 1.65rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.paper};
  border: 1px solid ${Ink.ruleStrong};
  color: ${Ink.black};
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.3s ease, color 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: ${Ink.black};
    transform: translateY(-2px);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

/* ── 社交證明 ───────────────────────────────────────────── */
const Proof = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.8s ${Ease.cinema} 0.7s both;
`

const Avatars = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 82px;
  height: 34px;
  border-radius: ${Radius.full}px;
  background: ${Ink.sunken};
  border: 1px solid ${Ink.rule};
  color: ${Ink.graphite};

  svg {
    width: 20px;
    height: 20px;
  }
`

const ProofText = styled.div`
  font-size: 0.82rem;
  color: ${Ink.graphite};
  line-height: 1.45;

  strong {
    display: block;
    color: ${Ink.black};
    font-weight: 700;
    font-size: 0.88rem;
  }
`

const Stars = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 1px;
  color: ${Ink.amber};
  vertical-align: -1px;

  svg {
    width: 13px;
    height: 13px;
  }
`

/* ── 右欄：實拍圖 + 數據卡 ──────────────────────────────── */
const Right = styled.div`
  grid-column: 1 / -1;
  position: relative;
  ${mq.mdUp} {
    grid-column: 7 / 13;
  }
`

const Stage = styled.div`
  position: relative;
  max-width: 320px;
  margin-inline: auto;
`

const FigureHolder = styled.div`
  animation: ${fadeUp} 1s ${Ease.cinema} 0.2s both;
`

export default function Hero() {
  return (
    <Section id="top">
      <BlobA />
      <BlobB />
      <Grid12>
        <Left>
          <Badge>
            <IconSparkles /> AI Creator Incubator
          </Badge>
          <Title>
            <MaskLine delay={80}>Build a</MaskLine>
            <MaskLine delay={160}>
              <em>TikTok</em> Creator
            </MaskLine>
            <MaskLine delay={240}>Career Without</MaskLine>
            <MaskLine delay={320}>Showing Your Face</MaskLine>
          </Title>
          <Sub>
            Turn short-form content into a real income stream. AI writes your hooks, generates
            captions and adds B-roll — so you grow from zero to monetised on autopilot.
          </Sub>
          <CtaRow>
            <PrimaryCta href="#start">
              Start Building Free <IconArrowRight />
            </PrimaryCta>
            <GhostCta href="#optimizer">
              <IconPlay /> See How It Works
            </GhostCta>
          </CtaRow>
          <Proof>
            <Avatars>
              <IconUsers />
            </Avatars>
            <ProofText>
              <strong>
                <Stars>
                  <IconStar />
                  <IconStar />
                  <IconStar />
                  <IconStar />
                  <IconStar />
                </Stars>{' '}
                4.9 · 2,400+ creators
              </strong>
              Global community across 40+ countries
            </ProofText>
          </Proof>
        </Left>

        <Right>
          <Reveal delay={100}>
            <Stage>
              <FigureHolder>
                <TikTokPhone
                  src={landingImages.clipAi.src}
                  alt={landingImages.clipAi.alt}
                  handle="@maya.skincare"
                  caption="AI-optimized skincare routine — 30s faceless tutorial ✨"
                  music="original sound · Maya Chen"
                  likes="12.4K"
                  comments="1,208"
                  bookmarks="3,402"
                  shares="Share"
                  width={240}
                />
              </FigureHolder>
            </Stage>
          </Reveal>
        </Right>
      </Grid12>
    </Section>
  )
}
