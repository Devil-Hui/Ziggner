import { useState, useEffect, useCallback, type ReactElement } from 'react'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { Container } from '../../components/layout/PageLayout/shared'
import { Color, Spacing, Radius, FontSize, Breakpoint, Shadow } from '../../theme/tokens'
import Button from '../../components/common/Button/Button'
import { useUser } from '../../store/UserContext'
import { useCurrency } from '../../store/CurrencyContext'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { orderAPI, type OrderSummary, type AfterSaleItem } from '../../api/order'
import { reviewAPI, type ReviewItem } from '../../api/review'
import { publicAPI } from '../../api/public'
import { patch } from '../../api/request'
import CouponsPanel from './components/CouponsPanel'
import SupportPanel from './components/SupportPanel'

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

const RefundIcon = () => (
  <svg {...iconProps}>
    <path d="M3 10h14a4 4 0 0 1 0 8h-3" />
    <path d="M7 6l-4 4 4 4" />
    <path d="M21 18v-1a5 5 0 0 0-5-5" />
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

// 邮箱验证码：输入框 + 发送按钮同一行
const CodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CodeHint = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: ${Color.text.muted};
`

const SecurityHint = styled.p`
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: ${Color.bg.sunken};
  font-size: 12px;
  line-height: 1.6;
  color: ${Color.text.secondary};
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

type ProfileTab = 'orders' | 'aftersale' | 'coupons' | 'history' | 'support' | 'reviews' | 'addresses' | 'notifications' | 'favorites' | 'profile' | 'password'

export default function Profile() {
  const { t } = useTranslation()
  const { user, logout, refreshUser } = useUser()
  const { format } = useCurrency()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 支持从 URL 参数 ?tab=xxx 定位页签（导航/其他页面可深链到具体页签）
  const urlTab = searchParams.get('tab') as ProfileTab | null
  const [activeTab, setActiveTab] = useState<ProfileTab>(urlTab && urlTab in {
    orders: 1, aftersale: 1, coupons: 1, history: 1, support: 1,
    reviews: 1, addresses: 1, notifications: 1, favorites: 1, profile: 1, password: 1,
  } ? urlTab : 'orders')
  // 订单状态筛选：'' = 全部。售后单是独立数据源（AfterSale），走 aftersale tab 而非此处。
  const [activeOrder, setActiveOrder] = useState('')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [afterSales, setAfterSales] = useState<AfterSaleItem[]>([])
  const [afterSalesLoading, setAfterSalesLoading] = useState(false)
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
  // 邮箱验证码二次确认
  const [pwVerifyId, setPwVerifyId] = useState('')
  const [pwCode, setPwCode] = useState('')
  const [pwCodeSending, setPwCodeSending] = useState(false)
  const [pwCodeCountdown, setPwCodeCountdown] = useState(0)
  const [pwEmailMasked, setPwEmailMasked] = useState('')

  // 发送验证码冷却倒计时
  useEffect(() => {
    if (pwCodeCountdown <= 0) return
    const timer = window.setTimeout(() => setPwCodeCountdown(c => c - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [pwCodeCountdown])

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
    // activeOrder 已是合法状态值或 ''（全部），直接透传；不再有 refund/all 特例
    orderAPI.list(activeOrder || undefined, 1).then(data => {
      setOrders(data.results || [])
    }).catch(() => setOrders([])).finally(() => setOrdersLoading(false))
  }, [activeOrder, user, activeTab])

  // 售后单（Refund & Aftersale）：独立数据源，与订单状态互不重叠
  useEffect(() => {
    if (!user || activeTab !== 'aftersale') return
    setAfterSalesLoading(true)
    orderAPI.myAfterSales().then(data => {
      setAfterSales(data.results || [])
    }).catch(() => setAfterSales([])).finally(() => setAfterSalesLoading(false))
  }, [user, activeTab])

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

  // 订单状态页签：单一维度（订单 status）。「退款/售后」是独立数据源，不在此列。
  const orderTabs = [
    { key: '', label: t('store.profile.allOrders') },
    { key: 'pending_payment', label: t('store.profile.pendingPayment') },
    { key: 'paid', label: t('store.profile.paid') },
    { key: 'shipped', label: t('store.profile.pendingShipment') },
    { key: 'delivered', label: t('store.profile.pendingReceipt') },
  ]

  type NavItemDef = { key: string; label: string; icon: ReactElement; tab?: ProfileTab; route?: string }
  const navGroups: { title: string; items: NavItemDef[] }[] = [
    {
      title: t('store.profile.groupOrders'),
      items: [
        // 只保留两个入口：订单（内部再按状态切）与售后（独立数据源）。
        // 旧版在此重复列出 4 个订单状态且共用同一图标，与右侧状态页签构成重复 UI，已移除。
        { key: 'orders', label: t('store.profile.myOrders'), icon: <OrderIcon />, tab: 'orders' },
        { key: 'aftersale', label: t('store.profile.refund'), icon: <RefundIcon />, tab: 'aftersale' },
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
  ]

  const renderOrders = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.myOrders')}</ModuleTitle>

      {ordersLoading ? (
        <EmptyState>{t('common.loading')}</EmptyState>
      ) : orders.length === 0 ? (
        <EmptyState>
          {activeOrder === 'pending_payment' ? t('store.profile.noPendingPayment') :
           activeOrder === 'paid' ? t('store.profile.noPaid') :
           activeOrder === 'shipped' ? t('store.profile.noPendingShipment') :
           activeOrder === 'delivered' ? t('store.profile.noPendingReceipt') :
           t('store.profile.noOrders')}
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

  const renderAfterSales = () => {
    const statusMeta = (status: string) => ({
      pending_review: { label: t('store.profile.afterSalePendingReview'), color: Color.status.warning },
      approved: { label: t('store.profile.afterSaleApproved'), color: Color.status.success },
      rejected: { label: t('store.profile.afterSaleRejected'), color: Color.status.error },
      processing: { label: t('store.profile.afterSaleProcessing'), color: Color.status.warning },
      completed: { label: t('store.profile.afterSaleCompleted'), color: Color.status.success },
    }[status] ?? { label: status, color: Color.text.muted })

    const typeLabel = (type: string) => ({
      return: t('store.profile.afterSaleTypeReturn'),
      exchange: t('store.profile.afterSaleTypeExchange'),
      reship: t('store.profile.afterSaleTypeReship'),
    }[type] ?? type)

    return (
      <ContentCard>
        <ModuleTitle>{t('store.profile.refund')}</ModuleTitle>

        {afterSalesLoading ? (
          <EmptyState>{t('common.loading')}</EmptyState>
        ) : afterSales.length === 0 ? (
          <EmptyState>{t('store.profile.noAfterSales')}</EmptyState>
        ) : (
          afterSales.map(item => {
            const meta = statusMeta(item.status)
            return (
              <OrderItem key={item.id} onClick={() => navigate(`/order/${item.order_no}`)}>
                <OrderItemLeft>
                  <OrderItemNo>{item.after_sale_no}</OrderItemNo>
                  <OrderItemStatus style={{ color: meta.color }}>{meta.label}</OrderItemStatus>
                  <OrderItemMeta>
                    {typeLabel(item.type)} · {t('store.profile.orderNo')} {item.order_no}
                  </OrderItemMeta>
                  <OrderItemMeta>{new Date(item.created_at).toLocaleDateString()}</OrderItemMeta>
                  {item.admin_remark && (
                    <OrderItemMeta>{t('store.profile.adminRemark')}: {item.admin_remark}</OrderItemMeta>
                  )}
                </OrderItemLeft>
                <OrderItemRight>
                  <OrderItemAmount>{format(Number(item.amount))}</OrderItemAmount>
                </OrderItemRight>
              </OrderItem>
            )
          })
        )}
      </ContentCard>
    )
  }

  const renderCoupons = () => (
    <ContentCard>
      <ModuleTitle>{t('store.profile.myCoupons')}</ModuleTitle>
      <CouponsPanel />
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
      <SupportPanel />
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
    if (item.tab) {
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
    const handleSendCode = async () => {
      if (pwCodeCountdown > 0 || pwCodeSending) return
      setPwCodeSending(true)
      try {
        const res = await publicAPI.sendPasswordEmailCode()
        setPwVerifyId(res.verify_id)
        setPwEmailMasked(res.email_masked || user?.email || '')
        setPwCodeCountdown(60)
        alert(t('store.profile.codeSent'))
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        alert(detail || t('store.profile.codeSendFailed'))
      } finally {
        setPwCodeSending(false)
      }
    }

    const handleChangePw = async () => {
      if (!pwOld || !pwNew || !pwConfirm) {
        alert(t('store.profile.fillPasswordFields'))
        return
      }
      if (pwNew !== pwConfirm) {
        alert(t('store.profile.passwordMismatch'))
        return
      }
      if (!pwVerifyId || !pwCode) {
        alert(t('store.profile.needEmailCode'))
        return
      }
      setSavingPw(true)
      try {
        await publicAPI.changePassword({
          old_password: pwOld,
          new_password: pwNew,
          confirm_password: pwConfirm,
          verify_id: pwVerifyId,
          code: pwCode,
        })
        setPwOld('')
        setPwNew('')
        setPwConfirm('')
        setPwCode('')
        setPwVerifyId('')
        setPwEmailMasked('')
        alert(t('store.profile.changePasswordSuccess'))
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        alert(detail || t('store.profile.changePasswordFailed'))
      } finally {
        setSavingPw(false)
      }
    }
    return (
      <ContentCard>
        <ModuleTitle>{t('store.profile.changePassword')}</ModuleTitle>
        <SecurityHint>{t('store.profile.passwordSecurityHint')}</SecurityHint>
        <AddrField>{t('store.profile.oldPassword')}<AddrInput type="password" value={pwOld} onChange={(e) => setPwOld(e.target.value)} /></AddrField>
        <AddrField>{t('store.profile.newPassword')}<AddrInput type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} /></AddrField>
        <AddrField>{t('store.profile.confirmPassword')}<AddrInput type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} /></AddrField>

        {/* 邮箱验证码二次确认：仅凭旧密码不足以改密，需邮箱持有者二次确认 */}
        <AddrField>
          {t('store.profile.emailCode')}
          <CodeRow>
            <AddrInput
              value={pwCode}
              onChange={(e) => setPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('store.profile.emailCodePlaceholder')}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{ flex: 1 }}
            />
            <Button
              variant={pwVerifyId ? 'secondary' : 'primary'}
              size="sm"
              disabled={pwCodeSending || pwCodeCountdown > 0}
              onClick={handleSendCode}
            >
              {pwCodeCountdown > 0
                ? `${pwCodeCountdown}s`
                : pwVerifyId ? t('store.profile.resendCode') : t('store.profile.sendCode')}
            </Button>
          </CodeRow>
        </AddrField>
        {pwEmailMasked && (
          <CodeHint>{t('store.profile.codeSentTo').replace('{email}', pwEmailMasked)}</CodeHint>
        )}

        <div style={{ marginTop: 12 }}>
          <Button variant="primary" size="sm" disabled={savingPw} onClick={handleChangePw}>
            {savingPw ? t('common.loading') : t('store.profile.changePassword')}
          </Button>
        </div>
      </ContentCard>
    )
  }

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
                      $active={item.tab ? activeTab === item.tab : false}
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
            {activeTab === 'aftersale' && renderAfterSales()}
            {activeTab === 'coupons' && renderCoupons()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'support' && renderSupport()}
            {activeTab === 'reviews' && renderReviews()}
            {activeTab === 'addresses' && renderAddresses()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'password' && renderPassword()}
          </Right>
        </Shell>
      </Container>
    </PageLayout>
  )
}
