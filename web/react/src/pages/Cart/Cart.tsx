import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Button from '../../components/common/Button/Button'
import EmptyState from '../../components/common/EmptyState'
import { useCart } from '../../store/CartContext'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, Layout } from '../../theme/tokens'

const CartContainer = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background-color: ${Color.bg.page};
  padding: 5vh 5vw;
`

const CartWrapper = styled.div`
  max-width: 1200px;
  margin: 0 2vw 0 calc(7vw + 120px);

  @media (max-width: 768px) {
    margin-left: 2vw;
  }
`

const CartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3vh;
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: bold;
  color: #111;
`

const ContinueLink = styled(Link)`
  font-size: 1rem;
  color: ${Color.text.secondary};
  text-decoration: none;

  &:hover {
    color: ${Color.primary};
    text-decoration: underline;
  }
`

const CartContent = styled.div`
  display: flex;
  gap: 3vw;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const CartItems = styled.div`
  flex: 1;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: 2vw;
`

const CartItem = styled.div`
  display: flex;
  gap: 2vw;
  padding: 2vh 0;
  border-bottom: 1px solid ${Color.border.light};
  
  &:last-child {
    border-bottom: none;
  }
`

const ItemImage = styled.div`
  width: 120px;
  height: 120px;
  background: ${Color.primaryLight};
  border-radius: ${Radius.md}px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: ${Radius.md}px;
  }
`

const ItemInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`

const ItemName = styled.h3`
  font-size: 1.15rem;
  font-weight: bold;
  color: #111;
  margin-bottom: 1vh;
`

const ItemDesc = styled.p`
  font-size: 0.9rem;
  color: ${Color.text.secondary};
  margin-bottom: 1vh;
`

const ItemPrice = styled.p`
  font-size: 1.15rem;
  font-weight: bold;
  color: ${Color.primary};
  margin-top: auto;
`

const ItemActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
`

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 1vw;
`

const QtyButton = styled.button`
  width: 36px;
  height: 36px;
  border: 1px solid ${Color.border.medium};
  background: ${Color.bg.card};
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background: ${Color.primaryLight};
  }
`

const Quantity = styled.span`
  font-size: 1rem;
  min-width: 2vw;
  text-align: center;
`

const RemoveButton = styled.button`
  font-size: 0.85rem;
  color: ${Color.text.muted};
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    color: #e74c3c;
  }
`

const CartSummary = styled.div`
  width: 300px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  padding: 2vw;
  position: sticky;
  top: 2vh;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`

const SummaryTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: bold;
  color: #111;
  margin-bottom: 2vh;
  padding-bottom: 1vh;
  border-bottom: 1px solid ${Color.border.light};
  
`

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1vh;
  font-size: 0.9rem;
  color: ${Color.text.secondary};
`

const SummaryTotal = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2vh;
  padding-top: 2vh;
  border-top: 1px solid ${Color.border.light};
  font-size: 1.15rem;
  font-weight: bold;
  color: ${Color.primary};
  
`

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total, count } = useCart()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleCheckout = () => {
    navigate('/checkout')
  }

  return (
    <PageLayout>
      <CartContainer>
        <CartWrapper>
          <CartHeader>
            <Title>{t('store.cart.title').replace('{count}', String(count))}</Title>
            <ContinueLink to="/category">{t('store.cart.continueShopping')}</ContinueLink>
          </CartHeader>

          {items.length === 0 ? (
            <EmptyState
              icon={<img src="/static/images/icons/JoinShoppingCar.svg" alt="cart" style={{ width: '20px', height: '20px' }} />}
              title={t('store.cart.empty')}
              message={t('store.cart.emptyDesc')}
            />
          ) : (
            <CartContent>
              <CartItems>
                {items.map(item => (
                  <CartItem key={item.id}>
                    <ItemImage>
                      <img src={item.image} alt={item.name} />
                    </ItemImage>
                    <ItemInfo>
                      <ItemName>{item.name}</ItemName>
                      <ItemDesc>{t('store.cart.productDescription')}</ItemDesc>
                      <ItemPrice>${item.price.toFixed(2)}</ItemPrice>
                    </ItemInfo>
                    <ItemActions>
                      <QuantityControl>
                        <QtyButton onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</QtyButton>
                        <Quantity>{item.quantity}</Quantity>
                        <QtyButton onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</QtyButton>
                      </QuantityControl>
                      <RemoveButton onClick={() => removeItem(item.id)}>{t('store.cart.remove')}</RemoveButton>
                    </ItemActions>
                  </CartItem>
                ))}
              </CartItems>

              <CartSummary>
                <SummaryTitle>{t('store.cart.orderSummary')}</SummaryTitle>
                <SummaryRow>
                  <span>{t('store.cart.subtotal')}</span>
                  <span>${total.toFixed(2)}</span>
                </SummaryRow>
                <SummaryRow>
                  <span>{t('store.cart.shipping')}</span>
                  <span>{t('store.cart.free')}</span>
                </SummaryRow>
                <SummaryRow>
                  <span>{t('store.cart.tax')}</span>
                  <span>${(total * 0.08).toFixed(2)}</span>
                </SummaryRow>
                <SummaryTotal>
                  <span>{t('store.cart.total')}</span>
                  <span>${(total * 1.08).toFixed(2)}</span>
                </SummaryTotal>
                
                <Button 
                  variant="primary" 
                  size="lg" 
                  style={{ width: '100%', marginTop: '2vh' }}
                  onClick={handleCheckout}
                >
                  {t('store.cart.checkout')}
                </Button>
                
                <Button 
                  variant="outline" 
                  style={{ width: '100%', marginTop: '1vh' }}
                  onClick={clearCart}
                >
                  {t('store.cart.clearCart')}
                </Button>
                
                <Button 
                  variant="outline" 
                  style={{ width: '100%', marginTop: '1vh' }}
                  onClick={() => navigate('/support')}
                >
                  {t('store.product.contactSupport')}
                </Button>
              </CartSummary>
            </CartContent>
          )}
        </CartWrapper>
      </CartContainer>
    </PageLayout>
  )
}