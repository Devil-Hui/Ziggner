import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { useCart } from '../../store/CartContext'
import { useTranslation } from '../../i18n'
import { Color, FontSize, Radius, Shadow } from '../../theme/tokens'
import { zIndex } from '../../styles/zIndex'

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const ToastWrap = styled.div`
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: min(360px, calc(100vw - 24px));
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.dropdown || '0 10px 30px rgba(0,0,0,0.18)'};
  border: 1px solid ${Color.border.light};
  z-index: ${zIndex.modal + 1};
  animation: ${slideIn} 0.22s ease;
  overflow: hidden;

  @media (max-width: 768px) {
    right: 12px;
    left: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    width: auto;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid ${Color.border.light};
`

const Title = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 700;
  color: #111;
`

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #888;
  line-height: 1;
`

const Body = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 14px;
`

const Thumb = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 6px;
  background: ${Color.border.light};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const Meta = styled.div`
  min-width: 0;
  flex: 1;
`

const Name = styled.div`
  font-size: 0.85rem;
  color: #222;
  font-weight: 600;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Specs = styled.div`
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 4px;
`

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #444;
`

const Footer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 14px 14px;
`

const Btn = styled.button<{ $primary?: boolean }>`
  height: 36px;
  border-radius: 6px;
  border: 1px solid ${({ $primary }) => ($primary ? '#111' : Color.border.medium)};
  background: ${({ $primary }) => ($primary ? '#111' : '#fff')};
  color: ${({ $primary }) => ($primary ? '#fff' : '#222')};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
`

const CartSummary = styled.div`
  padding: 0 14px 10px;
  font-size: 0.75rem;
  color: #666;
`

export type MiniCartToastPayload = {
  name: string
  image?: string
  price: number
  quantity: number
  specsText?: string
}

const EVENT_NAME = 'ziggner:mini-cart-toast'
const AUTO_HIDE_MS = 4500

export function showMiniCartToast(payload: MiniCartToastPayload) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }))
}

export default function MiniCartToast() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { count, total } = useCart()
  const [visible, setVisible] = useState(false)
  const [payload, setPayload] = useState<MiniCartToastPayload | null>(null)
  const hideTimer = useRef<number | null>(null)
  const paused = useRef(false)

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clearTimer()
    setVisible(false)
    setPayload(null)
    paused.current = false
  }, [clearTimer])

  const scheduleHide = useCallback(() => {
    clearTimer()
    if (paused.current) return
    hideTimer.current = window.setTimeout(() => hide(), AUTO_HIDE_MS)
  }, [clearTimer, hide])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<MiniCartToastPayload>
      if (!ce.detail) return
      setPayload(ce.detail)
      setVisible(true)
      paused.current = false
    }
    window.addEventListener(EVENT_NAME, handler as EventListener)
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener)
  }, [])

  useEffect(() => {
    if (!visible || !payload) return
    scheduleHide()
    return () => clearTimer()
  }, [visible, payload, scheduleHide, clearTimer])

  if (!visible || !payload) return null

  return (
    <ToastWrap
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        paused.current = true
        clearTimer()
      }}
      onMouseLeave={() => {
        paused.current = false
        scheduleHide()
      }}
    >
      <Header>
        <Title>{t('store.miniCart.addedTitle')}</Title>
        <CloseBtn type="button" onClick={hide} aria-label={t('store.productDetailModal.close')}>
          ×
        </CloseBtn>
      </Header>
      <Body>
        <Thumb>
          {payload.image ? <img src={payload.image} alt={payload.name} /> : null}
        </Thumb>
        <Meta>
          <Name title={payload.name}>{payload.name}</Name>
          {payload.specsText ? <Specs>{payload.specsText}</Specs> : null}
          <PriceRow>
            <span>× {payload.quantity}</span>
            <strong>${payload.price.toFixed(2)}</strong>
          </PriceRow>
        </Meta>
      </Body>
      <CartSummary>
        {t('store.miniCart.bagSummary')
          .replace('{count}', String(count))
          .replace('{total}', total.toFixed(2))}
      </CartSummary>
      <Footer>
        <Btn type="button" onClick={() => { hide(); navigate('/cart') }}>
          {t('store.miniCart.viewCart')}
        </Btn>
        <Btn
          type="button"
          $primary
          onClick={() => { hide(); navigate('/checkout') }}
        >
          {t('store.miniCart.checkout')}
        </Btn>
      </Footer>
    </ToastWrap>
  )
}
