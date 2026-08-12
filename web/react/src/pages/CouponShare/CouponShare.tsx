import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { publicAPI, type PublicCoupon } from '../../api/public'
import Button from '../../components/common/Button/Button'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useTranslation } from '../../i18n'
import { useUser } from '../../store/UserContext'

type ShareCoupon = PublicCoupon & {
  promo_code?: string
  promo_name?: string
  promo_note?: string
}

export default function CouponShare() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const { t } = useTranslation()
  const [coupon, setCoupon] = useState<ShareCoupon | null>(null)
  const [promoMode, setPromoMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setMessage('')
    setPromoMode(false)
    // 先尝试按推广码解析（专属券分享链接），失败回退普通券详情
    publicAPI.getPromoDetail(code)
      .then((data) => {
        if (cancelled) return
        setPromoMode(true)
        setCoupon(data)
      })
      .catch(() => (cancelled ? null : publicAPI.getCouponDetail(code)))
      .then((data) => {
        if (cancelled || !data) return
        setCoupon(data)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('store.coupons.shareNotFound'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [code, t])

  const refresh = async () => {
    setCoupon(promoMode ? await publicAPI.getPromoDetail(code) : await publicAPI.getCouponDetail(code))
  }

  const claim = async () => {
    const returnPath = window.location.pathname + window.location.search
    const loginPath = '/auth?tab=login&redirect=' + encodeURIComponent(returnPath)
    if (!isLoggedIn) {
      navigate(loginPath)
      return
    }
    setClaiming(true)
    setError('')
    try {
      if (promoMode) {
        await publicAPI.claimByPromoCode(code)
      } else {
        await publicAPI.claimCoupon(code)
      }
      await refresh()
      setMessage(t('store.coupons.claimSuccess'))
    } catch (claimError: unknown) {
      const status = (claimError as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        navigate(loginPath)
        return
      }
      setError((claimError as { message?: string })?.message || t('store.coupons.claimFailed'))
    } finally {
      setClaiming(false)
    }
  }

  const discountText = coupon?.discount_type === 'percent'
    ? String(coupon.amount) + '%'
    : String(coupon?.amount ?? '') + ' $'

  return (
    <PageLayout>
      <main style={{ minHeight: 'calc(100vh - 72px)', display: 'grid', placeItems: 'center', padding: '32px 20px', background: '#f5f5f2' }}>
        <section aria-busy={loading} style={{ width: 'min(100%, 560px)', padding: 32, border: '1px solid #deded8', borderRadius: 8, background: '#fff' }}>
          <p style={{ margin: '0 0 12px', color: '#555', fontSize: 13 }}>
            {promoMode && coupon?.promo_name
              ? t('store.coupons.promoEyebrow').replace('{name}', coupon.promo_name)
              : t('store.coupons.shareEyebrow')}
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: 32, letterSpacing: 0 }}>{coupon?.name || coupon?.code || t('store.coupons.shareTitle')}</h1>
          {promoMode && coupon?.promo_note && (
            <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14 }}>{coupon.promo_note}</p>
          )}
          {coupon && <p style={{ margin: '0 0 20px', color: '#1248d8', fontSize: 28, fontWeight: 700 }}>{discountText}</p>}
          {coupon && (
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', margin: '0 0 28px' }}>
              <dt>{t('store.coupons.minSpend')}</dt><dd style={{ margin: 0, textAlign: 'right' }}>{coupon.min_amount} $</dd>
              <dt>{t('store.coupons.expires')}</dt><dd style={{ margin: 0, textAlign: 'right' }}>{new Date(coupon.end_time).toLocaleString()}</dd>
              <dt>{t('store.coupons.remaining')}</dt><dd style={{ margin: 0, textAlign: 'right' }}>{coupon.remaining ?? Math.max(0, coupon.total_count - coupon.claimed_count)}</dd>
            </dl>
          )}
          {loading && <p>{t('common.loading')}</p>}
          {message && <p style={{ color: '#23653a' }}>{message}</p>}
          {error && <p style={{ color: '#b42318' }}>{error}</p>}
          {coupon && (
            <Button type="button" variant="primary" size="lg" disabled={!coupon.claimable || claiming || Boolean(message)} onClick={claim}>
              {claiming ? t('store.coupons.claiming') : t('store.coupons.claimNow')}
            </Button>
          )}
        </section>
      </main>
    </PageLayout>
  )
}
