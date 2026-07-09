// TypeScript strict mode enabled
import { useCart } from '../../../store/CartContext'
import { useNavigate } from 'react-router-dom'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import styled from 'styled-components'
import { Color, Radius, Shadow, Spacing, FontSize } from '../../../theme/tokens'

const CartDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  width: 32vw;
  max-width: 320px;
  background: ${Color.bg.card};
  box-shadow: ${Shadow.dropdown};
  border-radius: ${Radius.md}px;
  margin-top: ${Spacing.sm}px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.3s ease;
  z-index: ${zIndex.dropdownContent};
`

const CartItems = styled.div`
  max-height: 30vh;
  overflow-y: auto;
  padding: 1.5vh;
`

const CartItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2vw;
  margin-bottom: 1.5vh;
`

const ItemThumb = styled.div`
  width: 70px;
  height: 70px;
  border-radius: ${Radius.sm}px;
  background-color: ${Color.border.light};
`

const ItemInfo = styled.div`
  flex-grow: 1;
`

const ItemName = styled.div`
  font-size: 1rem;
  color: ${Color.primaryHover};
  margin-bottom: 0.4vh;
`

const ItemPrice = styled.div`
  font-size: 0.9rem;
  color: ${Color.text.secondary};
`

const ItemRemove = styled.span`
  color: ${Color.text.muted};
  cursor: pointer;
  font-size: 1.5rem;
`

const CartFooter = styled.div`
  padding: 1.5vh;
  border-top: 1px solid ${Color.border.light};
`

const Subtotal = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 1.5vh;
`

const CartButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1vh;
`

const ViewCartBtn = styled.button`
  padding: 1vh;
  border: 1px solid ${Color.primaryHover};
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: 0.9rem;
`

const CheckoutBtn = styled.button`
  padding: 1vh;
  border: none;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: 0.9rem;
`

export default function CartDropdownComponent() {
  const navigate = useNavigate()
  const { items, removeItem, total } = useCart()
  const { t } = useTranslation()

  const handleViewCart = () => navigate('/cart')
  const handleCheckout = () => navigate('/cart')

  return (
    <CartDropdown className="cart-dropdown">
      <CartItems>
        {items.length === 0 ? (
          <div style={{ padding: '2vh', textAlign: 'center', color: Color.text.muted }}>
            {t('store.cartDropdown.empty')}
          </div>
        ) : (
          items.map(item => (
            <CartItem key={item.id}>
              <ItemThumb />
              <ItemInfo>
                <ItemName>{item.name}</ItemName>
                <ItemPrice>{item.quantity} × ${item.price}</ItemPrice>
              </ItemInfo>
              <ItemRemove onClick={() => removeItem(item.id)}>×</ItemRemove>
            </CartItem>
          ))
        )}
      </CartItems>
      {items.length > 0 && (
        <CartFooter>
          <Subtotal>
            <span>{t('store.cartDropdown.subtotal')}</span>
            <span>${total.toFixed(2)}</span>
          </Subtotal>
          <CartButtons>
            <ViewCartBtn onClick={handleViewCart}>{t('store.cartDropdown.viewCart')}</ViewCartBtn>
            <CheckoutBtn onClick={handleCheckout}>{t('store.cartDropdown.checkout')}</CheckoutBtn>
          </CartButtons>
        </CartFooter>
      )}
    </CartDropdown>
  )
}