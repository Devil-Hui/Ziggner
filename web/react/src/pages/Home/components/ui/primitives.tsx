import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { Elevation, Font, Ink, Radius, Type, mq } from '../../editorial'

/**
 * 落地页设计原语 —— like/src/components/ui.tsx 的 styled-components 等价实现。
 * ────────────────────────────────────────────────────────────────
 * like 用 Tailwind 4 + @theme CSS 变量；本项目用 styled-components + TS 常量，
 * 因此这里是「翻译」而非复制：所有取值统一走 ../../editorial 令牌，
 * 组件内禁止出现任何十六进制字面量。
 *
 * 设计要义：
 *   1. 层级由 1px 细线 + 纸灰底承担，不用重投影
 *   2. 数字一律 tnum 等宽，标题一律负字距
 *   3. 图片与其说明必须同框（FigureBox），说明是「图注」而非游离文字
 */

/* ── 容器 ───────────────────────────────────────────────── */
export const Container = styled.div`
  width: 100%;
  max-width: 1180px;
  margin-inline: auto;
  padding-inline: clamp(1.25rem, 4vw, 2rem);
`

/* ── 小标签：方块 + 大写字距 ────────────────────────────── */
export const Eyebrow = styled.div<{ $tone?: 'ink' | 'brand' }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: ${p => (p.$tone === 'brand' ? Ink.brand : Ink.black)};
  }

  > span {
    ${Type.wideCaps}
    font-family: ${Font.body};
    font-size: 11px;
    font-weight: 700;
    color: ${Ink.faint};
  }
`

/* ── 章节头：eyebrow + 大标题 + 引言，底部 1px 细线 ──────── */
const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border-bottom: 1px solid ${Ink.rule};
  padding-bottom: 1.5rem;

  ${mq.mdUp} {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`

const HeadMain = styled.div`
  max-width: 620px;
`

const HeadTitle = styled.h2`
  font-family: ${Font.display};
  font-size: clamp(1.6rem, 3.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.05;
  ${Type.tighter}
  color: ${Ink.black};
  margin: 0.75rem 0 0;
`

const HeadLead = styled.p`
  margin: 0.75rem 0 0;
  max-width: 42ch;
  font-size: 0.85rem;
  line-height: 1.6;
  color: ${Ink.graphite};
`

const HeadAside = styled.div`
  flex-shrink: 0;
`

export function SectionHead({
  eyebrow,
  title,
  lead,
  aside,
  tone = 'ink',
}: {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  aside?: ReactNode
  tone?: 'ink' | 'brand'
}) {
  return (
    <Head>
      <HeadMain>
        <Eyebrow $tone={tone}>
          <span>{eyebrow}</span>
        </Eyebrow>
        <HeadTitle>{title}</HeadTitle>
        {lead ? <HeadLead>{lead}</HeadLead> : null}
      </HeadMain>
      {aside ? <HeadAside>{aside}</HeadAside> : null}
    </Head>
  )
}

/* ── 按钮：墨黑主 / 品牌红 / 描边次 ────────────────────── */
const buttonVariants = {
  primary: css`
    background: ${Ink.black};
    color: ${Ink.paper};
    box-shadow: ${Elevation.ink};
    &:hover {
      background: #000;
    }
  `,
  brand: css`
    background: ${Ink.brand};
    color: ${Ink.paper};
    box-shadow: ${Elevation.brand};
    &:hover {
      background: ${Ink.brandDeep};
    }
  `,
  ghost: css`
    background: ${Ink.paper};
    color: ${Ink.black};
    border: 1px solid ${Ink.ruleStrong};
    &:hover {
      border-color: ${Ink.black};
    }
  `,
} as const

export const Button = styled.a<{ $variant?: keyof typeof buttonVariants }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: ${Radius.full}px;
  padding: 0.8125rem 1.5rem;
  font-family: ${Font.body};
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease,
    box-shadow 0.15s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    transform: translateY(-1px);
  }

  ${p => buttonVariants[p.$variant ?? 'primary']}
`

/* ── 图文同框：图 + 图注永远包在同一个描边容器内 ────────── */
const Figure = styled.figure`
  overflow: hidden;
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.xl}px;
  background: ${Ink.paper};
  margin: 0;
`

const Caption = styled.figcaption`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid ${Ink.rule};
  background: ${Ink.paper2};
  padding: 0.875rem clamp(1.25rem, 3vw, 1.75rem);
`

const CaptionLabel = styled.span`
  ${Type.wideCaps}
  font-family: ${Font.body};
  font-size: 10.5px;
  font-weight: 700;
  color: ${Ink.faint};
`

const CaptionMeta = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${Ink.faint};
`

const FigureBody = styled.div<{ $flush?: boolean }>`
  padding: ${p => (p.$flush ? '0' : 'clamp(1.25rem, 3vw, 1.75rem)')};
`

export function FigureBox({
  label,
  meta,
  children,
  flush,
  className,
}: {
  /** 图注标签，如「Figure 01 — Same clip, two outputs」 */
  label: string
  /** 图注右侧的元信息 */
  meta?: ReactNode
  children: ReactNode
  /** 去掉内边距（图片需要铺满容器时使用） */
  flush?: boolean
  className?: string
}) {
  return (
    <Figure className={className}>
      <Caption>
        <CaptionLabel>{label}</CaptionLabel>
        {meta ? <CaptionMeta>{meta}</CaptionMeta> : null}
      </Caption>
      <FigureBody $flush={flush}>{children}</FigureBody>
    </Figure>
  )
}

/** FigureBox 内的实拍图：固定 3:4 竖版比例，任何视口下不变形 */
export const FigureImage = styled.img<{ $dim?: boolean; $ratio?: string }>`
  display: block;
  width: 100%;
  aspect-ratio: ${p => p.$ratio ?? '3 / 4'};
  object-fit: cover;
  border-radius: ${Radius.md}px;
  background: ${Ink.sunken};
  ${p =>
    p.$dim &&
    css`
      filter: grayscale(0.3);
      opacity: 0.9;
    `}
`

/* ── 图标徽章 ───────────────────────────────────────────── */
const badgeTones = {
  ink: css`
    background: ${Ink.sunken};
    color: ${Ink.black};
    border-color: ${Ink.rule};
  `,
  brand: css`
    background: ${Ink.brandSoft};
    color: ${Ink.brand};
    border-color: ${Ink.brandBorder};
  `,
  pos: css`
    background: ${Ink.upSoft};
    color: ${Ink.up};
    border-color: ${Ink.upBorder};
  `,
  blue: css`
    background: ${Ink.blueSoft};
    color: ${Ink.blue};
    border-color: ${Ink.blueBorder};
  `,
} as const

export type Tone = keyof typeof badgeTones

export const IconBadge = styled.span<{ $tone?: Tone; $size?: number }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${p => p.$size ?? 40}px;
  height: ${p => p.$size ?? 40}px;
  border-radius: ${Radius.md}px;
  border: 1px solid ${Ink.rule};

  svg {
    width: ${p => Math.round((p.$size ?? 40) * 0.5)}px;
    height: ${p => Math.round((p.$size ?? 40) * 0.5)}px;
  }

  ${p => badgeTones[p.$tone ?? 'ink']}
`

/* ── 胶囊徽章 ───────────────────────────────────────────── */
export const Pill = styled.span<{ $tone?: Tone }>`
  ${Type.tnum}
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: ${Radius.full}px;
  border: 1px solid ${Ink.rule};
  padding: 0.25rem 0.625rem;
  font-family: ${Font.body};
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.5;

  svg {
    width: 13px;
    height: 13px;
  }

  ${p => badgeTones[p.$tone ?? 'ink']}
`

/* ── 数据卡 ─────────────────────────────────────────────── */
export const StatCard = styled.div`
  border: 1px solid ${Ink.rule};
  border-radius: ${Radius.lg}px;
  background: ${Ink.paper};
  padding: clamp(1.25rem, 3vw, 1.5rem);
`

export const StatValue = styled.div`
  ${Type.tnum}
  ${Type.tighter}
  font-family: ${Font.display};
  font-size: clamp(1.875rem, 3vw, 2.25rem);
  line-height: 1;
  font-weight: 800;
  color: ${Ink.black};
`

export const StatLabel = styled.div`
  margin-top: 0.75rem;
  font-size: 12.5px;
  font-weight: 500;
  color: ${Ink.graphite};
`

export const StatNote = styled.div`
  margin-top: 0.25rem;
  font-size: 11.5px;
  color: ${Ink.faint};
`
