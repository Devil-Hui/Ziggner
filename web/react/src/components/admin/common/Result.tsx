/**
 * Result（结果页：403 / 404 / 500 / 成功 / 错误，用于页面级兜底）
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Color, FontSize, FontWeight, Radius, Spacing, Transition } from '../../../theme/tokens'
import { useTranslation } from '@/i18n'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  padding: ${Spacing.section}px;
`

const IconBox = styled.div<{ $tone: string }>`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: ${({ $tone }) => $tone};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: ${Spacing.lg}px;
`

const Title = styled.h2`
  margin: 0 0 ${Spacing.sm}px 0;
  font-size: ${FontSize.xl}px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
`

const SubTitle = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.text.muted};
  margin-bottom: ${Spacing.xl}px;
`

const Extra = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
`

const BackBtn = styled.button`
  padding: 8px 20px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${Color.primary};
  border-radius: ${Radius.sm}px;
  background: ${Color.primary};
  color: #fff;
  cursor: pointer;
  transition: all ${Transition.fast};

  &:hover { background: ${Color.primaryHover}; }
`

export type ResultStatus = '403' | '404' | '500' | 'success' | 'error'

const MAP: Record<ResultStatus, { icon: string; tone: string }> = {
  '403': { icon: '🔒', tone: '#fffbeb' },
  '404': { icon: '🔍', tone: '#eff6ff' },
  '500': { icon: '⚠️', tone: '#fef2f2' },
  success: { icon: '✅', tone: '#ecfdf5' },
  error: { icon: '❌', tone: '#fef2f2' },
}

export interface ResultProps {
  status?: ResultStatus
  title?: string
  subTitle?: string
  extra?: ReactNode
  onBack?: () => void
  className?: string
}

export default function Result({
  status = '404',
  title,
  subTitle,
  extra,
  onBack,
  className,
}: ResultProps) {
  const { t } = useTranslation()
  const m = MAP[status]
  return (
    <Wrap className={className}>
      <IconBox $tone={m.tone}>{m.icon}</IconBox>
      <Title>{title ?? (status === '403' ? t('admin.result.forbidden') : status === '500' ? t('admin.result.serverError') : t('admin.result.notFound'))}</Title>
      {subTitle && <SubTitle>{subTitle}</SubTitle>}
      <Extra>
        {extra}
        {onBack && <BackBtn onClick={onBack}>{t('common.back')}</BackBtn>}
      </Extra>
    </Wrap>
  )
}
