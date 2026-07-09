import { useState, useEffect } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { Container } from '../../components/layout/PageLayout/shared'
import { Color, Radius, Spacing, FontSize, Breakpoint } from '../../theme/tokens'
import { useUser } from '../../store/UserContext'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { orderAPI, type OrderSummary } from '../../api/order'
import { reviewAPI, type ReviewItem } from '../../api/review'

// ── SHEIN-style 个人中心布局 ──
// 左窄右宽，白底灰边，干净留白

const BRAND_RED = '#e74c3c'

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: ${Spacing.xxl}px;
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

// ── 左栏 ──

const LeftSidebar = styled.aside`
  position: sticky;
  top: ${Spacing.xxl}px;
  display: flex;
  flex-direction: column;
  gap: ${Spacing.md}px;
`

const SidebarCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: ${Spacing.xxl}px;
`

const AvatarLarge = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #e8e8e8;
  margin: 0 auto ${Spacing.md}px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const UserNickname = styled.div`
  text-align: center;
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: ${Spacing.xs}px;
`

const UserEmail = styled.div`
  text-align: center;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-bottom: ${Spacing.lg}px;
`

const SidebarDivider = styled.div`
  border-top: 1px solid ${Color.border.light};
  margin: ${Spacing.md}px 0;
`

const SidebarLink = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${Spacing.sm}px 0;
  font-size: ${FontSize.base}px;
  color: ${Color.text.body};
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: ${BRAND_RED};
  }
`

const AddressSummary = styled.div`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  margin-top: ${Spacing.xs}px;
  line-height: 1.5;
`

const LogoutBtn = styled.button`
  width: 100%;
  padding: ${Spacing.sm + 2}px;
  margin-top: ${Spacing.sm}px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  background: transparent;
  color: ${Color.text.secondary};
  cursor: pointer;
  font-size: ${FontSize.base}px;
  transition: all 0.15s;

  &:hover {
    border-color: ${BRAND_RED};
    color: ${BRAND_RED};
  }
`

// ── 右栏 ──

const RightContent = styled.section`
  min-height: 60vh;
`

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 2px solid ${Color.border.light};
  margin-bottom: ${Spacing.xxl}px;
`

const TabItem = styled.button<{ $active?: boolean }>`
  padding: ${Spacing.md}px ${Spacing.xl}px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? BRAND_RED : 'transparent'};
  margin-bottom: -2px;
  color: ${props => props.$active ? BRAND_RED : Color.text.secondary};
  font-size: ${FontSize.base}px;
  font-weight: ${props => props.$active ? 600 : 400};
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${BRAND_RED};
  }
`

const ContentCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: ${Spacing.xxl}px;
`

const ModuleTitle = styled.div`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: ${Spacing.xl}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

// ── 订单筛选按钮 ──

const OrderBtnGroup = styled.div`
  display: flex;
  gap: ${Spacing.sm}px;
  margin-bottom: ${Spacing.xl}px;
`

const OrderTypeBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: ${Spacing.sm + 2}px 0;
  border: 1px solid ${props => props.$active ? BRAND_RED : Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${props => props.$active ? BRAND_RED : Color.bg.card};
  color: ${props => props.$active ? Color.text.inverse : Color.text.body};
  cursor: pointer;
  font-size: ${FontSize.sm}px;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    border-color: ${BRAND_RED};
    color: ${props => props.$active ? Color.text.inverse : BRAND_RED};
  }
`

const FilterSpacer = styled.div`
  height: ${Spacing.xs}px;
`

// ── 订单列表项 ──

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${Spacing.md}px ${Spacing.lg}px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  margin-bottom: ${Spacing.sm}px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    border-color: ${Color.border.medium};
    background: #fafafa;
  }
`

const OrderItemLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const OrderItemRight = styled.div`
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const OrderItemNo = styled.span`
  font-weight: 600;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
`

const OrderItemStatus = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${BRAND_RED};
`

const OrderItemMeta = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

const OrderItemAmount = styled.span`
  font-weight: 600;
  font-size: ${FontSize.base}px;
  color: ${BRAND_RED};
`

const OrderItemProducts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};

  span {
    white-space: nowrap;
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${Spacing.xxxl}px 0;
  color: ${Color.text.muted};
  font-size: ${FontSize.base}px;
`

// ── 浏览历史网格 ──

const BrowseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${Spacing.lg}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const BrowseItem = styled.div`
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`

const ItemImg = styled.div`
  width: 100%;
  height: 120px;
  background: #eee;
`

const ItemName = styled.div`
  padding: ${Spacing.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
`

const ItemPrice = styled.div`
  padding: 0 ${Spacing.sm}px ${Spacing.sm}px;
  font-size: ${FontSize.base}px;
  color: ${Color.text.heading};
  font-weight: 500;
`

// ── 优惠券网格 ──

const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${Spacing.lg}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const CouponItem = styled.div`
  border: 1px dashed ${Color.text.muted};
  border-radius: ${Radius.sm}px;
  padding: ${Spacing.lg}px;
`

const CouponPrice = styled.div`
  font-size: ${FontSize.xxl}px;
  font-weight: 700;
  color: ${Color.text.heading};
  margin-bottom: ${Spacing.sm}px;
`

const CouponDesc = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  margin-bottom: ${Spacing.sm}px;
`

const CouponTime = styled.div`
  font-size: ${FontSize.xs - 1}px;
  color: ${Color.text.muted};
`

// ── 客服区域 ──

const SupportSection = styled.div`
  text-align: center;
  padding: ${Spacing.xxxl}px 0;
`

const SupportIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fef2f2;
  margin: 0 auto ${Spacing.lg}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${BRAND_RED};
  font-size: 28px;
`

const SupportTitle = styled.div`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: ${Spacing.sm}px;
`

const SupportDesc = styled.div`
  font-size: ${FontSize.base}px;
  color: ${Color.text.secondary};
  margin-bottom: ${Spacing.xl}px;
`

const SupportBtn = styled.button`
  padding: ${Spacing.sm + 2}px ${Spacing.xxxl}px;
  background: ${BRAND_RED};
  color: #fff;
  border: none;
  border-radius: ${Radius.sm}px;
  cursor: pointer;
  font-size: ${FontSize.base}px;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.9;
  }
`

// ── 登录提示 ──

const LoginPrompt = styled.div`
  background: #fff;
  border-radius: ${Radius.md}px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  padding: 5vh 5vw;
  text-align: center;
`

const LoginTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: bold;
  color: #111;
  margin-bottom: 2vh;
`

const LoginDesc = styled.p`
  font-size: 1rem;
  color: #666;
  margin-bottom: 3vh;
`

// 模拟数据（后续对接 API）
const browseHistory: any[] = []
const coupons: any[] = []

type ProfileTab = 'orders' | 'coupons' | 'history' | 'support' | 'reviews'

export default function Profile() {
  const { t } = useTranslation()
  const { user, logout } = useUser()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<ProfileTab>('orders')
  const [activeOrder, setActiveOrder] = useState('pending_payment')
  const [paymentFilter, setPaymentFilter] = useState<string>('')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Fetch orders when tab changes
  useEffect(() => {
    if (!user || activeTab !== 'orders') return
    setOrdersLoading(true)
    const status = activeOrder === 'refund' ? '' : activeOrder
    orderAPI.list(status, 1, paymentFilter).then(data => {
      setOrders(data.results || [])
    }).catch(() => setOrders([])).finally(() => setOrdersLoading(false))
  }, [activeOrder, paymentFilter, user, activeTab])

  // Fetch reviews when tab changes
  useEffect(() => {
    if (!user || activeTab !== 'reviews') return
    setReviewsLoading(true)
    reviewAPI.listByUser().then(data => {
      setReviews(data.results || [])
    }).catch(() => setReviews([])).finally(() => setReviewsLoading(false))
  }, [user, activeTab])

  if (!user) {
    return (
      <PageLayout>
        <Container>
          <LoginPrompt>
            <LoginTitle>{t('store.profile.signIn')}</LoginTitle>
            <LoginDesc>{t('store.profile.signInDesc')}</LoginDesc>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '12px 32px',
                background: BRAND_RED,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {t('store.profile.signInBtn')}
            </button>
            <p style={{ marginTop: '2vh', fontSize: '1rem', color: '#666' }}>
              {t('store.profile.noAccount')}{' '}
              <Link to="/register" style={{ color: BRAND_RED }}>{t('store.profile.signUp')}</Link>
            </p>
          </LoginPrompt>
        </Container>
      </PageLayout>
    )
  }

  const displayName = user.nickname || user.name

  const orderTabs = [
    { key: 'pending_payment', label: t('store.profile.pendingPayment') },
    { key: 'paid', label: t('store.profile.paid') },
    { key: 'shipped', label: t('store.profile.pendingShipment') },
    { key: 'delivered', label: t('store.profile.pendingReceipt') },
    { key: 'refund', label: t('store.profile.refund') },
  ]

  const paymentTabs = [
    { key: '', label: t('store.profile.allPayments') },
    { key: 'paid', label: t('store.profile.paid') },
    { key: 'unpaid', label: t('store.profile.unpaid') },
  ]

  const renderOrders = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.myOrders')}</ModuleTitle>

      <OrderBtnGroup>
        {orderTabs.map(tab => (
          <OrderTypeBtn
            key={tab.key}
            $active={activeOrder === tab.key}
            onClick={() => setActiveOrder(tab.key)}
          >
            {tab.label}
          </OrderTypeBtn>
        ))}
      </OrderBtnGroup>

      <OrderBtnGroup>
        {paymentTabs.map(tab => (
          <OrderTypeBtn
            key={tab.key}
            $active={paymentFilter === tab.key}
            onClick={() => setPaymentFilter(tab.key)}
            style={{ fontSize: '12px', padding: '8px 0' }}
          >
            {tab.label}
          </OrderTypeBtn>
        ))}
      </OrderBtnGroup>

      {ordersLoading ? (
        <EmptyState>{t('common.loading')}</EmptyState>
      ) : orders.length === 0 ? (
        <EmptyState>
          {activeOrder === 'pending_payment' ? t('store.profile.noPendingPayment') :
           activeOrder === 'paid' ? t('store.profile.noPaid') :
           activeOrder === 'shipped' ? t('store.profile.noPendingShipment') :
           activeOrder === 'delivered' ? t('store.profile.noPendingReceipt') :
           t('store.profile.noRefund')}
        </EmptyState>
      ) : (
        orders.map(order => (
          <OrderItem key={order.id} onClick={() => navigate(`/order/${order.order_no}`)}>
            <OrderItemLeft>
              <OrderItemNo>{order.order_no}</OrderItemNo>
              <OrderItemStatus>{order.status}</OrderItemStatus>
              <OrderItemMeta>{new Date(order.created_at).toLocaleDateString()}</OrderItemMeta>
            </OrderItemLeft>
            <OrderItemRight>
              <OrderItemAmount>${Number(order.total_amount).toFixed(2)}</OrderItemAmount>
              <OrderItemProducts>
                <span>{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</span>
                {order.payment_status && (
                  <OrderItemStatus style={{ color: order.payment_status === 'paid' ? '#2e7d32' : BRAND_RED }}>
                    {order.payment_status}
                  </OrderItemStatus>
                )}
              </OrderItemProducts>
            </OrderItemRight>
          </OrderItem>
        ))
      )}
    </ContentCard>
  )

  const renderCoupons = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.myCoupons')}</ModuleTitle>
      {coupons.length === 0 ? (
        <EmptyState>{t('store.coupons.noAvailable')}</EmptyState>
      ) : (
        <CouponGrid>
          {coupons.map((coupon: any, index: number) => (
            <CouponItem key={index}>
              <CouponPrice>{coupon.price}</CouponPrice>
              <CouponDesc>{coupon.desc}</CouponDesc>
              <CouponTime>{coupon.time}</CouponTime>
            </CouponItem>
          ))}
        </CouponGrid>
      )}
    </ContentCard>
  )

  const renderHistory = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.browseHistory')}</ModuleTitle>
      {browseHistory.length === 0 ? (
        <EmptyState>{t('store.history.empty')}</EmptyState>
      ) : (
        <BrowseGrid>
          {browseHistory.map((item: any, index: number) => (
            <BrowseItem key={index}>
              <ItemImg />
              <ItemName>{item.name}</ItemName>
              <ItemPrice>${item.price?.toFixed(2)}</ItemPrice>
            </BrowseItem>
          ))}
        </BrowseGrid>
      )}
    </ContentCard>
  )

  const renderSupport = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.support')}</ModuleTitle>
      <SupportSection>
        <SupportIcon>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </SupportIcon>
        <SupportTitle>{t('store.profile.support')}</SupportTitle>
        <SupportDesc>{t('store.profile.supportDesc')}</SupportDesc>
        <SupportBtn onClick={() => navigate('/support')}>
          {t('store.nav.support')}
        </SupportBtn>
      </SupportSection>
    </ContentCard>
  )

  const renderReviews = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.myReviews')}</ModuleTitle>
      {reviewsLoading ? (
        <EmptyState>{t('common.loading')}</EmptyState>
      ) : reviews.length === 0 ? (
        <EmptyState>{t('store.profile.noReviews')}</EmptyState>
      ) : (
        reviews.map((review: ReviewItem) => (
          <OrderItem key={review.id} onClick={() => navigate(`/product/${review.spu_id}`)}>
            <OrderItemLeft>
              <OrderItemNo>SPU #{review.spu_id}</OrderItemNo>
              <OrderItemMeta>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</OrderItemMeta>
              <OrderItemMeta>{new Date(review.created_at).toLocaleDateString()}</OrderItemMeta>
            </OrderItemLeft>
            <OrderItemRight>
              <OrderItemStatus style={{ color: review.is_active ? '#2e7d32' : '#e74c3c' }}>
                {review.is_active ? t('store.profile.published') : t('store.profile.pendingReview')}
              </OrderItemStatus>
            </OrderItemRight>
          </OrderItem>
        ))
      )}
    </ContentCard>
  )

  return (
    <PageLayout>
      <Container>
        <ProfileGrid>
          {/* ── 左栏：用户信息 + 地址 + 退出 ── */}
          <LeftSidebar>
            <SidebarCard>
              <AvatarLarge>
                {user.avatar ? <img src={user.avatar} alt={displayName} /> : null}
              </AvatarLarge>
              <UserNickname>{displayName}</UserNickname>
              <UserEmail>{user.email}</UserEmail>
              <SidebarDivider />
              <SidebarLink onClick={() => navigate('/cart')}>
                {t('store.profile.myOrders')}
                <span style={{ color: Color.text.muted }}>›</span>
              </SidebarLink>
              <SidebarLink onClick={() => navigate('/coupons')}>
                {t('store.profile.myCoupons')}
                <span style={{ color: Color.text.muted }}>›</span>
              </SidebarLink>
              <SidebarLink onClick={() => navigate('/history')}>
                {t('store.profile.browseHistory')}
                <span style={{ color: Color.text.muted }}>›</span>
              </SidebarLink>
              <SidebarLink onClick={() => navigate('/notifications')}>
                Notifications
                <span style={{ color: Color.text.muted }}>›</span>
              </SidebarLink>
              <SidebarLink onClick={() => navigate('/favorites')}>
                Favorites
                <span style={{ color: Color.text.muted }}>›</span>
              </SidebarLink>
            </SidebarCard>

            <SidebarCard>
              <div style={{ fontWeight: 600, fontSize: FontSize.base, color: Color.text.heading, marginBottom: Spacing.sm }}>
                {t('store.profile.addresses')}
              </div>
              <AddressSummary>
                {t('store.profile.noAddresses')}
              </AddressSummary>
            </SidebarCard>

            <LogoutBtn onClick={() => { logout(); navigate('/') }}>
              {t('store.profile.logout')}
            </LogoutBtn>
          </LeftSidebar>

          {/* ── 右栏：标签页切换 + 内容 ── */}
          <RightContent>
            <TabBar>
              <TabItem $active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}>
                {t('store.profile.myOrdersTab')}
              </TabItem>
              <TabItem $active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')}>
                {t('store.profile.myCouponsTab')}
              </TabItem>
              <TabItem $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                {t('store.profile.browseHistoryTab')}
              </TabItem>
              <TabItem $active={activeTab === 'support'} onClick={() => setActiveTab('support')}>
                {t('store.profile.supportTab')}
              </TabItem>
              <TabItem $active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>
                {t('store.profile.myReviewsTab')}
              </TabItem>
              <TabItem $active={activeTab === 'notifications'} onClick={() => { navigate('/notifications'); }}>
                Notifications
              </TabItem>
              <TabItem $active={activeTab === 'favorites'} onClick={() => { navigate('/favorites'); }}>
                Favorites
              </TabItem>
            </TabBar>

            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'coupons' && renderCoupons()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'support' && renderSupport()}
            {activeTab === 'reviews' && renderReviews()}
          </RightContent>
        </ProfileGrid>
      </Container>
    </PageLayout>
  )
}
