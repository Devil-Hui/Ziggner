import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { paymentAPI, type MockPaymentScenario } from '../../api/payment'
import Button from '../../components/common/Button/Button'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useTranslation } from '../../i18n'
import { Color, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../theme/tokens'

const Page = styled.main`
  min-height: calc(100vh - 80px);
  display: grid;
  place-items: center;
  padding: ${Spacing.page}px ${Spacing.lg}px;
  background: ${Color.bg.page};
`

const Panel = styled.section`
  width: min(100%, 720px);
  padding: ${Spacing.xxxl}px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};

  @media (max-width: 640px) {
    padding: ${Spacing.xl}px;
  }
`

const Eyebrow = styled.p`
  margin: 0 0 ${Spacing.sm}px;
  color: ${Color.primary};
  font-size: ${FontSize.xs}px;
  font-weight: ${FontWeight.semibold};
  letter-spacing: 0;
`

const Title = styled.h1`
  margin: 0;
  color: ${Color.text.heading};
  font-size: ${FontSize.heading}px;
  line-height: 1.25;
  letter-spacing: 0;
`

const Description = styled.p`
  margin: ${Spacing.md}px 0 ${Spacing.xxl}px;
  color: ${Color.text.secondary};
  font-size: ${FontSize.base}px;
  line-height: 1.6;
`

const Reference = styled.dl`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: ${Spacing.sm}px ${Spacing.lg}px;
  margin: 0 0 ${Spacing.xxl}px;
  padding: ${Spacing.lg}px 0;
  border-block: 1px solid ${Color.border.light};

  dt { color: ${Color.text.muted}; }
  dd {
    margin: 0;
    color: ${Color.text.heading};
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    overflow-wrap: anywhere;
  }
`

const ScenarioGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${Spacing.md}px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ScenarioButton = styled.button<{ $tone: 'success' | 'danger' | 'neutral' | 'warning' }>`
  min-height: 72px;
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: ${Color.text.heading};
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: transform 150ms ease, border-color 150ms ease, background-color 150ms ease;

  strong, span { display: block; }
  strong { margin-bottom: ${Spacing.xs}px; font-weight: ${FontWeight.semibold}; }
  span { color: ${Color.text.secondary}; font-size: ${FontSize.sm}px; line-height: 1.45; }

  &:hover:not(:disabled) {
    border-color: ${({ $tone }) => $tone === 'success' ? Color.status.success : $tone === 'danger' ? Color.status.error : $tone === 'warning' ? Color.status.warning : Color.primary};
    background: ${Color.bg.page};
  }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:focus-visible { outline: none; box-shadow: ${Shadow.focus}; }
  &:disabled { cursor: wait; opacity: 0.55; }

  @media (prefers-reduced-motion: reduce) { transition: none; }
`

const Result = styled.p<{ $error?: boolean }>`
  margin: ${Spacing.xl}px 0 0;
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border-radius: ${Radius.sm}px;
  background: ${({ $error }) => $error ? '#fef2f2' : '#f0fdf4'};
  color: ${({ $error }) => $error ? Color.status.error : Color.status.success};
  line-height: 1.5;
`

const Footer = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
  margin-top: ${Spacing.xl}px;
  flex-wrap: wrap;
`

const SCENARIOS: Array<{ value: MockPaymentScenario; tone: 'success' | 'danger' | 'neutral' | 'warning' }> = [
  { value: 'success', tone: 'success' },
  { value: 'failure', tone: 'danger' },
  { value: 'cancel', tone: 'neutral' },
  { value: 'timeout', tone: 'warning' },
]

export default function MockPayment() {
  const { paymentNo = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const orderNo = searchParams.get('order_no') || ''
  const [loading, setLoading] = useState<MockPaymentScenario | null>(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const runScenario = async (scenario: MockPaymentScenario) => {
    setLoading(scenario)
    setResult('')
    setError('')
    try {
      await paymentAPI.completeMock(paymentNo, scenario)
      if (scenario === 'success' && orderNo) {
        navigate(`/payment/return?success=1&order_no=${encodeURIComponent(orderNo)}`)
        return
      }
      setResult(t(`store.payment.simulatorResult.${scenario}`))
    } catch (requestError) {
      setError((requestError as { message?: string }).message || t('store.payment.simulatorError'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <PageLayout>
      <Page>
        <Panel>
          <Eyebrow>{t('store.payment.simulatorEyebrow')}</Eyebrow>
          <Title>{t('store.payment.simulatorTitle')}</Title>
          <Description>{t('store.payment.simulatorDescription')}</Description>
          <Reference>
            <dt>{t('store.payment.simulatorPaymentNo')}</dt><dd>{paymentNo || '-'}</dd>
            <dt>{t('store.payment.orderLabel')}</dt><dd>{orderNo || '-'}</dd>
          </Reference>
          <ScenarioGrid>
            {SCENARIOS.map(({ value, tone }) => (
              <ScenarioButton
                key={value}
                type="button"
                $tone={tone}
                disabled={loading !== null || !paymentNo}
                onClick={() => void runScenario(value)}
              >
                <strong>{t(`store.payment.simulatorScenario.${value}.label`)}</strong>
                <span>{t(`store.payment.simulatorScenario.${value}.description`)}</span>
              </ScenarioButton>
            ))}
          </ScenarioGrid>
          {loading && <Result>{t('store.payment.simulatorProcessing')}</Result>}
          {result && <Result>{result}</Result>}
          {error && <Result $error>{error}</Result>}
          <Footer>
            {orderNo && <Button variant="primary" onClick={() => navigate(`/order/${orderNo}`)}>{t('store.payment.simulatorViewOrder')}</Button>}
            <Button variant="outline" onClick={() => navigate('/')}>{t('store.payment.continueShopping')}</Button>
          </Footer>
        </Panel>
      </Page>
    </PageLayout>
  )
}
