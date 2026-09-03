import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../i18n'
import { useUser } from '../../../store/UserContext'
import { publicAPI, type PublicCoupon, type UserCoupon } from '../../../api/public'
import { Color, Spacing, Radius, FontSize, Breakpoint, Shadow } from '../../../theme/tokens'

// 配色对齐 Profile 页（墨黑为主 + 红做点缀，无渐变）
const BRAND = {
  red: Color.primary,
  light: Color.primaryLight,
}

// ── 页签切换：我的优惠券 / 领券中心 ──
type CouponMode = 'coupon' | 'center'

// ── 我的优惠券状态筛选 ──
type CouponStatus = 'available' | 'used' | 'expired'

const STATUS_TABS: { key: CouponStatus; labelKey: string }[] = [
  { key: 'available', labelKey: 'store.coupons.available' },
  { key: 'used', labelKey: 'store.coupons.used' },
  { key: 'expired', labelKey: 'store.coupons.expired' },
]

// ── Styled Components ──

const Module = styled.div``

const ModeTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  border-bottom: 1px solid ${Color.border.light};
  padding-bottom: 12px;
`

const ModeTab = styled.button<{ $active?: boolean }>`
  padding: 7px 18px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid ${props => (props.$active ? BRAND.red : Color.border.medium)};
  background: ${props => (props.$active ? BRAND.red : Color.text.inverse)};
  color: ${props => (props.$active ? Color.text.inverse : Color.text.secondary)};
  font-weight: ${props => (props.$active ? 600 : 400)};
  transition: all 0.15s;

  &:hover {
    border-color: ${BRAND.red};
    color: ${props => (props.$active ? Color.text.inverse : BRAND.red)};
  }
`

const StatusPills = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const StatusPill = styled.button<{ $active?: boolean }>`
  padding: 5px 14px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12.5px;
  border: 1px solid ${({ $active }) => ($active ? BRAND.red : Color.border.medium)};
  background: ${({ $active }) => ($active ? BRAND.red : Color.text.inverse)};
  color: ${({ $active }) => ($active ? Color.text.inverse : Color.text.secondary)};
  transition: all 0.15s;

  &:hover {
    border-color: ${BRAND.red};
    color: ${({ $active }) => ($active ? Color.text.inverse : BRAND.red)};
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${Spacing.xxxl}px 0;
  color: ${Color.text.muted};
  font-size: ${FontSize.base}px;
`

const LoadingState = styled.div`
  text-align: center;
  padding: ${Spacing.xxxl}px 0;
  color: ${Color.text.muted};
  font-size: ${FontSize.base}px;
`

// ── 我的优惠券卡片 ──
const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${Spacing.lg}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const CouponCard = styled.div<{ $dim?: boolean }>`
  position: relative;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  padding: 16px 16px 16px 22px;
  background: ${Color.bg.card};
  overflow: hidden;
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};

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
  font-variant-numeric: tabular-nums;
`

const CouponName = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.body};
  margin-bottom: ${Spacing.xs}px;
`

const CouponMeta = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  line-height: 1.6;
`

const CouponStatusTag = styled.span`
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: ${Color.text.secondary};
  border: 1px solid ${Color.border.medium};
  border-radius: 999px;
  padding: 1px 8px;
  margin-top: ${Spacing.sm}px;
`

// ── 领券中心卡片 ──
const CenterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${Spacing.lg}px;

  @media (max-width: ${Breakpoint.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const CenterCard = styled.div`
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  padding: 18px;
  background: ${Color.bg.card};
  display: flex;
  flex-direction: column;
  gap: ${Spacing.sm}px;
  transition: all 0.15s;

  &:hover {
    box-shadow: ${Shadow.cardHover};
  }
`

const CenterTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`

const CenterPrice = styled.div`
  font-size: ${FontSize.xxl}px;
  font-weight: 700;
  color: ${BRAND.red};
  font-variant-numeric: tabular-nums;
`

const CenterName = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 600;
  color: ${Color.text.body};
`

const CenterMeta = styled.div`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.muted};
  line-height: 1.7;
`

const CenterTags = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const CenterTag = styled.span`
  font-size: 11px;
  color: ${Color.text.secondary};
  border: 1px solid ${Color.border.medium};
  border-radius: 999px;
  padding: 1px 8px;
`

const ClaimBtn = styled.button<{ $claimed?: boolean }>`
  margin-top: auto;
  padding: 8px 0;
  border-radius: ${Radius.sm}px;
  cursor: ${({ $claimed }) => ($claimed ? 'default' : 'pointer')};
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  border: 1px solid ${({ $claimed }) => ($claimed ? Color.border.medium : BRAND.red)};
  background: ${({ $claimed }) => ($claimed ? Color.bg.sunken : BRAND.red)};
  color: ${({ $claimed }) => ($claimed ? Color.text.muted : Color.text.inverse)};
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: ${({ $claimed }) => ($claimed ? Color.bg.sunken : Color.primaryHover)};
  }
`

// ── 工具函数 ──
function discountText(c: PublicCoupon): string {
  return c.discount_type === 'percent' ? `${c.amount}%` : `$${c.amount}`
}

function minSpendText(c: PublicCoupon, t: (k: string) => string): string {
  const min = Number(c.min_amount)
  if (!min || min <= 0) return t('store.coupons.noThreshold')
  return t('store.coupons.minSpendFormat').replace('${amount}', String(min))
}

function statusText(status: CouponStatus, t: (k: string) => string): string {
  if (status === 'used') return t('store.coupons.usedLabel')
  if (status === 'expired') return t('store.coupons.expiredLabel')
  return t('store.coupons.available')
}

export default function CouponsPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()

  const [mode, setMode] = useState<CouponMode>('coupon')
  const [status, setStatus] = useState<CouponStatus>('available')

  // 我的优惠券
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [myLoading, setMyLoading] = useState(false)

  // 领券中心
  const [centerCoupons, setCenterCoupons] = useState<PublicCoupon[]>([])
  const [centerLoading, setCenterLoading] = useState(false)
  const [claiming, setClaiming] = useState<Record<string, boolean>>({})

  const fetchMyCoupons = useCallback(async () => {
    if (!isLoggedIn) return
    setMyLoading(true)
    try {
      const data = await publicAPI.getMyCoupons({ status })
      setMyCoupons(Array.isArray(data) ? data : [])
    } catch {
      setMyCoupons([])
    } finally {
      setMyLoading(false)
    }
  }, [isLoggedIn, status])

  const fetchCenter = useCallback(async () => {
    setCenterLoading(true)
    try {
      const data = await publicAPI.getCouponList()
      setCenterCoupons(Array.isArray(data) ? data : [])
    } catch {
      setCenterCoupons([])
    } finally {
      setCenterLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode === 'coupon') fetchMyCoupons()
  }, [mode, fetchMyCoupons])

  useEffect(() => {
    if (mode === 'center') fetchCenter()
  }, [mode, fetchCenter])

  const claim = async (code: string) => {
    if (!isLoggedIn) {
      const returnPath = window.location.pathname + window.location.search
      navigate('/auth?tab=login&redirect=' + encodeURIComponent(returnPath))
      return
    }
    setClaiming((prev) => ({ ...prev, [code]: true }))
    try {
      await publicAPI.claimCoupon(code)
      await fetchCenter()
      await fetchMyCoupons()
    } catch {
      // 领取失败静默处理（后端会返回具体原因）
    } finally {
      setClaiming((prev) => ({ ...prev, [code]: false }))
    }
  }

  const filteredMy = myCoupons.filter((uc) => uc.status === status)

  return (
    <Module>
      <ModeTabs>
        <ModeTab $active={mode === 'coupon'} onClick={() => setMode('coupon')}>
          {t('store.coupons.myCoupons')}
        </ModeTab>
        <ModeTab $active={mode === 'center'} onClick={() => setMode('center')}>
          {t('store.coupons.centerTitle')}
        </ModeTab>
      </ModeTabs>

      {mode === 'coupon' && (
        <>
          <StatusPills>
            {STATUS_TABS.map((s) => (
              <StatusPill key={s.key} $active={status === s.key} onClick={() => setStatus(s.key)}>
                {t(s.labelKey)}
              </StatusPill>
            ))}
          </StatusPills>

          {myLoading ? (
            <LoadingState>{t('common.loading')}</LoadingState>
          ) : filteredMy.length === 0 ? (
            <EmptyState>
              {status === 'available'
                ? t('store.coupons.noAvailable')
                : status === 'used'
                  ? t('store.coupons.noUsed')
                  : t('store.coupons.noExpired')}
            </EmptyState>
          ) : (
            <CouponGrid>
              {filteredMy.map((uc) => {
                const c = uc.coupon
                const dim = status !== 'available'
                return (
                  <CouponCard key={uc.id} $dim={dim}>
                    <CouponPrice>{discountText(c)}</CouponPrice>
                    <CouponName>{c.name || c.code}</CouponName>
                    <CouponMeta>{minSpendText(c, t)}</CouponMeta>
                    <CouponMeta>
                      {t('store.coupons.expires')}
                      {new Date(c.end_time).toLocaleDateString()}
                    </CouponMeta>
                    <CouponStatusTag>{statusText(status, t)}</CouponStatusTag>
                  </CouponCard>
                )
              })}
            </CouponGrid>
          )}
        </>
      )}

      {mode === 'center' && (
        <>
          {centerLoading ? (
            <LoadingState>{t('store.coupons.centerLoading')}</LoadingState>
          ) : centerCoupons.length === 0 ? (
            <EmptyState>{t('store.coupons.noCoupons')}</EmptyState>
          ) : (
            <CenterGrid>
              {centerCoupons.map((c) => {
                const claimed = claiming[c.code]
                return (
                  <CenterCard key={c.id}>
                    <CenterTop>
                      <div>
                        <CenterPrice>{discountText(c)}</CenterPrice>
                        <CenterName>{c.name || c.code}</CenterName>
                      </div>
                      <CenterTags>
                        {c.stackable && <CenterTag>{t('store.coupons.stackable')}</CenterTag>}
                        {Number(c.min_amount) > 0 && (
                          <CenterTag>{minSpendText(c, t)}</CenterTag>
                        )}
                      </CenterTags>
                    </CenterTop>
                    <CenterMeta>
                      {t('store.coupons.validUntil')} {new Date(c.end_time).toLocaleDateString()}
                    </CenterMeta>
                    <CenterMeta>
                      {t('store.coupons.stockLeft').replace('${count}', String(c.remaining ?? Math.max(0, c.total_count - c.claimed_count)))}
                    </CenterMeta>
                    <ClaimBtn
                      $claimed={claimed}
                      disabled={claimed || !c.claimable}
                      onClick={() => claim(c.code)}
                    >
                      {claimed
                        ? t('store.coupons.claimed')
                        : !c.claimable
                          ? t('store.coupons.claimed')
                          : t('store.coupons.claim')}
                    </ClaimBtn>
                  </CenterCard>
                )
              })}
            </CenterGrid>
          )}
        </>
      )}
    </Module>
  )
}