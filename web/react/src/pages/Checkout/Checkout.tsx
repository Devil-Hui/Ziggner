import { useState, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useNavigate, Navigate } from 'react-router-dom'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Button from '../../components/common/Button/Button'
import { useCart } from '../../store/CartContext'
import { useUser } from '../../store/UserContext'
import { paymentAPI } from '../../api/payment'
import { publicAPI, type UserCoupon } from '../../api/public'
import { useTranslation } from '../../i18n'
import { Color, Radius, Shadow, Layout, Spacing, FontSize, FontWeight, Transition } from '../../theme/tokens'
import { getCheckoutPaymentMethods, type CheckoutPaymentMethod } from './checkoutPaymentMethods'
import {
  buildCheckoutCouponSelection,
  calculateCouponDiscount,
  getSelectableUserCoupons,
} from './checkoutCoupon'

// ── SHEIN 设计令牌 ──────────────────────────────────
const SHEIN = {
  accent: '#e74c3c',
  accentHover: '#c0392b',
  accentLight: '#fde8e8',
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#e8e8e8',
  borderActive: '#e74c3c',
  text: '#222222',
  textSecondary: '#666666',
  textMuted: '#999999',
  success: '#27ae60',
  warning: '#f39c12',
  radius: '12px',
  radiusSm: '8px',
  fontHeading: "'Playfair Display', Georgia, 'Times New Roman', serif",
  fontBody: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const

// ── 动画 ────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

// ── 布局容器 ────────────────────────────────────────
const PageWrapper = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background: ${SHEIN.bg};
  font-family: ${SHEIN.fontBody};
  color: ${SHEIN.text};
  -webkit-font-smoothing: antialiased;
`

const Container = styled.div`
  max-width: 1160px;
  margin: 0 auto;
  padding: 32px 20px 48px;

  @media (max-width: 768px) {
    padding: 16px 12px 32px;
  }
`

const PageTitle = styled.h1`
  font-family: ${SHEIN.fontHeading};
  font-size: 28px;
  font-weight: 700;
  color: ${SHEIN.text};
  margin: 0 0 28px;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    font-size: 22px;
    margin-bottom: 20px;
  }
`

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 5fr 4fr;
  gap: 20px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 100px;

  @media (max-width: 768px) {
    position: static;
  }
`

const CenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 100px;

  @media (max-width: 768px) {
    position: static;
  }
`

// ── 卡片 ────────────────────────────────────────────
const Card = styled.div`
  background: ${SHEIN.card};
  border: 1px solid ${SHEIN.border};
  border-radius: ${SHEIN.radius};
  padding: 24px;
  animation: ${fadeIn} 0.3s ease;

  @media (max-width: 768px) {
    padding: 16px;
    border-radius: ${SHEIN.radiusSm};
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${SHEIN.border};
`

const CardIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${SHEIN.radiusSm};
  background: ${SHEIN.accentLight};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${SHEIN.accent};
  flex-shrink: 0;

  svg { width: 18px; height: 18px; }
`

const CardTitle = styled.h2`
  font-family: ${SHEIN.fontHeading};
  font-size: 17px;
  font-weight: 600;
  color: ${SHEIN.text};
  margin: 0;
  letter-spacing: 0.3px;
`

// ── 表单 ────────────────────────────────────────────
const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 0;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const FormGroup = styled.div`
  margin-bottom: 16px;

  &:last-child { margin-bottom: 0; }

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: ${SHEIN.textSecondary};
    margin-bottom: 6px;
  }

  input, select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid ${SHEIN.border};
    border-radius: ${SHEIN.radiusSm};
    font-size: 14px;
    font-family: ${SHEIN.fontBody};
    color: ${SHEIN.text};
    background: #fafafa;
    transition: border-color ${Transition.fast}, box-shadow ${Transition.fast};
    box-sizing: border-box;

    &::placeholder { color: ${SHEIN.textMuted}; }

    &:focus {
      outline: none;
      border-color: ${SHEIN.accent};
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
      background: #fff;
    }
  }
`

// ── 优惠券 ──────────────────────────────────────────
const CouponOption = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${p => p.$selected ? SHEIN.borderActive : SHEIN.border};
  border-radius: ${SHEIN.radiusSm};
  margin-bottom: 10px;
  cursor: pointer;
  background: ${p => p.$selected ? '#fff5f5' : '#fafafa'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  font-family: ${SHEIN.fontBody};
  transition: all ${Transition.fast};

  &:hover {
    border-color: ${p => p.$selected ? SHEIN.borderActive : '#ccc'};
  }

  &:last-child { margin-bottom: 0; }
`

const CouponLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const CouponCode = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${SHEIN.text};
`

const CouponMeta = styled.span`
  font-size: 12px;
  color: ${SHEIN.textSecondary};
`

const CouponDot = styled.div<{ $active: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${p => p.$active ? SHEIN.accent : '#ccc'};
  background: ${p => p.$active ? SHEIN.accent : 'transparent'};
  flex-shrink: 0;
  transition: all ${Transition.fast};
  position: relative;

  ${p => p.$active && css`
    &::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      background: white;
    }
  `}
`

// ── 支付方式 ────────────────────────────────────────
const PaymentGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

interface PaymentCardProps { $selected: boolean }

const PaymentCard = styled.button<PaymentCardProps>`
  width: 100%;
  padding: 16px;
  border: 2px solid ${p => p.$selected ? SHEIN.borderActive : SHEIN.border};
  border-radius: ${SHEIN.radiusSm};
  background: ${p => p.$selected ? '#fff5f5' : '#fafafa'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: ${SHEIN.fontBody};
  text-align: left;
  transition: all ${Transition.fast};

  &:hover {
    border-color: ${p => p.$selected ? SHEIN.borderActive : '#ccc'};
  }
`

const PaymentIconBox = styled.div<{ $bg: string }>`
  width: 44px;
  height: 44px;
  border-radius: ${SHEIN.radiusSm};
  background: ${p => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 24px; height: 24px; }
`

const PaymentInfo = styled.div`
  flex: 1;
  min-width: 0;

  .name {
    font-weight: 600;
    font-size: 14px;
    color: ${SHEIN.text};
    margin-bottom: 2px;
  }

  .desc {
    font-size: 12px;
    color: ${SHEIN.textSecondary};
    line-height: 1.4;
  }
`

const PaymentCheck = styled.div<{ $active: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid ${p => p.$active ? SHEIN.accent : '#ccc'};
  background: ${p => p.$active ? SHEIN.accent : 'transparent'};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${Transition.fast};

  svg {
    width: 12px;
    height: 12px;
    color: white;
    opacity: ${p => p.$active ? 1 : 0};
  }
`

// ── 订单摘要 ────────────────────────────────────────
const SummaryItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-of-type { border-bottom: none; }
`

const SummaryItemThumb = styled.div<{ $src?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: ${p => p.$src ? `url(${p.$src})` : '#f0f0f0'};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  border: 1px solid ${SHEIN.border};
`

const SummaryItemInfo = styled.div`
  flex: 1;
  min-width: 0;

  .name {
    font-size: 13px;
    font-weight: 500;
    color: ${SHEIN.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .meta {
    font-size: 12px;
    color: ${SHEIN.textMuted};
  }

  .unit-price {
    font-size: 12px;
    color: ${SHEIN.textSecondary};
    margin-top: 2px;
  }
`

const SummaryItemPrice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;

  .subtotal {
    font-size: 14px;
    font-weight: 700;
    color: ${SHEIN.accent};
  }

  .calc {
    font-size: 11px;
    color: ${SHEIN.textMuted};
    margin-top: 2px;
  }
`

const SummaryDivider = styled.div`
  height: 1px;
  background: ${SHEIN.border};
  margin: 12px 0;
`

const SummaryLine = styled.div<{ $highlight?: boolean; $discount?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
  color: ${p => p.$discount ? SHEIN.success : p.$highlight ? SHEIN.accent : SHEIN.textSecondary};

  span:last-child {
    font-weight: ${p => p.$highlight ? 700 : 500};
    color: ${p => p.$discount ? SHEIN.success : p.$highlight ? SHEIN.accent : SHEIN.text};
  }
`

const SummaryTotal = styled(SummaryLine)`
  font-size: 18px;
  font-weight: 700;
  color: ${SHEIN.text};
  padding-top: 12px;
  margin-top: 4px;
  border-top: 2px solid ${SHEIN.text};

  span:last-child {
    font-size: 22px;
    color: ${SHEIN.accent};
  }
`

// ── 安全标识 ────────────────────────────────────────
const SecuritySection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 20px 0 0;
  margin-top: 4px;

  @media (max-width: 768px) {
    gap: 20px;
    flex-wrap: wrap;
  }
`

const SecurityBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${SHEIN.textMuted};

  svg {
    width: 20px;
    height: 20px;
    color: ${SHEIN.success};
    flex-shrink: 0;
  }
`

// ── 加载 & 错误状态 ─────────────────────────────────
const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  backdrop-filter: blur(4px);
`

const LoadingSpinner = styled.div`
  width: 44px;
  height: 44px;
  border: 3px solid ${SHEIN.border};
  border-top-color: ${SHEIN.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const LoadingText = styled.p`
  font-size: 15px;
  color: ${SHEIN.textSecondary};
  margin: 0;
  font-family: ${SHEIN.fontHeading};
`

const SkeletonBlock = styled.div`
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  margin-bottom: 8px;
`

const RedButton = styled.button`
  width: 100%;
  padding: 16px 24px;
  background: ${SHEIN.accent};
  color: #fff;
  border: none;
  border-radius: ${SHEIN.radiusSm};
  font-size: 16px;
  font-weight: 600;
  font-family: ${SHEIN.fontBody};
  cursor: pointer;
  transition: all ${Transition.fast};
  letter-spacing: 0.5px;

  &:hover:not(:disabled) {
    background: ${SHEIN.accentHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.25);
  }
`

const GhostButton = styled.button`
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  color: ${SHEIN.textSecondary};
  border: 1px solid ${SHEIN.border};
  border-radius: ${SHEIN.radiusSm};
  font-size: 14px;
  font-weight: 500;
  font-family: ${SHEIN.fontBody};
  cursor: pointer;
  transition: all ${Transition.fast};
  margin-top: 8px;

  &:hover {
    color: ${SHEIN.text};
    border-color: #ccc;
  }
`

// ── 错误横幅 ────────────────────────────────────────
const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: ${SHEIN.radiusSm};
  margin-bottom: 12px;
  font-size: 13px;
  color: ${SHEIN.accent};

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  button {
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    color: ${SHEIN.accent};
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    font-family: ${SHEIN.fontBody};
    white-space: nowrap;

    &:hover { color: ${SHEIN.accentHover}; }
  }
`

// ── 空购物车 ────────────────────────────────────────
const EmptyCartWrapper = styled.div`
  text-align: center;
  padding: 60px 24px;

  svg {
    width: 64px;
    height: 64px;
    color: ${SHEIN.textMuted};
    margin-bottom: 16px;
  }

  h3 {
    font-family: ${SHEIN.fontHeading};
    font-size: 20px;
    color: ${SHEIN.text};
    margin: 0 0 8px;
  }

  p {
    color: ${SHEIN.textSecondary};
    font-size: 14px;
    margin: 0 0 24px;
  }
`

// ── 内联 SVG 图标 ───────────────────────────────────
const IconLocation = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)

const IconCreditCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)

const IconPayPal = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.612c-.556 0-1.027.4-1.115.956L7.25 20.52l-.174.817z"/>
  </svg>
)

const IconBank = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 21 12 3 21 21"/>
    <line x1="5.5" y1="13" x2="18.5" y2="13"/>
    <line x1="8" y1="17" x2="16" y2="17"/>
  </svg>
)

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
)

// ── 支付方式配置 ────────────────────────────────────
interface PaymentMethodConfig {
  value: string
  label: string
  desc: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    value: 'mock',
    label: 'Payment Simulator',
    desc: 'Development and staging only',
    icon: <IconShield />,
    iconBg: '#111827',
    iconColor: '#fff',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    desc: 'Pay with your PayPal account or credit card via PayPal',
    icon: <IconPayPal />,
    iconBg: '#003087',
    iconColor: '#fff',
  },
  {
    value: 'stripe',
    label: 'Credit / Debit Card',
    desc: 'Visa, Mastercard, American Express, Discover & more',
    icon: <IconCreditCard />,
    iconBg: '#635bff',
    iconColor: '#fff',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    desc: 'Direct bank transfer — processing may take 1-3 business days',
    icon: <IconBank />,
    iconBg: '#2c3e50',
    iconColor: '#fff',
  },
]

const ENABLED_PAYMENT_METHODS = new Set(
  getCheckoutPaymentMethods(import.meta.env.VITE_ENABLE_MOCK_PAYMENT === 'true'),
)
const AVAILABLE_PAYMENT_METHODS = PAYMENT_METHODS.filter(method =>
  ENABLED_PAYMENT_METHODS.has(method.value as CheckoutPaymentMethod),
)

// ── 组件主体 ────────────────────────────────────────
export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const { isLoggedIn, isLoading } = useUser()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // ── 状态 ──
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(
    AVAILABLE_PAYMENT_METHODS[0]?.value as CheckoutPaymentMethod || 'paypal',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)

  useEffect(() => {
    if (isLoading || !isLoggedIn) return
    publicAPI.getMyCoupons()
      .then(data => setCoupons(getSelectableUserCoupons(data)))
      .catch(() => {})
      .finally(() => setCouponsLoading(false))
  }, [isLoading, isLoggedIn])

  // ── 等待登录态恢复 ──
  // getMe() 尚未返回时 isLoggedIn 可能为 false，若此时直接判未登录会误踢已登录用户。
  // 必须先等 isLoading 结束，再决定是否跳转登录。
  if (isLoading) {
    return (
      <PageLayout>
        <PageWrapper>
          <Container>
            <LoadingText>Loading…</LoadingText>
          </Container>
        </PageWrapper>
      </PageLayout>
    )
  }

  // ── 非登录用户禁止访问结算/支付，自动跳转登录 ──
  if (!isLoggedIn) {
    return <Navigate to="/auth?tab=login" replace />
  }

  // ── 价格计算 ──
  const userCoupon = selectedCouponId == null
    ? null
    : coupons.find(c => c.id === selectedCouponId) || null
  const coupon = userCoupon?.coupon || null
  const discount = calculateCouponDiscount(total, coupon)
  const actual = Math.max(0, total - discount)

  // ── 提交订单 ──
  const handlePlaceOrder = async () => {
    if (items.length === 0) return
    setLoading(true)
    setError(null)

    const cartItemIds = items.map(item => item.id)
    const idempotencyKey = `${Date.now()}_${Math.random().toString(36).slice(2)}`

    try {
      const orderRes = await publicAPI.checkout({
        cart_item_ids: cartItemIds,
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: {
          name: shippingName,
          phone: shippingPhone,
          country: 'China',
          region,
          city,
          address_line: address,
        },
        payment_method: paymentMethod,
        ...buildCheckoutCouponSelection(selectedCouponId),
        idempotency_key: idempotencyKey,
      })

      const orderNo = orderRes.order_no
      clearCart()

      const successUrl = `${window.location.origin}/payment/return?success=1&order_no=${orderNo}`
      const cancelUrl = `${window.location.origin}/payment/return?success=0&order_no=${orderNo}`

      const paymentResult = await paymentAPI.create({
        order_no: orderNo,
        method: paymentMethod,
        success_url: successUrl,
        cancel_url: cancelUrl,
      })

      if (paymentResult.pay_url) {
        const payUrl = new URL(paymentResult.pay_url, window.location.origin)
        if (paymentMethod === 'mock') payUrl.searchParams.set('order_no', orderNo)
        window.location.href = payUrl.toString()
      } else {
        setError('Failed to create payment session. Please try again.')
        setLoading(false)
      }
    } catch (err: any) {
      const status = err?.response?.status
      // 未登录 / 会话失效（401/403）：自动跳转登录页，而非停留在错误状态
      if (status === 401 || status === 403) {
        navigate('/auth?tab=login')
        return
      }
      const msg = err?.response?.data?.message || err?.message || t('store.checkout.failed')
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setLoading(false)
    }
  }

  // ── 空购物车 ──
  if (items.length === 0) {
    return (
      <PageLayout>
        <PageWrapper>
          <Container>
            <Card>
              <EmptyCartWrapper>
                <IconCart />
                <h3>Your cart is empty</h3>
                <p>{t('store.checkout.emptyCart')}</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/category')}
                  style={{ minWidth: 200 }}
                >
                  {t('store.checkout.continueShopping')}
                </Button>
              </EmptyCartWrapper>
            </Card>
          </Container>
        </PageWrapper>
      </PageLayout>
    )
  }

  // ── 正常结算页 ──
  return (
    <PageLayout>
      <PageWrapper>
        {/* 加载遮罩 */}
        {loading && (
          <LoadingOverlay>
            <LoadingSpinner />
            <LoadingText>{t('store.orderSummary.processingPayment')}</LoadingText>
          </LoadingOverlay>
        )}

        <Container>
          <PageTitle>{t('store.checkout.title')}</PageTitle>

          <LayoutGrid>
            {/* ──────── 左列：优惠券 + 支付方式 + 收货地址 ──────── */}
            <LeftColumn>
              {/* 优惠券 */}
              <Card>
                <CardHeader>
                  <CardIcon><IconTag /></CardIcon>
                  <CardTitle>{t('store.checkout.coupon')}</CardTitle>
                </CardHeader>

                {couponsLoading ? (
                  <>
                    <SkeletonBlock style={{ width: '100%' }} />
                    <SkeletonBlock style={{ width: '80%' }} />
                    <SkeletonBlock style={{ width: '60%' }} />
                  </>
                ) : coupons.length === 0 ? (
                  <p style={{ color: SHEIN.textMuted, fontSize: 13, margin: 0, textAlign: 'center', padding: '12px 0' }}>
                    No coupons available
                  </p>
                ) : (
                  coupons.map(({ id, coupon: c, status }) => (
                    <CouponOption
                      key={id}
                      $selected={selectedCouponId === id}
                      onClick={() => setSelectedCouponId(selectedCouponId === id ? null : id)}
                    >
                      <CouponLeft>
                        <CouponCode>{c.code}</CouponCode>
                        <CouponMeta>
                          {c.discount_type === 'fixed'
                            ? `$${c.amount} off · min $${parseFloat(c.min_amount || '0')}`
                            : `${c.amount}% off · max $${parseFloat(c.max_discount || '0') || '∞'} discount`}
                        </CouponMeta>
                        <CouponMeta>
                          {`Min $${parseFloat(c.min_amount || '0')} · ${c.max_discount ? `max $${parseFloat(c.max_discount)}` : 'no cap'} · ${status} · expires ${new Date(c.end_time).toLocaleDateString()}`}
                        </CouponMeta>
                      </CouponLeft>
                      <CouponDot $active={selectedCouponId === id} />
                    </CouponOption>
                  ))
                )}

                {!couponsLoading && coupons.length > 0 && (
                  <CouponOption
                    $selected={selectedCouponId === null}
                    onClick={() => setSelectedCouponId(null)}
                    style={{ marginTop: 8, marginBottom: 0 }}
                  >
                    <CouponLeft>
                      <CouponMeta style={{ color: SHEIN.textSecondary }}>
                        {t('store.checkout.noCoupon')}
                      </CouponMeta>
                    </CouponLeft>
                    <CouponDot $active={selectedCouponId === null} />
                  </CouponOption>
                )}
              </Card>

              {/* 支付方式 */}
              <Card>
                <CardHeader>
                  <CardIcon><IconCreditCard /></CardIcon>
                  <CardTitle>{t('store.checkout.paymentMethod')}</CardTitle>
                </CardHeader>
                <PaymentGrid>
                  {AVAILABLE_PAYMENT_METHODS.map(m => (
                    <PaymentCard
                      key={m.value}
                      $selected={paymentMethod === m.value}
                      onClick={() => setPaymentMethod(m.value as CheckoutPaymentMethod)}
                    >
                      <PaymentIconBox $bg={m.iconBg} style={{ color: m.iconColor }}>
                        {m.icon}
                      </PaymentIconBox>
                      <PaymentInfo>
                        <div className="name">{m.label}</div>
                        <div className="desc">{m.desc}</div>
                      </PaymentInfo>
                      <PaymentCheck $active={paymentMethod === m.value}>
                        <IconCheck />
                      </PaymentCheck>
                    </PaymentCard>
                  ))}
                </PaymentGrid>
              </Card>

              {/* 收货地址 */}
              <Card>
                <CardHeader>
                  <CardIcon><IconLocation /></CardIcon>
                  <CardTitle>{t('store.checkout.shippingAddress')}</CardTitle>
                </CardHeader>
                <FormRow>
                  <FormGroup>
                    <label>{t('store.checkout.fullName')}</label>
                    <input placeholder="John Doe" value={shippingName} onChange={e => setShippingName(e.target.value)} />
                  </FormGroup>
                  <FormGroup>
                    <label>{t('store.checkout.phone')}</label>
                    <input placeholder="+86 138-0000-0000" value={shippingPhone} onChange={e => setShippingPhone(e.target.value)} />
                  </FormGroup>
                </FormRow>
                <FormGroup>
                  <label>{t('store.checkout.address')}</label>
                  <input placeholder="Street address, apartment, suite, etc." value={address} onChange={e => setAddress(e.target.value)} />
                </FormGroup>
                <FormRow>
                  <FormGroup>
                    <label>{t('store.checkout.city')}</label>
                    <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                  </FormGroup>
                  <FormGroup>
                    <label>{t('store.checkout.state')}</label>
                    <input placeholder="State / Province" value={region} onChange={e => setRegion(e.target.value)} />
                  </FormGroup>
                </FormRow>
              </Card>
            </LeftColumn>

            {/* ──────── 中列：购物车商品明细 ──────── */}
            <CenterColumn>
              {/* 购物车商品 */}
              <Card>
                <CardHeader>
                  <CardIcon><IconCart /></CardIcon>
                  <CardTitle>{t('store.orderSummary.yourCart').replace('{count}', String(items.length))}</CardTitle>
                </CardHeader>
                {items.map(item => (
                  <SummaryItemRow key={item.id}>
                    <SummaryItemThumb $src={item.image || undefined} />
                    <SummaryItemInfo>
                      <div className="name" title={item.spu_name}>{item.spu_name}</div>
                      <div className="meta">
                        {t('store.orderSummary.qty')}: {item.quantity}
                        {item.spec_values && item.spec_values.length > 0 && (
                          ` · ${item.spec_values.map(sv => `${sv.spec_name}: ${sv.spec_value}`).join(' · ')}`
                        )}
                      </div>
                      <div className="unit-price">
                        ${Number(item.price).toFixed(2)} {t('store.orderSummary.each')}
                      </div>
                    </SummaryItemInfo>
                    <SummaryItemPrice>
                      <span className="subtotal">
                        ${(Number(item.price) * item.quantity).toFixed(2)}
                      </span>
                      <span className="calc">
                        ${Number(item.price).toFixed(2)} × {item.quantity}
                      </span>
                    </SummaryItemPrice>
                  </SummaryItemRow>
                ))}
              </Card>
            </CenterColumn>

            {/* ──────── 右列：订单摘要 ──────── */}
            <RightColumn>
              <Card>
                <CardHeader>
                  <CardTitle style={{ fontSize: 17 }}>{t('store.orderSummary.title')}</CardTitle>
                </CardHeader>

                <SummaryLine>
                  <span>{t('store.orderSummary.subtotalItems').replace('{count}', String(items.length))}</span>
                  <span>${total.toFixed(2)}</span>
                </SummaryLine>

                <SummaryLine>
                  <span>{t('store.checkout.shipping')}</span>
                  <span>{t('store.checkout.free')}</span>
                </SummaryLine>

                {discount > 0 && (
                  <SummaryLine $discount>
                    <span>{t('store.checkout.discount')} ({coupon?.code})</span>
                    <span>-${discount.toFixed(2)}</span>
                  </SummaryLine>
                )}

                <SummaryTotal $highlight>
                  <span>{t('store.checkout.total')}</span>
                  <span>${actual.toFixed(2)}</span>
                </SummaryTotal>

                {error && (
                  <ErrorBanner style={{ marginTop: 16, marginBottom: 0 }}>
                    <IconAlert />
                    <span>{error}</span>
                    <button onClick={handlePlaceOrder}>Retry</button>
                  </ErrorBanner>
                )}

                <RedButton onClick={handlePlaceOrder} disabled={loading} style={{ marginTop: 20 }}>
                  {loading
                    ? t('store.checkout.placingOrder')
                    : t('store.orderSummary.placeOrder').replace('${amount}', actual.toFixed(2))}
                </RedButton>

                <GhostButton onClick={() => navigate('/cart')}>
                  {t('store.checkout.backToCart')}
                </GhostButton>
              </Card>

              <SecuritySection>
                <SecurityBadge><IconLock /><span>SSL Encrypted</span></SecurityBadge>
                <SecurityBadge><IconShield /><span>PCI DSS Compliant</span></SecurityBadge>
                <SecurityBadge><IconShield /><span>Secure Checkout</span></SecurityBadge>
              </SecuritySection>
            </RightColumn>
          </LayoutGrid>
        </Container>
      </PageWrapper>
    </PageLayout>
  )
}
