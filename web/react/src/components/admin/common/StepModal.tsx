/**
 * StepModal（步骤条弹窗）
 * ─────────────────────
 * - 顶部：标题 + 关闭 X + 步骤条（圆点连线：完成=蓝实心+✓、当前=蓝描边、未到=灰点）+ 计数 "n/N"
 * - 中部：仅渲染当前步骤，内容区独立滚动（overflow-y:auto），弹窗高度不变（≤85vh）
 * - 底部：按钮随步骤动态 —— 第 1 步仅「下一步」；中间「上一步/下一步」；最后「上一步/提交」
 * - 每一步内容由调用方控制校验；离开步骤保留已填值。
 */
import { type ReactNode } from 'react'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize, FontWeight, Transition } from '../../../theme/tokens'
import { ZIndex } from '../../../theme/zIndex'
import { useTranslation } from '@/i18n'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${ZIndex.modal};
`

const Dialog = styled.div<{ $width: string }>`
  width: 100%;
  max-width: ${({ $width }) => $width};
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.modal};
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: ${Spacing.lg}px ${Spacing.xl}px;
  border-bottom: 1px solid ${Color.border.light};
`

const Title = styled.h2`
  margin: 0;
  font-size: ${FontSize.lg}px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
`

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 18px;
  line-height: 1;
  color: ${Color.text.muted};
  cursor: pointer;
  border-radius: ${Radius.xs}px;
  transition: all ${Transition.fast};

  &:hover { background: ${Color.primaryLight}; color: ${Color.primaryHover}; }
`

/* 步骤条：圆点连线 */
const StepBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: ${Spacing.lg}px ${Spacing.xl}px 0;
  flex-shrink: 0;
`

const StepNode = styled.div<{ $state: 'done' | 'current' | 'todo' }>`
  display: flex;
  align-items: center;
  font-size: ${FontSize.sm}px;
  color: ${({ $state }) => ($state === 'done' ? '#047857' : $state === 'current' ? Color.primary : Color.text.muted)};
  font-weight: ${({ $state }) => ($state === 'current' ? 600 : 400)};
  white-space: nowrap;

  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    margin-right: 6px;
    background: ${({ $state }) =>
      $state === 'done' ? Color.status.success : $state === 'current' ? Color.primary : Color.border.medium};
    color: #fff;
    box-shadow: ${({ $state }) => ($state === 'current' ? '0 0 0 3px rgba(26, 86, 219, 0.2)' : 'none')};
  }

  .line {
    width: 32px;
    height: 2px;
    background: ${({ $state }) => ($state === 'done' ? Color.status.success : Color.border.light)};
    margin: 0 10px;
  }
`

const Count = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  margin-left: ${Spacing.md}px;
  flex-shrink: 0;
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${Spacing.xl}px;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${Spacing.sm}px;
  flex-shrink: 0;
  padding: ${Spacing.lg}px ${Spacing.xl}px;
  border-top: 1px solid ${Color.border.light};
`

const Btn = styled.button<{ $kind?: 'primary' | 'default' | 'danger' | 'success' }>`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.medium};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  transition: all ${Transition.fast};

  ${({ $kind }) =>
    $kind === 'primary'
      ? `background: ${Color.primary}; color: #fff; border: 1px solid ${Color.primary};
         &:hover { background: ${Color.primaryHover}; }`
      : $kind === 'danger'
      ? `background: ${Color.status.error}; color: #fff; border: 1px solid ${Color.status.error};
         &:hover { background: #c0392b; }`
      : $kind === 'success'
      ? `background: ${Color.status.success}; color: #fff; border: 1px solid ${Color.status.success};
         &:hover { background: #047857; }`
      : `background: ${Color.bg.card}; color: ${Color.text.secondary}; border: 1px solid ${Color.border.medium};
         &:hover { border-color: ${Color.primary}; color: ${Color.primary}; }`}

  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

export interface StepModalProps {
  open: boolean
  title: string
  steps: { title: string }[]
  current: number
  width?: string
  /** 第 1 步无上一步；末步由 onFinish 接管（finishLabel） */
  onPrev?: () => void
  onNext?: () => void
  onFinish?: () => void
  nextLabel?: string
  finishLabel?: string
  finishLoading?: boolean
  finishKind?: 'primary' | 'danger' | 'success'
  onClose: () => void
  children: ReactNode
}

export default function StepModal({
  open,
  title,
  steps,
  current,
  width = '720px',
  onPrev,
  onNext,
  onFinish,
  nextLabel,
  finishLabel,
  finishLoading = false,
  finishKind = 'primary',
  onClose,
  children,
}: StepModalProps) {
  const { t } = useTranslation()
  if (!open) return null
  const total = steps.length
  const isFirst = current === 0
  const isLast = current === total - 1

  return (
    <Overlay onClick={onClose}>
      <Dialog $width={width} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <Header>
          <Title>{title}</Title>
          <CloseBtn onClick={onClose} aria-label={t('common.close')}>&times;</CloseBtn>
        </Header>

        <StepBar>
          {steps.map((s, i) => {
            const state: 'done' | 'current' | 'todo' = i < current ? 'done' : i === current ? 'current' : 'todo'
            return (
              <StepNode key={s.title} $state={state}>
                <span className="dot">{i < current ? '✓' : i + 1}</span>
                {s.title}
                {i < total - 1 && <span className="line" />}
              </StepNode>
            )
          })}
          <Count>{current + 1}/{total}</Count>
        </StepBar>

        <Body>{children}</Body>

        <Footer>
          {!isFirst && <Btn onClick={onPrev}>{t('common.previous')}</Btn>}
          {!isLast ? (
            <Btn $kind="primary" onClick={onNext}>{nextLabel ?? t('common.next')}</Btn>
          ) : (
            <Btn $kind={finishKind} onClick={onFinish} disabled={finishLoading}>
              {finishLoading ? t('common.processing') : finishLabel ?? t('common.submit')}
            </Btn>
          )}
        </Footer>
      </Dialog>
    </Overlay>
  )
}

/** 步骤条（可独立复用于页面级步骤流，如商品审核页） */
export { StepBar, StepNode }
