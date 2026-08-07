// 支付返回页面 — 处理 PayPal/Stripe 支付后的重定向回调

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Button from '../../components/common/Button/Button'
import { paymentAPI } from '../../api/payment'
import { Color, Radius, Shadow } from '../../theme/tokens'

const Container = styled.div`
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${Color.bg.page};
  padding: 2rem;
`

const Card = styled.div<{ $success: boolean }>`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  box-shadow: ${Shadow.card};
  padding: 3rem 2.5rem;
  max-width: 480px;
  width: 100%;
  text-align: center;
`

const Icon = styled.div<{ $success: boolean }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${p => p.$success ? '#e8f5e9' : '#fce4e4'};
  color: ${p => p.$success ? '#2e7d32' : '#c62828'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1.5rem;
`

const Title = styled.h2<{ $success: boolean }>`
  font-size: 1.35rem;
  color: ${p => p.$success ? '#2e7d32' : '#c62828'};
  margin-bottom: 0.75rem;
`

const Message = styled.p`
  font-size: 0.95rem;
  color: ${Color.text.secondary};
  margin-bottom: 0.5rem;
  line-height: 1.6;
`

const OrderNo = styled.span`
  font-weight: bold;
  color: ${Color.text.heading};
  font-family: monospace;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: center;
`

export default function PaymentReturn() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'failure'>('loading')
  const [orderNo, setOrderNo] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const polled = useRef(false)

  const success = searchParams.get('success') === '1'
  const orderNoParam = searchParams.get('order_no') || ''

  useEffect(() => {
    if (polled.current) return
    polled.current = true

    if (!orderNoParam) {
      setStatus('failure')
      setErrorMsg('Missing order number.')
      return
    }

    setOrderNo(orderNoParam)

    // 轮询支付状态（最多 10 次，每次间隔 2s）
    let attempts = 0
    const maxAttempts = 10

    const poll = async () => {
      try {
        const result = await paymentAPI.getStatus(orderNoParam)
        if (result.paid) {
          setStatus('success')
          return
        }
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          setStatus('failure')
          setErrorMsg('Payment verification timed out. Please check your orders.')
        }
      } catch {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          setStatus('failure')
          setErrorMsg('Unable to verify payment status. Please check your orders.')
        }
      }
    }

    poll()
  }, [orderNoParam, success])

  return (
    <PageLayout>
      <Container>
        {status === 'loading' && (
          <Card $success={true}>
            <Icon $success={true}>⟳</Icon>
            <Title $success={true}>Verifying Payment...</Title>
            <Message>Please wait while we confirm your payment.</Message>
            <Message><OrderNo>Order: {orderNo}</OrderNo></Message>
          </Card>
        )}

        {status === 'success' && (
          <Card $success={true}>
            <Icon $success={true}>✓</Icon>
            <Title $success={true}>Payment Successful!</Title>
            <Message>Your payment has been processed successfully.</Message>
            <Message><OrderNo>Order: {orderNo}</OrderNo></Message>
            <ButtonGroup>
              <Button variant="primary" onClick={() => navigate('/profile')}>
                View My Orders
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Continue Shopping
              </Button>
            </ButtonGroup>
          </Card>
        )}

        {status === 'failure' && (
          <Card $success={false}>
            <Icon $success={false}>✕</Icon>
            <Title $success={false}>Payment Failed</Title>
            <Message>{errorMsg || 'Your payment could not be completed.'}</Message>
            {orderNo && <Message><OrderNo>Order: {orderNo}</OrderNo></Message>}
            <ButtonGroup>
              <Button variant="primary" onClick={() => navigate('/profile')}>
                View My Orders
              </Button>
              <Button variant="outline" onClick={() => navigate('/cart')}>
                Back to Cart
              </Button>
            </ButtonGroup>
          </Card>
        )}
      </Container>
    </PageLayout>
  )
}