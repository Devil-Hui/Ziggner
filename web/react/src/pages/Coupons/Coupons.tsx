import styled from 'styled-components'
import { Color } from '../../theme/tokens'
import { useState, useCallback } from 'react'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { Container, Wrapper, Sidebar, MainContent } from '../../components/layout/PageLayout/shared'
import { useCoupons, type DisplayCoupon } from '../../hooks/useCoupons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'

type TabKey = 'available' | 'used' | 'expired'

// ─── Sidebar ───
const SidebarMenu = styled.div``

const MenuItem = styled.div<{ active?: boolean }>`
  padding: 14px 16px;
  margin-bottom: 8px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14.5px;
  color: ${props => props.active ? Color.primary : Color.text.secondary};
  background: ${props => props.active ? Color.primaryLight : 'transparent'};
  font-weight: ${props => props.active ? 600 : 400};
  transition: all 0.2s ease;
  border-left: 3px solid ${props => props.active ? Color.primary : 'transparent'};
  user-select: none;

  &:hover {
    background: ${props => props.active ? Color.primaryLight : '#f7f7f7'};
    color: ${Color.primary};
  }
`

// ─── Tabs ───
const TabsRow = styled.div`
  display: flex;
  gap: 4px;
  background: #ececec;
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 20px;
`

const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => (props.$active ? Color.primary : Color.text.muted)};
  background: ${props => (props.$active ? '#fff' : 'transparent')};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${props => (props.$active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none')};

  &:hover {
    color: ${Color.primary};
  }
`

// ─── Coupon Area ───
const CouponArea = styled.div`
  background: #f7f7f7;
  border-radius: 12px;
  padding: 24px;
`

// ─── 单行横向滚动 ───
const CouponGrid = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 18px;
  overflow-x: auto;
  padding-bottom: 12px;
  scroll-snap-type: x mandatory;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #d8d8d8;
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    overflow-x: visible;
    scroll-snap-type: none;
  }
`

// ════════════════════════════════════════
//   券面 — 左红底金额 + 右白底详情（京东/拼多多满减券）
// ════════════════════════════════════════

const CouponCard = styled.div<{ $disabled?: boolean }>`
  display: flex;
  flex-direction: row;
  flex: 0 0 370px;
  height: 150px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  scroll-snap-align: start;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  opacity: ${props => (props.$disabled ? 0.6 : 1)};
  pointer-events: ${props => (props.$disabled ? 'none' : 'auto')};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.13);
  }

  @media (max-width: 768px) {
    flex: 1 1 auto;
    width: 100%;
    height: 142px;
  }
`

/* ── 左侧：金额区 ── */
const LeftPanel = styled.div<{ $variant?: 'available' | 'used' | 'expired' }>`
  width: 40%;
  min-width: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
  position: relative;
  background: ${props => {
    switch (props.$variant) {
      case 'used': return '#9a9a9a'
      case 'expired': return '#7d7d7d'
      default: return Color.primary
    }
  }};
  color: #fff;

  /* 右边缘半圆缺口（上） */
  &::after {
    content: '';
    position: absolute;
    right: -10px;
    top: -1px;
    width: 20px;
    height: 20px;
    background: #f7f7f7;
    border-radius: 50%;
    z-index: 1;
  }
`

/* 左下角半圆缺口 */
const LeftNotchBottom = styled.div`
  position: absolute;
  right: -10px;
  bottom: -1px;
  width: 20px;
  height: 20px;
  background: #f7f7f7;
  border-radius: 50%;
  z-index: 1;
`

const AmountRow = styled.div`
  display: flex;
  align-items: flex-start;
  line-height: 1;
  z-index: 2;
`

const CurrencySymbol = styled.span`
  font-size: 20px;
  font-weight: 700;
  margin-right: 2px;
  align-self: flex-start;
  margin-top: 7px;
`

const AmountValue = styled.span`
  font-size: 52px;
  font-weight: 900;
  letter-spacing: -2px;
  line-height: 1;
`

/* 红底下方小标签（电商券典型识别元素） */
const LeftSub = styled.div`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 8px;
  z-index: 2;
`

/* ── 右侧：详情区（白底）── */
const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 18px;
  background: #fff;
  position: relative;

  /* 左边缘半圆缺口（上） */
  &::before {
    content: '';
    position: absolute;
    left: -10px;
    top: -1px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    z-index: 1;
  }
`

/* 右下角半圆缺口 */
const RightNotchBottom = styled.div`
  position: absolute;
  left: -10px;
  bottom: -1px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  z-index: 1;
`

/* 中间虚线分割线 */
const SeamLine = styled.div`
  position: absolute;
  left: -10px;
  top: 20px;
  bottom: 20px;
  width: 1px;
  border-left: 2px dashed #e8e8e8;
  z-index: 0;
`

const ConditionText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #222;
  margin-bottom: 10px;
  z-index: 2;
`

const UseButton = styled.button<{ $variant?: 'primary' | 'disabled' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 22px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  align-self: flex-start;
  margin-bottom: 8px;
  z-index: 2;

  background: ${props => {
    switch (props.$variant) {
      case 'primary': return Color.primary
      case 'disabled': return '#ddd'
      default: return 'transparent'
    }
  }};
  color: ${props => (props.$variant === 'primary' || props.$variant === 'ghost') ? '#fff' : '#aaa'};
  border: ${props => (props.$variant === 'ghost' ? '1px solid #ccc' : 'none')};

  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return Color.primaryHover
        case 'ghost': return '#f5f5f5'
        default: return '#ddd'
      }
    }};
    color: ${props => (props.$variant === 'ghost' ? Color.primary : '#fff')};
  }
`

const DateText = styled.div`
  font-size: 11px;
  color: ${Color.text.muted};
  z-index: 2;
`

/* ── 推广码来源 Tag ─── */
const PromoTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  background: ${Color.primaryLight};
  border-radius: 4px;
  font-size: 10.5px;
  color: ${Color.primary};
  max-width: fit-content;
  margin-top: 5px;
  z-index: 2;
`

/* ── Code 复制区 ─── */
const CodeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
`

const CodeDisplay = styled.code`
  font-size: 10.5px;
  color: #ccc;
  background: #fafafa;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;

  &:hover {
    color: ${Color.primary};
    background: ${Color.primaryLight};
  }
`

// ─── 空状态 ───
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: ${Color.text.muted};
`

const EmptyIcon = styled.div`
  width: 58px;
  height: 40px;
  border: 2px dashed #d8d8d8;
  border-radius: 6px;
  margin-bottom: 14px;
  opacity: 0.6;
`

const EmptyText = styled.div`
  font-size: 15px;
`

// ─── 已用/过期斜章 ───
const StatusStamp = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  font-size: 17px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(120, 120, 120, 0.78);
  padding: 5px 26px;
  border-radius: 4px;
  letter-spacing: 4px;
  pointer-events: none;
  z-index: 4;
`

// ════════════════════════════════════════
export default function Coupons() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { coupons } = useCoupons()

  const [activeTab, setActiveTab] = useState<TabKey>('available')

  const activeCoupons = coupons.filter(
    c => ['available', 'returned'].includes(c.status) && new Date(c.expireDate) > new Date()
  )
  const usedCoupons = coupons.filter(c => ['used', 'locked'].includes(c.status))
  const expiredCoupons = coupons.filter(
    c => c.status === 'expired' || new Date(c.expireDate) <= new Date()
  )

  const tabData: Record<TabKey, { label: string; list: DisplayCoupon[] }> = {
    available: { label: t('store.coupons.available'), list: activeCoupons },
    used: { label: t('store.coupons.used'), list: usedCoupons },
    expired: { label: t('store.coupons.expired'), list: expiredCoupons },
  }

  const copyCode = useCallback((code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code).then(() => {
      const el = e.currentTarget as HTMLElement
      const orig = el.textContent!
      el.textContent = t('store.coupons.copied') || 'Copied'
      el.style.color = Color.status.success
      setTimeout(() => {
        el.textContent = orig
        el.style.color = ''
      }, 1500)
    })
  }, [t])

  const handleUse = useCallback(() => {
    navigate('/cart')
  }, [navigate])

  const renderCard = (coupon: DisplayCoupon, index: number) => {
    const isUsed = ['used', 'locked'].includes(coupon.status)
    const isExpired = !isUsed && new Date(coupon.expireDate) <= new Date()

    let variant: 'available' | 'used' | 'expired' = 'available'
    if (isUsed) variant = 'used'
    else if (isExpired) variant = 'expired'

    let btnVariant: 'primary' | 'disabled' | 'ghost' = 'primary'
    let btnLabel = t('store.coupons.useNow') || 'Use Now'
    if (isUsed) {
      btnVariant = 'disabled'
      btnLabel = t('store.coupons.usedLabel') || 'Used'
    } else if (isExpired) {
      btnVariant = 'ghost'
      btnLabel = t('store.coupons.expiredLabel') || 'Expired'
    }

    const statusLabel = isUsed
      ? t('store.coupons.usedLabel')
      : isExpired
        ? t('store.coupons.expiredLabel')
        : null

    return (
      <CouponCard key={index} $disabled={isUsed || isExpired}>
        {statusLabel && <StatusStamp>{statusLabel}</StatusStamp>}

        {/* 左：金额区 */}
        <LeftPanel $variant={variant}>
          <AmountRow>
            <CurrencySymbol>$</CurrencySymbol>
            <AmountValue>{coupon.amount}</AmountValue>
          </AmountRow>
          <LeftSub>{t('store.coupons.couponTag') || 'COUPON'}</LeftSub>
          <LeftNotchBottom />
        </LeftPanel>

        {/* 右：详情区 */}
        <RightPanel>
          <SeamLine />
          <RightNotchBottom />

          {/* 条件 */}
          <ConditionText>
            {t('store.coupons.minSpendFormat', { amount: coupon.minSpend }) || `Min spend $${coupon.minSpend}`}
          </ConditionText>

          {/* CTA 按钮 */}
          <UseButton $variant={btnVariant} onClick={handleUse} disabled={isUsed}>
            {btnLabel}
          </UseButton>

          {/* 有效期 + 推广码/code 行 */}
          {coupon.promoCode ? (
            <PromoTag>
              {t('store.coupons.fromPromo')}
              {coupon.promoCodeName && ` · ${coupon.promoCodeName}`}
              {' '}({coupon.promoCode})
            </PromoTag>
          ) : (
            <DateText>{t('store.coupons.validUntil')} {coupon.expireDate}</DateText>
          )}

          <CodeRow style={{ marginTop: 5 }}>
            <CodeDisplay title={t('store.coupons.clickToCopy')} onClick={(e) => copyCode(coupon.code, e)}>
              {coupon.code}
            </CodeDisplay>
            {coupon.promoCode && (
              <DateText>{t('store.coupons.validUntil')} {coupon.expireDate}</DateText>
            )}
          </CodeRow>
        </RightPanel>
      </CouponCard>
    )
  }

  const currentList = tabData[activeTab].list

  return (
    <PageLayout>
      <Container>
        <Wrapper style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '30px', alignItems: 'start' }}>
          <Sidebar>
            <SidebarMenu>
              <MenuItem onClick={() => navigate('/profile')}>{t('store.coupons.accountInfo')}</MenuItem>
              <MenuItem onClick={() => navigate('/cart')}>{t('store.coupons.myOrders')}</MenuItem>
              <MenuItem active>{t('store.coupons.myCoupons')}</MenuItem>
              <MenuItem onClick={() => navigate('/history')}>{t('store.coupons.recentlyViewed')}</MenuItem>
            </SidebarMenu>
          </Sidebar>

          <MainContent>
            <CouponArea>
              {/* Tab 切换 */}
              <TabsRow>
                {(Object.keys(tabData) as TabKey[]).map(key => (
                  <Tab key={key} $active={activeTab === key} onClick={() => setActiveTab(key)}>
                    {tabData[key].label} ({tabData[key].list.length})
                  </Tab>
                ))}
              </TabsRow>

              {/* 券面列表 */}
              {currentList.length > 0 ? (
                <CouponGrid>{currentList.map((c, i) => renderCard(c, i))}</CouponGrid>
              ) : (
                <EmptyState>
                  <EmptyIcon />
                  <EmptyText>
                    {activeTab === 'available' && (t('store.coupons.noAvailable') || 'No available coupons')}
                    {activeTab === 'used' && (t('store.coupons.noUsed') || 'No used coupons')}
                    {activeTab === 'expired' && (t('store.coupons.noExpired') || 'No expired coupons')}
                  </EmptyText>
                </EmptyState>
              )}
            </CouponArea>
          </MainContent>
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
