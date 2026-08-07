import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { publicAPI, type PublicCoupon } from '../../api/public'
import Button from '../../components/common/Button/Button'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useTranslation } from '../../i18n'
import { useUser } from '../../store/UserContext'

export default function CouponShare() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const { t } = useTranslation()
  const [coupon, setCoupon] = useState<PublicCoupon | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    publicAPI.getCouponDetail(code)
      .then(setCoupon)
      .catch(() => setError(t('store.coupons.shareNotFound')))
      .finally(() => setLoading(false))
  }, [code, t])

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
      await publicAPI.claimCoupon(code)
      setCoupon(await publicAPI.getCouponDetail(code))
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
    : String(coupon?.amount ?? '') + ' USD'

  return (
    <PageLayout>
      <main style={{ minHeight: 'calc(100vh - 72px)', display: 'grid', placeItems: 'center', padding: '32px 20px', background: '#f5f5f2' }}>
        <section aria-busy={loading} style={{ width: 'min(100%, 560px)', padding: 32, border: '1px solid #deded8', borderRadius: 8, background: '#fff' }}>
          <p style={{ margin: '0 0 12px', color: '#555', fontSize: 13 }}>{t('store.coupons.shareEyebrow')}</p>
          <h1 style={{ margin: '0 0 12px', fontSize: 32, letterSpacing: 0 }}>{coupon?.name || coupon?.code || t('store.coupons.shareTitle')}</h1>
          {coupon && <p style={{ margin: '0 0 20px', color: '#1248d8', fontSize: 28, fontWeight: 700 }}>{discountText}</p>}
          {coupon && (
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', margin: '0 0 28px' }}>
              <dt>{t('store.coupons.minSpend')}</dt><dd style={{ margin: 0, textAlign: 'right' }}>{coupon.min_amount} USD</dd>
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
