// TypeScript strict mode enabled
import { useEffect, useState } from 'react'
import { useCart } from '../../../store/CartContext'
import { useCurrency } from '../../../store/CurrencyContext'
import { useNavigate } from 'react-router-dom'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import styled, { css } from 'styled-components'
import { Color, Radius, Shadow, Spacing } from '../../../theme/tokens'
import {
  OPEN_CART_DROPDOWN_EVENT,
  type OpenCartDropdownDetail,
} from '../../../utils/cartEvents'
import { formatCartSpecValues } from '../../../utils/quickAdd'

const CartDropdown = styled.div<{ $forceOpen?: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  width: min(92vw, 340px);
  background: ${Color.bg.card};
  box-shadow: ${Shadow.dropdown};
  border-radius: ${Radius.md}px;
  margin-top: ${Spacing.sm}px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: opacity 0.25s ease, visibility 0.25s ease, transform 0.25s ease;
  z-index: ${zIndex.dropdownContent};
  pointer-events: none;

  ${({ $forceOpen }) =>
    $forceOpen &&
    css`
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    `}
`

const CartItems = styled.div`
  max-height: min(40vh, 320px);
  overflow-y: auto;
  padding: 12px 14px;
`

const CartItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`

const ItemThumb = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${Radius.sm}px;
  background-color: ${Color.border.light};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const ItemInfo = styled.div`
  flex-grow: 1;
  min-width: 0;
`

const ItemName = styled.div`
  font-size: 0.88rem;
  font-weight: 600;
  color: ${Color.primaryHover};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ItemSpecs = styled.div`
  font-size: 0.72rem;
  color: ${Color.text.muted};
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ItemPrice = styled.div`
  font-size: 0.82rem;
  color: ${Color.text.secondary};
`

const ItemRemove = styled.button`
  border: none;
  background: transparent;
  color: ${Color.text.muted};
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0 2px;
  flex-shrink: 0;

  &:hover {
    color: ${Color.status.error};
  }
`

const CartFooter = styled.div`
  padding: 12px 14px 14px;
  border-top: 1px solid ${Color.border.light};
`

const Subtotal = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 12px;
`

const CartButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const ViewCartBtn = styled.button`
  padding: 10px 8px;
  border: 1px solid ${Color.primaryHover};
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;

  &:hover {
    background: ${Color.bg.sunken};
  }
`

const CheckoutBtn = styled.button`
  padding: 10px 8px;
  border: none;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;

  &:hover {
    opacity: 0.92;
  }
`

export default function CartDropdownComponent() {
  const navigate = useNavigate()
  const { items, removeItem, total } = useCart()
  const { format } = useCurrency()
  const { t } = useTranslation()
  const [forceOpen, setForceOpen] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    let lastDuration = 3500

    const scheduleClose = (ms: number) => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setForceOpen(false), ms)
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent<OpenCartDropdownDetail>
      lastDuration = ce.detail?.durationMs ?? 3500
      setForceOpen(true)
      scheduleClose(lastDuration)
    }

    const onEnter = () => {
      if (timer) window.clearTimeout(timer)
    }
    const onLeave = () => {
      if (timer !== undefined) {
        scheduleClose(1200)
      }
    }

    window.addEventListener(OPEN_CART_DROPDOWN_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(OPEN_CART_DROPDOWN_EVENT, handler as EventListener)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  // Pause auto-close while pointer is over the panel
  const handlePanelEnter = () => {
    setForceOpen(true)
  }

  const handleViewCart = () => navigate('/cart')
  const handleCheckout = () => navigate('/checkout')

  return (
    <CartDropdown
      className="cart-dropdown"
      $forceOpen={forceOpen}
      onMouseEnter={handlePanelEnter}
      onMouseLeave={() => {
        window.setTimeout(() => setForceOpen(false), 400)
      }}
    >
      <CartItems>
        {items.length === 0 ? (
          <div style={{ padding: '2vh', textAlign: 'center', color: Color.text.muted }}>
            {t('store.cartDropdown.empty')}
          </div>
        ) : (
          items.map((item) => {
            const specs = formatCartSpecValues(item.spec_values)
            return (
              <CartItem key={item.id}>
                <ItemThumb>
                  {item.image ? <img src={item.image} alt={item.spu_name} /> : null}
                </ItemThumb>
                <ItemInfo>
                  <ItemName title={item.spu_name}>{item.spu_name}</ItemName>
                  {specs ? <ItemSpecs title={specs}>{specs}</ItemSpecs> : null}
                  <ItemPrice>
                    {item.quantity} × {format(Number(item.price))}
                  </ItemPrice>
                </ItemInfo>
                <ItemRemove
                  type="button"
                  aria-label="remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    void removeItem(item.id)
                  }}
                >
                  ×
                </ItemRemove>
              </CartItem>
            )
          })
        )}
      </CartItems>
      {items.length > 0 && (
        <CartFooter>
          <Subtotal>
            <span>{t('store.cartDropdown.subtotal')}</span>
            <span>{format(total)}</span>
          </Subtotal>
          <CartButtons>
            <ViewCartBtn type="button" onClick={handleViewCart}>
              {t('store.cartDropdown.viewCart')}
            </ViewCartBtn>
            <CheckoutBtn type="button" onClick={handleCheckout}>
              {t('store.cartDropdown.checkout')}
            </CheckoutBtn>
          </CartButtons>
        </CartFooter>
      )}
    </CartDropdown>
  )
}
