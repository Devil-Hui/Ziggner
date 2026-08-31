import { useState, useEffect, useCallback, type ReactElement } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { Container } from '../../components/layout/PageLayout/shared'
import { Color, Spacing, Radius, FontSize, Breakpoint, Shadow } from '../../theme/tokens'
import Button from '../../components/common/Button/Button'
import { useUser } from '../../store/UserContext'
import { useCurrency } from '../../store/CurrencyContext'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { orderAPI, type OrderSummary } from '../../api/order'
import { reviewAPI, type ReviewItem } from '../../api/review'
import { publicAPI } from '../../api/public'
import { patch } from '../../api/request'

// 配色对齐商城设计令牌（Ziggner Blue）
const BRAND = {
  red: Color.primary,
  light: Color.primaryLight,
}

// ── inline nav/action icons (self-contained SVGs, inherit currentColor) ──
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const OrderIcon = () => (
  <svg {...iconProps}>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h6" />
  </svg>
)

const CouponIcon = () => (
  <svg {...iconProps}>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
    <path d="M14 6v12" />
  </svg>
)

const HistoryIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
)

const ReviewIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
  </svg>
)

const SupportIcon = () => (
  <svg {...iconProps}>
    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
    <rect x="2" y="13" width="4" height="6" rx="1.5" />
    <rect x="18" y="13" width="4" height="6" rx="1.5" />
    <path d="M20 19a4 4 0 0 1-4 3h-2" />
  </svg>
)

const BellIcon = () => (
  <svg {...iconProps}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10.5 20a2 2 0 0 0 3 0" />
  </svg>
)

const HeartIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20z" />
  </svg>
)

const AddressIcon = () => (
  <svg {...iconProps}>
    <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

const UserIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
)

const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

const LogoutIcon = () => (
  <svg {...iconProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

// ── layout ──
const Shell = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 22px;
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

// ── hero ──
const Hero = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.lg}px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: ${Color.text.heading};
  border: 1px solid ${Color.border.light};
  box-shadow: ${Shadow.card};
  margin-bottom: 22px;
`

const Avatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid ${Color.primaryLight};
  background: ${Color.primaryLight};
  overflow: hidden;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: ${Color.primary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const HeroInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const HeroName = styled.div`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
`

const HeroEmail = styled.div`
  font-size: 13px;
  opacity: 0.85;
`

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  background: ${Color.primaryLight};
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: ${Color.primary};
`

const HeroLogout = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.medium};
  color: ${Color.text.secondary};
  padding: 8px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
`

// ── left nav ──
const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: ${Color.bg.card};
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 10px;
  position: sticky;
  top: ${Spacing.xxl}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
`

const NavGroupTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${Color.text.muted};
  padding: 14px 12px 6px;

  &:first-child {
    padding-top: 4px;
  }

  @media (max-width: ${Breakpoint.mobile}px) {
    flex-basis: 100%;
  }
`

const NavItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border: none;
  width: 100%;
  background: ${props => (props.$active ? BRAND.light : 'transparent')};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: ${props => (props.$active ? BRAND.red : Color.text.secondary)};
  font-weight: ${props => (props.$active ? 600 : 400)};
  border-left: 3px solid ${props => (props.$active ? BRAND.red : 'transparent')};
  transition: all 0.15s;

  &:hover {
    background: ${props => (props.$active ? BRAND.light : Color.bg.page)};
    color: ${BRAND.red};
  }

  @media (max-width: ${Breakpoint.mobile}px) {
    width: auto;
    flex: 1 1 calc(50% - 4px);
  }
`

const AddressCard = styled.div`
  background: ${Color.bg.card};
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 16px;
  margin-top: 14px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`

const AddressText = styled.div`
  font-size: 13px;
  color: ${Color.text.body};
`

const AddressSub = styled.div`
  font-size: 11px;
  color: ${Color.text.muted};
  margin-top: 2px;
`

// ── addresses module ──
const AddrList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const AddrItem = styled.div`
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`

const AddrInfo = styled.div`
  font-size: 13px;
  color: ${Color.text.body};
  line-height: 1.7;
  min-width: 0;
`

const AddrName = styled.div`
  font-weight: 600;
  color: ${Color.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`

const AddrDefaultTag = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${Color.primary};
  border: 1px solid ${Color.primary};
  border-radius: 999px;
  padding: 1px 8px;
`

const AddrActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
`

const AddrActionBtn = styled.button`
  background: none;
  border: 1px solid ${Color.border.medium};
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  color: ${Color.text.secondary};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${Color.primary};
    color: ${Color.primary};
  }
`

const AddrDeleteBtn = styled(AddrActionBtn)`
  color: ${Color.status.error};
  border-color: ${Color.status.error}33;

  &:hover {
    border-color: ${Color.status.error};
    color: ${Color.status.error};
  }
`

const AddrForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`

const AddrField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: ${Color.text.secondary};
`

const AddrInput = styled.input`
  height: 38px;
  padding: 0 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: 8px;
  font-size: 13px;
  color: ${Color.text.body};
  background: ${Color.bg.card};

  &:focus {
    outline: none;
    border-color: ${Color.primary};
  }
`

const AddrRow2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const AddrCheck = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${Color.text.secondary};
  cursor: pointer;
`

// ── profile info rows ──
const ProfileInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid ${Color.border.light};
  font-size: 13px;
`

const ProfileLabel = styled.div`
  width: 110px;
  flex-shrink: 0;
  color: ${Color.text.muted};
`

const ProfileValue = styled.div`
  color: ${Color.text.body};
  word-break: break-all;
`

// ── right content ──
const Right = styled.section`
  min-height: 60vh;
`

const StatusRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 22px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StatusTile = styled.button<{ $active?: boolean }>`
  background: ${Color.bg.card};
  border: 1px solid ${props => (props.$active ? BRAND.red : Color.border.light)};
  border-radius: 14px;
  padding: 16px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: ${props => (props.$active ? BRAND.red : Color.text.heading)};
  font-size: 12.5px;
  font-weight: ${props => (props.$active ? 600 : 500)};
  transition: all 0.15s;

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover {
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
    transform: translateY(-2px);
  }
`

const ContentCard = styled.div`
  background: ${Color.bg.card};
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 24px;
`

const ModuleTitle = styled.div`
  font-size: ${FontSize.lg}px;
  font-weight: 600;
  color: ${Color.text.heading};
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const PillGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const Pill = styled.button<{ $active?: boolean }>`
  padding: 6px 16px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 12.5px;
  border: 1px solid ${props => (props.$active ? BRAND.red : Color.border.medium)};
  background: ${props => (props.$active ? BRAND.red : Color.text.inverse)};
  color: ${props => (props.$active ? Color.text.inverse : Color.text.secondary)};
  transition: all 0.15s;

  &:hover {
    border-color: ${BRAND.red};
    color: ${props => (props.$active ? Color.text.inverse : BRAND.red)};
  }
`

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid ${Color.border.light};
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    border-color: ${BRAND.red};
    background: ${Color.bg.page};
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
  color: ${Color.text.secondary};
`

const OrderItemMeta = styled.span`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
`

const OrderItemAmount = styled.span`
  font-weight: 600;
  font-size: ${FontSize.base}px;
  color: ${Color.text.heading};
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
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.15s;

  &:hover {
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  }
`

const ItemImg = styled.div`
  width: 100%;
  height: 120px;
  background: ${Color.bg.sunken};
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

const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${Spacing.lg}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const CouponItem = styled.div`
  position: relative;
  border: 1px solid ${Color.border.light};
  border-radius: 12px;
  padding: 16px 16px 16px 22px;
  background: ${Color.bg.card};
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${BRAND.red};
  }
`

const CouponPrice = styled.div`
  font-size: ${FontSize.xxl}px;
  font-weight: 700;
  color: ${BRAND.red};
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

const SupportSection = styled.div`
  text-align: center;
  padding: ${Spacing.xxl}px 0;
`

const SupportIconBox = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${BRAND.light};
  margin: 0 auto ${Spacing.lg}px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${BRAND.red};
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

const LoginPrompt = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  padding: 5vh 5vw;
  text-align: center;
`

const LoginTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${Color.text.primary};
  margin-bottom: 2vh;
`

const LoginDesc = styled.p`
  font-size: 1rem;
  color: ${Color.text.body};
  margin-bottom: 3vh;
`

// 模拟数据（后续对接 API）
const browseHistory: any[] = []
const coupons: any[] = []

type ProfileTab = 'orders' | 'coupons' | 'history' | 'support' | 'reviews' | 'addresses' | 'notifications' | 'favorites' | 'profile' | 'password' | 'security'

export default function Profile() {
  const { t } = useTranslation()
  const { user, logout, refreshUser } = useUser()
  const { format } = useCurrency()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<ProfileTab>('orders')
  const [activeOrder, setActiveOrder] = useState('pending_payment')
  const [paymentFilter, setPaymentFilter] = useState<string>('')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // ── addresses ──
  const [addresses, setAddresses] = useState<any[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addrForm, setAddrForm] = useState({
    name: '', phone: '', region: '', city: '', address_line: '', postal_code: '', is_default: false,
  })
  const [addrSaving, setAddrSaving] = useState(false)

  // ── profile / password / security ──
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [pwOld, setPwOld] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true)
    try {
      const data = await publicAPI.getAddresses()
      setAddresses(Array.isArray(data) ? data : [])
    } catch {
      setAddresses([])
    } finally {
      setAddressesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && activeTab === 'addresses') fetchAddresses()
  }, [user, activeTab, fetchAddresses])

  const handleSaveAddress = async () => {
    const f = addrForm
    if (!f.name.trim() || !f.phone.trim() || !f.region.trim() || !f.city.trim() || !f.address_line.trim()) {
      alert(t('store.profile.fillAddressFields'))
      return
    }
    setAddrSaving(true)
    try {
      await publicAPI.createAddress({ ...f, country: 'China' })
      setShowAddressForm(false)
      setAddrForm({ name: '', phone: '', region: '', city: '', address_line: '', postal_code: '', is_default: false })
      fetchAddresses()
    } catch {
      alert(t('store.profile.saveAddressFailed'))
    } finally {
      setAddrSaving(false)
    }
  }

  const handleDeleteAddress = async (id: number) => {
    try {
      await publicAPI.deleteAddress(id)
      fetchAddresses()
    } catch {
      alert(t('store.profile.deleteAddressFailed'))
    }
  }

  const handleSetDefault = async (addr: any) => {
    try {
      await publicAPI.updateAddress(addr.id, { is_default: true })
      fetchAddresses()
    } catch {
      alert(t('store.profile.saveAddressFailed'))
    }
  }

  useEffect(() => {
    if (!user || activeTab !== 'orders') return
    setOrdersLoading(true)
    const status = (activeOrder === 'refund' || activeOrder === 'all') ? '' : activeOrder
    orderAPI.list(status, 1, paymentFilter).then(data => {
      setOrders(data.results || [])
    }).catch(() => setOrders([])).finally(() => setOrdersLoading(false))
  }, [activeOrder, paymentFilter, user, activeTab])

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
            <Button variant="primary" size="lg" onClick={() => navigate('/login')}>
              {t('store.profile.signInBtn')}
            </Button>
            <p style={{ marginTop: '2vh', fontSize: '1rem', color: Color.text.secondary }}>
              {t('store.profile.noAccount')}{' '}
              <Link to="/register" style={{ color: Color.primary }}>{t('store.profile.signUp')}</Link>
            </p>
          </LoginPrompt>
        </Container>
      </PageLayout>
    )
  }

  const displayName = user.nickname || user.name
  const initial = (displayName || user.email || '?').charAt(0).toUpperCase()

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

  type NavItemDef = { key: string; label: string; icon: ReactElement; tab?: ProfileTab; route?: string; orderKey?: string }
  const navGroups: { title: string; items: NavItemDef[] }[] = [
    {
      title: t('store.profile.groupOrders'),
      items: [
        { key: 'all_orders', label: t('store.profile.allOrders'), icon: <OrderIcon />, orderKey: 'all' },
        { key: 'pending_payment', label: t('store.profile.pendingPayment'), icon: <OrderIcon />, orderKey: 'pending_payment' },
        { key: 'delivered', label: t('store.profile.pendingReceipt'), icon: <OrderIcon />, orderKey: 'delivered' },
        { key: 'refund', label: t('store.profile.refund'), icon: <OrderIcon />, orderKey: 'refund' },
      ],
    },
    {
      title: t('store.profile.groupAccount'),
      items: [
        { key: 'profile', label: t('store.profile.personalInfoTab'), icon: <UserIcon />, tab: 'profile' },
        { key: 'password', label: t('store.profile.changePassword'), icon: <LockIcon />, tab: 'password' },
        { key: 'addresses', label: t('store.profile.addresses'), icon: <AddressIcon />, tab: 'addresses' },
      ],
    },
    {
      title: t('store.profile.groupMore'),
      items: [
        { key: 'coupons', label: t('store.profile.myCouponsTab'), icon: <CouponIcon />, tab: 'coupons' },
        { key: 'history', label: t('store.profile.browseHistoryTab'), icon: <HistoryIcon />, tab: 'history' },
        { key: 'reviews', label: t('store.profile.myReviewsTab'), icon: <ReviewIcon />, tab: 'reviews' },
        { key: 'favorites', label: t('store.nav.favorites'), icon: <HeartIcon />, route: '/favorites' },
        { key: 'notifications', label: t('store.nav.notifications'), icon: <BellIcon />, route: '/notifications' },
      ],
    },
    {
      title: t('store.profile.groupSupport'),
      items: [
        { key: 'support', label: t('store.profile.supportTab'), icon: <SupportIcon />, tab: 'support' },
      ],
    },
    {
      title: t('store.profile.groupSecurity'),
      items: [
        { key: 'security', label: t('store.profile.securityPrivacy'), icon: <LockIcon />, tab: 'security' },
      ],
    },
  ]

  const renderOrders = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.myOrders')}</ModuleTitle>

      <PillGroup>
        {paymentTabs.map(tab => (
          <Pill
            key={tab.key}
            $active={paymentFilter === tab.key}
            onClick={() => setPaymentFilter(tab.key)}
          >
            {tab.label}
          </Pill>
        ))}
      </PillGroup>

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
              <OrderItemAmount>{format(Number(order.total_amount))}</OrderItemAmount>
              <OrderItemProducts>
                <span>{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</span>
                {order.payment_status && (
                  <OrderItemStatus style={{ color: order.payment_status === 'paid' ? Color.status.success : Color.status.error }}>
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
              <ItemPrice>{item.price ? format(Number(item.price)) : ''}</ItemPrice>
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
        <SupportIconBox>
          <SupportIcon />
        </SupportIconBox>
        <SupportTitle>{t('store.profile.support')}</SupportTitle>
        <SupportDesc>{t('store.profile.supportDesc')}</SupportDesc>
        <Button variant="primary" onClick={() => navigate('/support')}>
          {t('store.nav.support')}
        </Button>
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
              <OrderItemStatus style={{ color: review.is_active ? Color.status.success : Color.status.error }}>
                {review.is_active ? t('store.profile.published') : t('store.profile.pendingReview')}
              </OrderItemStatus>
            </OrderItemRight>
          </OrderItem>
        ))
      )}
    </ContentCard>
  )

  const renderAddresses = () => (
    <ContentCard>
      <ModuleTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('store.profile.addresses')}</span>
        <Button variant="primary" size="sm" onClick={() => setShowAddressForm(v => !v)}>
          {showAddressForm ? t('common.cancel') : t('store.profile.addAddress')}
        </Button>
      </ModuleTitle>

      {showAddressForm && (
        <AddrForm>
          <AddrField>
            {t('store.profile.receiverName')}
            <AddrInput value={addrForm.name} onChange={(e) => setAddrForm(f => ({ ...f, name: e.target.value }))} />
          </AddrField>
          <AddrField>
            {t('store.profile.phoneNumber')}
            <AddrInput value={addrForm.phone} onChange={(e) => setAddrForm(f => ({ ...f, phone: e.target.value }))} />
          </AddrField>
          <AddrRow2>
            <AddrField>
              {t('store.profile.region')}
              <AddrInput value={addrForm.region} onChange={(e) => setAddrForm(f => ({ ...f, region: e.target.value }))} />
            </AddrField>
            <AddrField>
              {t('store.profile.city')}
              <AddrInput value={addrForm.city} onChange={(e) => setAddrForm(f => ({ ...f, city: e.target.value }))} />
            </AddrField>
          </AddrRow2>
          <AddrField>
            {t('store.profile.addressLine')}
            <AddrInput value={addrForm.address_line} onChange={(e) => setAddrForm(f => ({ ...f, address_line: e.target.value }))} />
          </AddrField>
          <AddrRow2>
            <AddrField>
              {t('store.profile.postalCode')}
              <AddrInput value={addrForm.postal_code} onChange={(e) => setAddrForm(f => ({ ...f, postal_code: e.target.value }))} />
            </AddrField>
            <AddrCheck>
              <input
                type="checkbox"
                checked={addrForm.is_default}
                onChange={(e) => setAddrForm(f => ({ ...f, is_default: e.target.checked }))}
              />
              {t('store.profile.setDefault')}
            </AddrCheck>
          </AddrRow2>
          <Button variant="primary" size="sm" disabled={addrSaving} onClick={handleSaveAddress}>
            {addrSaving ? t('common.loading') : t('common.save')}
          </Button>
        </AddrForm>
      )}

      {addressesLoading ? (
        <EmptyState>{t('common.loading')}</EmptyState>
      ) : addresses.length === 0 ? (
        <EmptyState>
          {t('store.profile.noAddresses')}
        </EmptyState>
      ) : (
        <AddrList>
          {addresses.map((addr: any) => (
            <AddrItem key={addr.id}>
              <AddrInfo>
                <AddrName>
                  {addr.name}
                  {addr.is_default && <AddrDefaultTag>{t('store.profile.default')}</AddrDefaultTag>}
                </AddrName>
                <div>{addr.phone}</div>
                <div>{[addr.region, addr.city, addr.address_line].filter(Boolean).join(', ')}</div>
                {addr.postal_code && <div style={{ color: Color.text.muted, fontSize: 12 }}>{addr.postal_code}</div>}
              </AddrInfo>
              <AddrActions>
                {!addr.is_default && (
                  <AddrActionBtn onClick={() => handleSetDefault(addr)}>{t('store.profile.setDefault')}</AddrActionBtn>
                )}
                <AddrDeleteBtn onClick={() => handleDeleteAddress(addr.id)}>{t('common.delete')}</AddrDeleteBtn>
              </AddrActions>
            </AddrItem>
          ))}
        </AddrList>
      )}
    </ContentCard>
  )

  const goTab = (item: NavItemDef) => {
    if (item.orderKey) {
      setActiveTab('orders')
      setActiveOrder(item.orderKey)
    } else if (item.tab) {
      setActiveTab(item.tab)
    } else if (item.route) {
      navigate(item.route)
    }
  }

  const renderProfile = () => {
    const handleSaveNickname = async () => {
      setSavingProfile(true)
      try {
        await patch('/users/me/', { nickname: nicknameDraft.trim() })
        await refreshUser()
        setSavingProfile(false)
        alert(t('store.profile.profileSaved'))
      } catch {
        setSavingProfile(false)
        alert(t('store.profile.profileSaveFailed'))
      }
    }
    return (
      <ContentCard>
        <ModuleTitle>{t('store.profile.personalInfoTab')}</ModuleTitle>
        <ProfileInfoRow><ProfileLabel>{t('store.profile.personalInfo')}</ProfileLabel><ProfileValue>{user.nickname || user.name}</ProfileValue></ProfileInfoRow>
        <ProfileInfoRow><ProfileLabel>{t('store.profile.email')}</ProfileLabel><ProfileValue>{user.email}</ProfileValue></ProfileInfoRow>
        <ProfileInfoRow><ProfileLabel>{t('store.profile.nickname')}</ProfileLabel>
          <ProfileValue>
            <AddrInput
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              placeholder={user.nickname || user.name || ''}
              style={{ width: 240 }}
            />
          </ProfileValue>
        </ProfileInfoRow>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" size="sm" disabled={savingProfile} onClick={handleSaveNickname}>
            {savingProfile ? t('common.loading') : t('store.profile.saveNickname')}
          </Button>
        </div>
      </ContentCard>
    )
  }

  const renderPassword = () => {
    const handleChangePw = async () => {
      if (!pwOld || !pwNew || !pwConfirm) {
        alert(t('store.profile.fillPasswordFields'))
        return
      }
      if (pwNew !== pwConfirm) {
        alert(t('store.profile.passwordMismatch'))
        return
      }
      setSavingPw(true)
      try {
        await publicAPI.changePassword({ old_password: pwOld, new_password: pwNew, confirm_password: pwConfirm })
        setPwOld('')
        setPwNew('')
        setPwConfirm('')
        alert(t('store.profile.changePasswordSuccess'))
      } catch {
        alert(t('store.profile.changePasswordFailed'))
      } finally {
        setSavingPw(false)
      }
    }
    return (
      <ContentCard>
        <ModuleTitle>{t('store.profile.changePassword')}</ModuleTitle>
        <AddrField>{t('store.profile.oldPassword')}<AddrInput type="password" value={pwOld} onChange={(e) => setPwOld(e.target.value)} /></AddrField>
        <AddrField>{t('store.profile.newPassword')}<AddrInput type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} /></AddrField>
        <AddrField>{t('store.profile.confirmPassword')}<AddrInput type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} /></AddrField>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" size="sm" disabled={savingPw} onClick={handleChangePw}>
            {savingPw ? t('common.loading') : t('store.profile.changePassword')}
          </Button>
        </div>
      </ContentCard>
    )
  }

  const renderSecurity = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.securityPrivacy')}</ModuleTitle>
      <SupportDesc style={{ marginBottom: 16 }}>{t('store.profile.accountSecurityDesc')}</SupportDesc>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <Button variant="primary" size="sm" onClick={() => setActiveTab('password')}>{t('store.profile.changePassword')}</Button>
        <Button size="sm" onClick={() => { logout(); navigate('/') }}>{t('store.profile.logout')}</Button>
      </div>
    </ContentCard>
  )

  return (
    <PageLayout>
      <Container>
        <Shell>
          {/* 头图 */}
          <Hero style={{ gridColumn: '1 / -1' }}>
            <Avatar>
              {user.avatar ? <img src={user.avatar} alt={displayName} /> : initial}
            </Avatar>
            <HeroInfo>
              <HeroName>{displayName}</HeroName>
              <HeroEmail>{user.email}</HeroEmail>
              <HeroBadge>{t('store.profile.standard')}</HeroBadge>
            </HeroInfo>
            <HeroLogout onClick={() => { logout(); navigate('/') }}>
              <LogoutIcon />
              {t('store.profile.logout')}
            </HeroLogout>
          </Hero>

          {/* 左：分组导航 + 地址 */}
          <div>
            <Nav>
              {navGroups.map(group => (
                <div key={group.title}>
                  <NavGroupTitle>{group.title}</NavGroupTitle>
                  {group.items.map(item => (
                    <NavItem
                      key={item.key}
                      $active={item.orderKey
                        ? (activeTab === 'orders' && activeOrder === item.orderKey)
                        : item.tab ? activeTab === item.tab : false}
                      onClick={() => goTab(item)}
                    >
                      {item.icon}
                      {item.label}
                    </NavItem>
                  ))}
                </div>
              ))}
            </Nav>

            <AddressCard onClick={() => setActiveTab('addresses')}>
              <div>
                <AddressText>{t('store.profile.addresses')}</AddressText>
                <AddressSub>
                  {addresses.length > 0
                    ? t('store.profile.addressCount').replace('{count}', String(addresses.length))
                    : t('store.profile.addressDesc')}
                </AddressSub>
              </div>
            </AddressCard>
          </div>

          {/* 右：订单状态快捷入口（仅订单页显示）+ 内容区，主切换由左侧 Nav 承担 */}
          <Right>
            {activeTab === 'orders' && (
              <StatusRow>
                {orderTabs.map(tab => (
                  <StatusTile
                    key={tab.key}
                    $active={activeTab === 'orders' && activeOrder === tab.key}
                    onClick={() => { setActiveTab('orders'); setActiveOrder(tab.key) }}
                  >
                    <OrderIcon />
                    {tab.label}
                  </StatusTile>
                ))}
              </StatusRow>
            )}

            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'coupons' && renderCoupons()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'support' && renderSupport()}
            {activeTab === 'reviews' && renderReviews()}
            {activeTab === 'addresses' && renderAddresses()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'password' && renderPassword()}
            {activeTab === 'security' && renderSecurity()}
          </Right>
        </Shell>
      </Container>
    </PageLayout>
  )
}
