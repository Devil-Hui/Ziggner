import styled from 'styled-components'
import { Ink, Radius } from '../../editorial'
import { IconChart, IconTrend, IconLayers, IconZap, IconPlay, IconHook, IconFilm } from './Icon'

/**
 * 手機螢幕內容模擬 — 純 CSS/SVG 生成，零外部圖片依賴。
 * ⚠️ DEPRECATED：落地页已改用 src/assets/landing 的实拍图 + FigureBox 图文同框，
 * 本组件当前无任何引用，保留仅为兼容；新需求请直接用 FigureBox + FigureImage。
 * 所有颜色已收编到 editorial 令牌，不再出现十六进制字面量。
 */

const Wrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${Ink.near};
  display: flex;
  flex-direction: column;
  padding: 42px 14px 16px;
  gap: 10px;
  color: #fff;
`

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const Hero = styled.div`
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-top: 6px;
`

const Sub = styled.div`
  font-size: 8px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
`

const Card = styled.div`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${Radius.md}px;
  padding: 10px;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
`

const Key = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);

  svg {
    width: 11px;
    height: 11px;
  }
`

const Val = styled.span`
  font-size: 10px;
  font-weight: 700;
`

const Up = styled.span`
  font-size: 7px;
  font-weight: 700;
  color: ${Ink.up};
  margin-left: 4px;
`

const Big = styled.div`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-top: 4px;
`

const ChartBox = styled.div`
  margin-top: 8px;
  height: 44px;

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
`

const Footer = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${Ink.brand};
  border-radius: ${Radius.full}px;
  padding: 8px;
  font-size: 9px;
  font-weight: 700;

  svg {
    width: 12px;
    height: 12px;
  }
`

const CURVE = 'M0,40 L14,34 L28,36 L42,26 L56,28 L70,16 L84,12 L100,4'

/** 影片播放條 */
const Timeline = styled.div<{ $pct: number }>`
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  position: relative;
  margin-top: 10px;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${p => p.$pct}%;
    border-radius: 999px;
    background: ${p => (p.$pct > 50 ? Ink.brand : 'rgba(255,255,255,0.45)')};
  }
`

const Stage = styled.div`
  flex: 1;
  border-radius: ${Radius.md}px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`

const PlayBtn = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 16px;
    height: 16px;
    color: #fff;
  }
`

const Chip = styled.div`
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: ${Radius.full}px;
  background: rgba(10, 10, 20, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  svg {
    width: 9px;
    height: 9px;
  }
`

const ChipHook = styled(Chip)`
  top: 10px;
  left: 10px;
  color: ${Ink.brand};
`

const ChipBroll = styled(Chip)`
  top: 10px;
  right: 10px;
  color: ${Ink.up};
`

const Caption = styled.div`
  position: absolute;
  bottom: 12px;
  left: 10px;
  right: 10px;
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  background: rgba(10, 10, 20, 0.7);
  border-radius: ${Radius.sm}px;
  padding: 5px 8px;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 6px;
`

/** 原始素材畫面 — Optimizer 左側（未優化） */
export function ClipScreen() {
  return (
    <Wrap>
      <Bar>
        <span>Raw clip</span>
        <span>0:08 avg</span>
      </Bar>
      <Stage>
        <PlayBtn>
          <IconPlay />
        </PlayBtn>
      </Stage>
      <Timeline $pct={24} />
      <Meta>
        <span>Retention 24%</span>
        <span>1.2K views</span>
      </Meta>
    </Wrap>
  )
}

/** AI 優化後畫面 — Optimizer 右側（含 hook/字幕/b-roll） */
export function OptimizedScreen() {
  return (
    <Wrap>
      <Bar>
        <span>AI optimized</span>
        <span>0:41 avg</span>
      </Bar>
      <Stage>
        <ChipHook>
          <IconHook /> Hook 0-3s
        </ChipHook>
        <ChipBroll>
          <IconFilm /> B-roll
        </ChipBroll>
        <PlayBtn>
          <IconPlay />
        </PlayBtn>
        <Caption>Stop scrolling — this takes 6 seconds</Caption>
      </Stage>
      <Timeline $pct={71} />
      <Meta>
        <span>Retention 71%</span>
        <span>84K views</span>
      </Meta>
    </Wrap>
  )
}

/** 路徑卡縮略畫面 — Paths 三卡 */
export function PathScreen({ label }: { label: string }) {
  return (
    <Wrap>
      <Bar>
        <span>{label}</span>
        <IconZap />
      </Bar>
      <Stage>
        <PlayBtn>
          <IconPlay />
        </PlayBtn>
      </Stage>
      <Timeline $pct={62} />
    </Wrap>
  )
}

/** 成長數據面板畫面 — Hero 右側手機 */
export function GrowthScreen() {
  return (
    <Wrap>
      <Bar>
        <span>Growth</span>
        <span>28d</span>
      </Bar>
      <div>
        <Hero>12.4K</Hero>
        <Sub>Followers · +312%</Sub>
      </div>
      <ChartBox>
        <svg viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={Ink.brand} stopOpacity="0.35" />
              <stop offset="100%" stopColor={Ink.brand} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${CURVE} L100,44 L0,44 Z`} fill="url(#pg)" />
          <path
            d={CURVE}
            fill="none"
            stroke={Ink.brand}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </ChartBox>
      <Card>
        <Row>
          <Key>
            <IconChart /> Views
          </Key>
          <Val>
            2.1M<Up>+480%</Up>
          </Val>
        </Row>
        <Row>
          <Key>
            <IconTrend /> Retention
          </Key>
          <Val>
            74%<Up>+47</Up>
          </Val>
        </Row>
        <Row>
          <Key>
            <IconLayers /> Revenue
          </Key>
          <Val>
            $18.4K<Up>+190%</Up>
          </Val>
        </Row>
      </Card>
      <Footer>
        <IconZap /> Publish today&rsquo;s clip
      </Footer>
    </Wrap>
  )
}
