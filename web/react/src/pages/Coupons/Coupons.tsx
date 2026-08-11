import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { Container, Wrapper, Sidebar, MainContent, ModuleCard, ModuleTitle } from '../../components/layout/PageLayout/shared'
import { useCoupons, type DisplayCoupon } from '../../hooks/useCoupons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'

const SidebarMenu = styled.div``

const MenuItem = styled.div<{ active?: boolean }>`
  padding: 15px 12px;
  margin-bottom: 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
  color: ${props => props.active ? '#fff' : '#444'};
  background: ${props => props.active ? '#000' : 'transparent'};
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.active ? '#000' : '#f5f5f5'};
    color: ${props => props.active ? '#fff' : '#444'};
  }
`

const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`

const CouponCard = styled.div`
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(30%, -30%);
  }
`

const CouponHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
`

const CouponValue = styled.div`
  display: flex;
  align-items: baseline;
`

const CouponAmount = styled.span`
  font-size: 32px;
  font-weight: bold;
`

const CouponCurrency = styled.span`
  font-size: 12px;
  margin-left: 3px;
`

const CouponMin = styled.div`
  font-size: 12px;
  opacity: 0.9;
`

const CouponInfo = styled.div`
  margin-bottom: 15px;
`

const CouponTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
`

const CouponDesc = styled.div`
  font-size: 12px;
  opacity: 0.85;
`

const CouponFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  opacity: 0.8;
`

const UsedCard = styled(CouponCard)`
  background: linear-gradient(135deg, #999 0%, #ccc 100%);
  opacity: 0.7;
`

const ExpiredCard = styled(CouponCard)`
  background: linear-gradient(135deg, #666 0%, #888 100%);
  opacity: 0.7;
`

const CouponStatusLabel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  font-size: 24px;
  font-weight: bold;
  opacity: 0.5;
  color: rgba(255, 255, 255, 0.9);
  pointer-events: none;
`

export default function Coupons() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { coupons } = useCoupons()
  const activeCoupons = coupons.filter(c => ['available', 'returned'].includes(c.status) && new Date(c.expireDate) > new Date())
  const usedCoupons = coupons.filter(c => ['used', 'locked'].includes(c.status))
  const expiredCoupons = coupons.filter(c => c.status === 'expired' || new Date(c.expireDate) <= new Date())

  const renderCoupon = (coupon: DisplayCoupon, index: number) => {
    let CardComponent = CouponCard
    let statusLabel: string | null = null
    if (['used', 'locked'].includes(coupon.status)) {
      CardComponent = UsedCard
      statusLabel = t('store.coupons.usedLabel')
    } else if (new Date(coupon.expireDate) <= new Date()) {
      CardComponent = ExpiredCard
      statusLabel = t('store.coupons.expiredLabel')
    }

    return (
      <CardComponent key={index}>
        {statusLabel && <CouponStatusLabel>{statusLabel}</CouponStatusLabel>}
        <CouponHeader>
          <CouponValue>
            <CouponAmount>{coupon.amount}</CouponAmount>
            <CouponCurrency>USD</CouponCurrency>
          </CouponValue>
          <CouponMin>{t('store.coupons.min')} {coupon.minSpend} USD</CouponMin>
        </CouponHeader>
        <CouponInfo>
          <CouponTitle>{coupon.title}</CouponTitle>
          <CouponDesc>{coupon.description}</CouponDesc>
        </CouponInfo>
        <CouponFooter>
          <span>
            {t('store.coupons.expires')} {coupon.expireDate}
            {coupon.promoCode && (
              <span style={{ display: 'block', marginTop: 4, opacity: 0.95 }}>
                {t('store.coupons.fromPromo')}
                {coupon.promoCodeName ? ` · ${coupon.promoCodeName}` : ''}（{coupon.promoCode}）
              </span>
            )}
          </span>
          <span>{coupon.code}</span>
        </CouponFooter>
      </CardComponent>
    )
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '25px', alignItems: 'start' }}>
          <Sidebar>
            <SidebarMenu>
              <MenuItem onClick={() => navigate('/profile')}>{t('store.coupons.accountInfo')}</MenuItem>
              <MenuItem onClick={() => navigate('/cart')}>{t('store.coupons.myOrders')}</MenuItem>
              <MenuItem active>{t('store.coupons.myCoupons')}</MenuItem>
              <MenuItem onClick={() => navigate('/history')}>{t('store.coupons.recentlyViewed')}</MenuItem>
            </SidebarMenu>
          </Sidebar>
          
          <MainContent>
            <ModuleCard>
              <ModuleTitle>{t('store.coupons.available')} ({activeCoupons.length})</ModuleTitle>
              {activeCoupons.length > 0 ? (
                <CouponGrid>
                  {activeCoupons.map((coupon, index) => renderCoupon(coupon, index))}
                </CouponGrid>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {t('store.coupons.noAvailable')}
                </div>
              )}
            </ModuleCard>
            
            <ModuleCard>
              <ModuleTitle>{t('store.coupons.used')} ({usedCoupons.length})</ModuleTitle>
              {usedCoupons.length > 0 ? (
                <CouponGrid>
                  {usedCoupons.map((coupon, index) => renderCoupon(coupon, index))}
                </CouponGrid>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {t('store.coupons.noUsed')}
                </div>
              )}
            </ModuleCard>
            
            <ModuleCard>
              <ModuleTitle>{t('store.coupons.expired')} ({expiredCoupons.length})</ModuleTitle>
              {expiredCoupons.length > 0 ? (
                <CouponGrid>
                  {expiredCoupons.map((coupon, index) => renderCoupon(coupon, index))}
                </CouponGrid>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {t('store.coupons.noExpired')}
                </div>
              )}
            </ModuleCard>
          </MainContent>
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
