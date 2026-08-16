import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, FontSize, Radius, Shadow, Spacing } from '../../theme/tokens'
import { useTranslation } from '../../i18n'
import { useUser } from '../../store/UserContext'
import { useCurrency } from '../../store/CurrencyContext'
import { publicAPI } from '../../api/public'

const Container = styled.div`
  max-width: 880px;
  margin: 0 auto;
  padding: 40px 24px 64px;
`

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${Color.text.heading};
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  color: ${Color.text.secondary};
  margin-bottom: 24px;
`

const SearchRow = styled.form`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  @media (max-width: 560px) { flex-direction: column; }
`

const Input = styled.input`
  flex: 1;
  height: 46px;
  padding: 0 16px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.md}px;
  outline: none;
  &:focus { border-color: ${Color.primary}; box-shadow: 0 0 0 2px ${Color.primaryLight}; }
`

const Button = styled.button`
  height: 46px;
  padding: 0 28px;
  background: ${Color.primary};
  color: #fff;
  border: none;
  border-radius: ${Radius.md}px;
  font-size: ${FontSize.md}px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const Card = styled.div`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.card};
  padding: 24px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 24px;
  margin-bottom: 24px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`

const Field = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.text.body};
  span { color: ${Color.text.secondary}; margin-right: 8px; }
`

const Steps = styled.div`
  display: flex;
  align-items: center;
  margin: 8px 0 24px;
  flex-wrap: wrap;
  gap: 8px;
`

const Step = styled.div<{ $done: boolean; $active: boolean }>`
  padding: 8px 16px;
  border-radius: 999px;
  font-size: ${FontSize.sm}px;
  border: 1px solid ${({ $done, $active }) => ($active ? Color.primary : $done ? Color.status.success : Color.border.medium)};
  color: ${({ $done, $active }) => ($active ? '#fff' : $done ? Color.status.success : Color.text.secondary)};
  background: ${({ $active }) => ($active ? Color.primary : 'transparent')};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
`

const HistoryItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed ${Color.border.light};
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  span:first-child { color: ${Color.text.secondary}; min-width: 140px; }
`

const ErrorBox = styled.div`
  background: #fff4f4;
  border: 1px solid ${Color.status.error};
  color: ${Color.status.error};
  border-radius: ${Radius.md}px;
  padding: 14px 16px;
  margin-bottom: 20px;
`

const LoginHint = styled.div`
  background: ${Color.bg.page};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  padding: 16px;
  color: ${Color.text.body};
  a { color: ${Color.primary}; cursor: pointer; font-weight: 600; }
`

const STATUS_ORDER = ['pending', 'paid', 'shipped', 'delivered']

export default function TrackOrder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const { format } = useCurrency()
  const [orderNo, setOrderNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    if (!orderNo.trim()) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const data = await publicAPI.getOrderDetail(orderNo.trim())
      setOrder(data as Record<string, unknown>)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || ''
      if (/404|not found|no order/i.test(msg)) {
        setError(t('store.pages.track.notFound', { orderNo: orderNo.trim() }))
      } else {
        setError(msg || t('store.pages.track.notFound', { orderNo: orderNo.trim() }))
      }
    } finally {
      setLoading(false)
    }
  }

  const status = (order?.order_status || order?.status || '') as string
  const activeIdx = STATUS_ORDER.indexOf(status)

  return (
    <Container>
      <Title>{t('store.pages.track.title')}</Title>
      <Subtitle>{t('store.pages.track.subtitle')}</Subtitle>

      {!isLoggedIn && (
        <LoginHint style={{ marginBottom: 20 }}>
          {t('store.pages.track.needLogin')}{' '}
          <a onClick={() => navigate('/auth?tab=login')}>{t('store.pages.track.signIn')}</a>
        </LoginHint>
      )}

      <SearchRow onSubmit={handleTrack}>
        <Input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder={t('store.pages.track.orderNoPlaceholder')}
        />
        <Button type="submit" disabled={loading}>
          {loading ? t('store.pages.track.tracking') : t('store.pages.track.trackButton')}
        </Button>
      </SearchRow>

      {error && <ErrorBox>{error}</ErrorBox>}

      {order && (
        <Card>
          <Grid>
            <Field><span>{t('store.pages.track.orderNo')}</span>{String(order.order_no || orderNo)}</Field>
            <Field><span>{t('store.pages.track.status')}</span>{status}</Field>
            <Field><span>{t('store.pages.track.placedAt')}</span>{String(order.created_at || '-')}</Field>
            <Field><span>{t('store.pages.track.total')}</span>{format(Number(order.actual_amount ?? order.total_amount ?? 0))}</Field>
            <Field><span>{t('store.pages.track.carrier')}</span>{String(order.carrier || '-')}</Field>
            <Field><span>{t('store.pages.track.trackingNo')}</span>{String(order.tracking_number || '-')}</Field>
            <Field><span>{t('store.pages.track.estimatedDelivery')}</span>{String(order.estimated_delivery || '-')}</Field>
            <Field><span>{t('store.pages.track.items')}</span>{(Array.isArray(order.items) ? order.items.length : 0)}</Field>
          </Grid>

          <Steps>
            {STATUS_ORDER.map((s, i) => (
              <Step key={s} $done={activeIdx >= 0 && i <= activeIdx} $active={i === activeIdx}>
                {t(`store.pages.track.step${s.charAt(0).toUpperCase() + s.slice(1)}` as never)}
              </Step>
            ))}
          </Steps>

          <h3 style={{ marginBottom: 8, color: Color.text.heading }}>{t('store.pages.track.history')}</h3>
          {Array.isArray(order.tracking_history) && (order.tracking_history as unknown[]).length > 0 ? (
            (order.tracking_history as Record<string, unknown>[]).map((h, i) => (
              <HistoryItem key={i}>
                <span>{String(h.time || h.created_at || '-')}</span>
                <span>{String(h.description || h.status || '')}</span>
              </HistoryItem>
            ))
          ) : (
            <HistoryItem><span>-</span><span>{status || '-'}</span></HistoryItem>
          )}
        </Card>
      )}
    </Container>
  )
}
