import styled from 'styled-components'
import {
  Font,
  Ink,
  Display,
  Radius,
  Type,
  Elevation,
  gridContainer,
  Rhythm,
  mq,
} from '../editorial'
import { landingImages } from '../../../assets/landing'
import { Reveal, MaskLine } from './Reveal'
import { FigureBox, FigureImage } from './ui/primitives'
import { IconSparkles, IconArrowRight, IconCheck } from './ui/Icon'

/**
 * 收尾 — 墨黑 CTA 區（原紫色漸變）+ 實拍圖圖文同框 + 四列頁腳。
 * 對齊 like 的 CtaFooter：左文案右圖例，底部四列連結。
 */
const Section = styled.section`
  position: relative;
  overflow: hidden;
  padding-block: ${Rhythm.quiet};
  background: ${Ink.paper};
  text-align: center;
`

const Grid12 = styled.div`
  ${gridContainer};
`

const Inner = styled.div`
  grid-column: 1 / -1;
  ${mq.mdUp} {
    grid-column: 2 / 12;
  }
`

const Panel = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1.5rem, 4vw, 2.5rem);
  align-items: center;
  text-align: left;
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.xxl}px;
  background: ${Ink.paperAlt};
  color: ${Ink.black};
  padding: clamp(1.5rem, 4vw, 2.75rem);

  ${mq.mdUp} {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
`

const PanelCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.brandSoft};
  border: 1px solid ${Ink.brandBorder};
  color: ${Ink.brand};
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1.35rem;
  width: fit-content;

  svg {
    width: 14px;
    height: 14px;
  }
`

const Title = styled.h2`
  font-family: ${Font.display};
  font-size: ${Display.giant};
  font-weight: 800;
  line-height: 1.05;
  ${Type.tighter}
  color: ${Ink.black};
  margin: 0 0 1rem;
  max-width: 16ch;
`

const Sub = styled.p`
  font-size: 1rem;
  line-height: 1.65;
  color: ${Ink.graphite};
  max-width: 46ch;
  margin: 0 0 1.75rem;
`

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const Cta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 1rem 2.1rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.brand};
  color: ${Ink.paper};
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: ${Elevation.brand};
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${Ink.brandDeep};
    transform: translateY(-3px);
  }
`

const GhostCta = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 1rem 2.1rem;
  border-radius: ${Radius.full}px;
  background: ${Ink.paper};
  border: 1px solid ${Ink.ruleStrong};
  color: ${Ink.black};
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.3s ease, background 0.3s ease;

  &:hover {
    border-color: ${Ink.black};
  }
`

const Promises = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: ${Ink.graphite};

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${Ink.up};
  }
`

export default function Closing() {
  return (
    <Section id="start">
      <Grid12>
        <Inner>
          <Reveal>
            <Panel>
              <PanelCopy>
                <Badge>
                  <IconSparkles /> No camera. No experience. No excuses.
                </Badge>
                <Title>
                  <MaskLine delay={80}>Your Content</MaskLine>
                  <MaskLine delay={160}>Deserves a Business</MaskLine>
                </Title>
                <Sub>
                  Join 2,400+ creators turning short-form attention into predictable monthly
                  revenue.
                </Sub>
                <CtaRow>
                  <Cta href="#start">
                    Start Building Free <IconArrowRight />
                  </Cta>
                  <GhostCta href="#optimizer">Book a walkthrough</GhostCta>
                </CtaRow>
                <Promises>
                  <span>
                    <IconCheck /> No card required
                  </span>
                  <span>
                    <IconCheck /> Cancel in one click
                  </span>
                </Promises>
              </PanelCopy>

              <FigureBox label="Today's queue" meta="3 clips scheduled">
                <FigureImage
                  src={landingImages.clipAi.src}
                  alt={landingImages.clipAi.alt}
                  loading="lazy"
                />
              </FigureBox>
            </Panel>
          </Reveal>
        </Inner>
      </Grid12>
    </Section>
  )
}
