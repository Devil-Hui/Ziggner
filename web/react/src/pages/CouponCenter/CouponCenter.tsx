import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Color } from '../../theme/tokens'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { Container, Wrapper, MainContent } from '../../components/layout/PageLayout/shared'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import { useUser } from '../../store/UserContext'
import { useCurrency } from '../../store/CurrencyContext'
import { publicAPI, type PublicCoupon } from '../../api/public'

// ─── Hero ───
const Hero = styled.div`
  text-align: center;
  padding: 36px 16px 8px;
`

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: ${Color.text.primary};
`

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${Color.text.secondary};
`

// ─── Grid ───
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
  padding: 24px 8px 8px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 16px 0;
  }
`

// ════════════════════════════════════════
//   券面 — 左金额区 + 右详情（满减/折扣券）
// ════════════════════════════════════════
const CenterCard = styled.div`
  display: flex;
  flex-direction: row;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border};
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`

const Left = styled.div`
  width: 38%;
  min-width: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: ${Color.text.inverse};
  background: linear-gradient(135deg, ${Color.primary}, ${Color.primaryDark || Color.primary});
  position: relative;

  /* 右边缘半圆缺口 */
  &::after {
    content: '';
    position: absolute;
    right: -9px;
    top: -9px;
    width: 18px;
    height: 18px;
    background: ${Color.bg};
    border-radius: 50%;
  }
  &::before {
    content: '';
    position: absolute;
    right: -9px;
    bottom: -9px;
    width: 18px;
    height: 18px;
    background: ${Color.bg};
    border-radius: 50%;
  }
`

const Amount = styled.div`
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
`

const AmountUnit = styled.div`
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
  letter-spacing: 1px;
`

const Right = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 14px 16px;
  gap: 4px;
  min-width: 0;
`

const CName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${Color.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CMeta = styled.div`
  font-size: 12.5px;
  color: ${Color.text.secondary};
`

const CBottom = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
`

const CStack = styled.span`
  font-size: 12px;
  color: ${Color.text.muted};
  flex: 1;
`

const StackBadge = styled.span`
  font-size: 11px;
  color: ${Color.primary};
  border: 1px solid ${Color.primary};
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
`

const ClaimBtn = styled.button<{ $claimed?: boolean; $loading?: boolean }>`
  flex-shrink: 0;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 20px;
  cursor: ${props => (props.$claimed ? 'default' : 'pointer')};
  color: ${Color.text.inverse};
  background: ${props => (props.$claimed ? Color.border.dark : Color.primary)};
  transition: all 0.2s ease;
  opacity: ${props => (props.$loading ? 0.7 : 1)};

  &:hover {
    background: ${props => (props.$claimed ? Color.border.dark : Color.primaryDark || Color.primary)};
  }
  &:disabled {
    cursor: default;
  }
`

// ─── States ───
const StateBox = styled.div`
  text-align: center;
  padding: 80px 16px;
  color: ${Color.text.secondary};
  font-size: 15px;
`

const Footnote = styled.div`
  text-align: center;
  padding: 8px 0 40px;
`

const LinkBtn = styled.button`
  background: none;
  border: none;
  color: ${Color.primary};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;

  &:hover {
    text-decoration: underline;
  }
`

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 12px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: ${Color.text.inverse};
  background: ${props => (props.$type === 'success' ? Color.primary : Color.status.error)};
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  animation: couponToastIn 0.25s ease;

  @keyframes couponToastIn {
    from { opacity: 0; transform: translate(-50%, -10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`

export default function CouponCenter() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const { format } = useCurrency()

  const [coupons, setCoupons] = useState<PublicCoupon[]>([])
  const [claimedCodes, setClaimedCodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [claimingCode, setClaimingCode] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const list = await publicAPI.getCouponList()
      setCoupons(Array.isArray(list) ? list : [])
      if (isLoggedIn) {
        try {
          const mine = await publicAPI.getMyCoupons()
          if (Array.isArray(mine)) {
            setClaimedCodes(new Set(mine.map(u => u.coupon.code)))
          }
        } catch {
          /* 已领状态非关键，忽略 */
        }
      }
    } catch {
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    load()
  }, [load])

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 2600)
  }

  const handleClaim = async (code: string) => {
    if (!isLoggedIn) {
      navigate('/auth?tab=login')
      return
    }
    if (claimedCodes.has(code) || claimingCode) return
    setClaimingCode(code)
    try {
      await publicAPI.claimCoupon(code)
      setClaimedCodes(prev => new Set(prev).add(code))
      setCoupons(prev =>
        prev.map(c => (c.code === code ? { ...c, claimed_count: c.claimed_count + 1 } : c)),
      )
      showNotice('success', t('store.coupons.claimSuccess'))
    } catch (err: any) {
      showNotice('error', err?.message || t('store.coupons.claimFailed'))
    } finally {
      setClaimingCode(null)
    }
  }

  const remainingOf = (c: PublicCoupon) => Math.max(0, c.total_count - c.claimed_count)

  const renderCard = (c: PublicCoupon) => {
    const remaining = remainingOf(c)
    const claimed = claimedCodes.has(c.code)
    const isPercent = c.discount_type === 'percent'
    const minAmount = Number(c.min_amount) || 0
    const isClaiming = claimingCode === c.code
    const btnLabel = claimed
      ? t('store.coupons.claimed')
      : !isLoggedIn
        ? t('store.coupons.loginToClaim')
        : isClaiming
          ? t('store.coupons.claiming')
          : t('store.coupons.claim')

    return (
      <CenterCard key={c.code}>
        <Left>
          <Amount>{isPercent ? `${c.amount}%` : format(Number(c.amount))}</Amount>
          <AmountUnit>OFF</AmountUnit>
        </Left>
        <Right>
          <CName>{c.name || c.code}</CName>
          <CMeta>
            {minAmount > 0
              ? t('store.coupons.minSpendFormat', { amount: minAmount })
              : t('store.coupons.noThreshold')}
          </CMeta>
          <CMeta>
            {t('store.coupons.validUntil')} {c.end_time?.split('T')[0]}
          </CMeta>
          <CBottom>
            <CStack>{t('store.coupons.stockLeft', { count: remaining })}</CStack>
            {c.stackable && <StackBadge>{t('store.coupons.stackable')}</StackBadge>}
            <ClaimBtn
              $claimed={claimed}
              $loading={isClaiming}
              disabled={claimed || isClaiming}
              onClick={() => handleClaim(c.code)}
            >
              {btnLabel}
            </ClaimBtn>
          </CBottom>
        </Right>
      </CenterCard>
    )
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <MainContent>
            <Hero>
              <Title>{t('store.coupons.centerTitle')}</Title>
              <Subtitle>{t('store.coupons.centerSubtitle')}</Subtitle>
            </Hero>

            {loading ? (
              <StateBox>{t('store.coupons.centerLoading')}</StateBox>
            ) : coupons.length === 0 ? (
              <StateBox>{t('store.coupons.noCoupons')}</StateBox>
            ) : (
              <Grid>{coupons.map(renderCard)}</Grid>
            )}

            {!loading && coupons.length > 0 && (
              <Footnote>
                <LinkBtn onClick={() => navigate('/coupons')}>
                  {t('store.coupons.goMyCoupons')}
                </LinkBtn>
              </Footnote>
            )}
          </MainContent>
        </Wrapper>
      </Container>

      {notice && <Toast $type={notice.type}>{notice.text}</Toast>}
    </PageLayout>
  )
}
