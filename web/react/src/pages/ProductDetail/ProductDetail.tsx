import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Button from '../../components/common/Button/Button'
import { useCart } from '../../store/CartContext'
import { showMiniCartToast } from '../../components/common/MiniCartToast'
import { openCartDropdown } from '../../utils/cartEvents'
// detail page keeps direct add (selected specs); toast + dropdown still shared
import { useUser } from '../../store/UserContext'
import { useTranslation } from '../../i18n'
import { publicAPI, type PublicSPUDetail } from '../../api/public'
import { reviewAPI, type ReviewItem } from '../../api/review'
import { Color, Radius, Shadow, Layout } from '../../theme/tokens'
import { addProductToCart } from './productCartAction'

const Container = styled.div`
  min-height: calc(100vh - ${Layout.headerHeight}px);
  background-color: ${Color.bg.page};
  padding: 5vh 5vw;
`

const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 2vw 0 calc(7vw + 120px);
  @media (max-width: 768px) { margin-left: 2vw; }
`

const Breadcrumb = styled.div`
  display: flex;
  gap: 0.5em;
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 3vh;
  a { color: #888; text-decoration: none; &:hover { color: ${Color.primary}; }}
`

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3vw;
  margin-bottom: 5vh;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`

const ImageSection = styled.div`
  width: 100%;
  aspect-ratio: 1;
  border-radius: ${Radius.lg}px;
  background: ${Color.bg.card};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: ${Shadow.card};
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const Placeholder = styled.div`
  font-size: 3rem;
  color: ${Color.text.muted};
`

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2vh;
`

const ProductName = styled.h1`
  font-size: 1.75rem;
  font-weight: bold;
  color: #111;
  line-height: 1.4;
`

const BrandTag = styled.span`
  display: inline-block;
  font-size: 0.8rem;
  color: ${Color.primary};
  background: ${Color.primary}10;
  padding: 4px 10px;
  border-radius: 4px;
`

const PriceSection = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  margin: 1vh 0;
`

const PriceValue = styled.span`
  font-size: 2rem;
  font-weight: bold;
  color: ${Color.primary};
`

const ActivityBadge = styled.span`
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
  background: ${Color.primary};
  padding: 3px 10px;
  border-radius: 4px;
  margin-right: 10px;
  align-self: center;
`

const OriginalPrice = styled.span`
  font-size: 0.95rem;
  color: ${Color.text.muted};
  text-decoration: line-through;
  margin-left: 0.6em;
  align-self: center;
`

const SpecSection = styled.div`
  margin-top: 1vh;
`

const SpecLabel = styled.div`
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 0.5vh;
  font-weight: bold;
`

const SpecOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75vw;
`

const SpecOption = styled.button<{ $selected: boolean }>`
  padding: 8px 18px;
  border: 2px solid ${p => p.$selected ? Color.primary : Color.border.medium};
  border-radius: ${Radius.md}px;
  background: ${p => p.$selected ? Color.primary + '10' : Color.bg.card};
  color: ${p => p.$selected ? Color.primary : Color.text.heading};
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
  &:hover { border-color: ${Color.primary}; }
`

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1vw;
  margin-top: 1vh;
`

const QtyBtn = styled.button`
  width: 36px; height: 36px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  font-size: 1.1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  &:hover { border-color: ${Color.primary}; }
`

const QtyInput = styled.input`
  width: 50px; height: 36px;
  text-align: center;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  font-size: 0.95rem;
`

const StockLabel = styled.span`
  font-size: 0.85rem;
  color: ${Color.text.secondary};
`

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: bold;
  color: #111;
  margin-bottom: 2vh;
  padding-bottom: 1vh;
  border-bottom: 1px solid ${Color.border.light};
`

const DescriptionText = styled.p`
  font-size: 0.95rem;
  color: ${Color.text.secondary};
  line-height: 1.8;
`

const SpecTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  th, td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid ${Color.border.light};
  }
  th {
    color: #888;
    font-weight: normal;
    width: 140px;
  }
  td { color: ${Color.text.heading}; }
`

const ReviewCard = styled.div`
  padding: 16px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  margin-bottom: 1vh;
`

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5vh;
  .name { font-weight: bold; font-size: 0.9rem; }
  .date { font-size: 0.8rem; color: #888; }
`

const Stars = styled.div`
  color: #f5a623;
  font-size: 0.9rem;
  margin-bottom: 0.5vh;
`

const ReviewContent = styled.p`
  font-size: 0.9rem;
  color: ${Color.text.secondary};
  line-height: 1.5;
`

const ReviewForm = styled.div`
  margin-top: 2vh;
  padding: 16px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
`

const FormRow = styled.div`
  margin-bottom: 1vh;
  label { display: block; font-size: 0.85rem; color: #555; margin-bottom: 0.3vh; }
  input, textarea, select {
    width: 100%; padding: 8px 12px;
    border: 1px solid ${Color.border.medium};
    border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;
    &:focus { outline: none; border-color: ${Color.primary}; }
  }
  textarea { min-height: 80px; resize: vertical; }
`

const StarSelector = styled.div`
  display: flex; gap: 4px; font-size: 1.4rem; cursor: pointer;
  span { color: #ddd; &.active { color: #f5a623; } }
`

const Msg = styled.p<{ $ok?: boolean }>`
  font-size: 0.85rem;
  color: ${p => p.$ok ? '#2e7d32' : '#e74c3c'};
  margin-top: 0.5vh;
`

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { isLoggedIn } = useUser()
  const { t } = useTranslation()

  const [product, setProduct] = useState<PublicSPUDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({})
  const [qty, setQty] = useState(1)
  const [addedMsg, setAddedMsg] = useState('')

  // Reviews
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewOrderItemId, setReviewOrderItemId] = useState<number | null>(null)
  const [reviewableItems, setReviewableItems] = useState<{ id: number; order_no: string }[]>([])
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewOk, setReviewOk] = useState(false)

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  // ── Derive dynamic spec groups from SKU specs ──
  const specGroups = useMemo(() => {
    if (!product?.skus) return []
    const map: Record<string, Set<string>> = {}
    for (const sku of product.skus) {
      if (sku.spec_values) {
        for (const [key, value] of Object.entries(sku.spec_values)) {
          if (!map[key]) map[key] = new Set()
          map[key].add(value)
        }
      }
    }
    return Object.entries(map).map(([name, values]) => ({ name, values: Array.from(values) }))
  }, [product])

  // Fetch product
  useEffect(() => {
    const pid = Number(id)
    if (!pid) return
    setLoading(true)
    publicAPI.getSPUDetail(pid).then(data => {
      setProduct(data)
      // Auto-select first spec value from derived spec groups
      if (data.skus && data.skus.length > 0) {
        const defaults: Record<string, string> = {}
        for (const sku of data.skus) {
          if (sku.spec_values) {
            for (const [key, value] of Object.entries(sku.spec_values)) {
              if (!(key in defaults)) defaults[key] = value
            }
          }
        }
        setSelectedSpecs(defaults)
      }
    }).catch(() => setProduct(null)).finally(() => setLoading(false))
  }, [id])

  // Record browse history (fire-and-forget, only for logged-in users)
  useEffect(() => {
    const pid = Number(id)
    if (!pid || !isLoggedIn) return
    publicAPI.recordBrowse(pid).catch(() => {})
  }, [id, isLoggedIn])

  // Fetch reviews
  useEffect(() => {
    const pid = Number(id)
    if (!pid) return
    reviewAPI.list(pid).then(data => {
      setReviews(data.results || [])
      setReviewTotal(data.count || 0)
      setAvgRating(data.avg_rating || 0)
    }).catch(() => {})
  }, [id])

  // Fetch reviewable items
  useEffect(() => {
    if (!isLoggedIn) return
    const pid = Number(id)
    if (!pid) return
    reviewAPI.getReviewableItems(pid).then(data => {
      setReviewableItems(data.order_items || [])
    }).catch(() => {})
  }, [id, isLoggedIn])

  // Check favorite status
  useEffect(() => {
    if (!isLoggedIn) return
    const pid = Number(id)
    if (!pid) return
    publicAPI.getFavorites({ page: 1, per_page: 100 }).then(data => {
      const items = data.results || data.items || []
      setIsFavorited(items.some((fav: any) => fav.spu_id === pid))
    }).catch(() => {})
  }, [id, isLoggedIn])

  // Find SKU by selected specs
  const selectedSku = useMemo(() => {
    if (!product?.skus) return null
    if (Object.keys(selectedSpecs).length === 0) return product.skus[0] || null
    return product.skus.find(sku => {
      if (!sku.spec_values) return false
      for (const [name, value] of Object.entries(selectedSpecs)) {
        if (sku.spec_values[name] !== value) return false
      }
      return true
    }) || product.skus[0]
  }, [product, selectedSpecs])

  const price = selectedSku?.discount_price ?? selectedSku?.price ?? '0.00'
  const originalPrice = selectedSku?.price
  const activityPriceVal = selectedSku?.discount_price
  const hasActivity =
    !!activityPriceVal && !!originalPrice && Number(activityPriceVal) < Number(originalPrice)

  const handleToggleFavorite = async () => {
    if (!isLoggedIn) {
      navigate('/auth?tab=login')
      return
    }
    const pid = Number(id)
    if (!pid) return
    setFavLoading(true)
    try {
      if (isFavorited) {
        await publicAPI.removeFavorite(pid)
        setIsFavorited(false)
      } else {
        await publicAPI.addFavorite(pid)
        setIsFavorited(true)
      }
    } catch {
      // silently fail
    } finally {
      setFavLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!selectedSku || !product) return
    const img = selectedSku.image_url || product.main_image || ''
    const specsText = selectedSku.spec_values
      ? Object.entries(selectedSku.spec_values).map(([k, v]) => `${k}: ${v}`).join(' · ')
      : undefined
    try {
      await addProductToCart(addItem, selectedSku.id, qty, () => {
        setAddedMsg(t('store.product.addedToCart'))
        showMiniCartToast({
          name: product.name,
          image: img,
          price: Number(price),
          quantity: qty,
          specsText,
        })
        openCartDropdown({ durationMs: 3500 })
      })
    } catch {
      setAddedMsg(t('common.operationFailed'))
    }
    setTimeout(() => setAddedMsg(''), 2000)
  }

  const handleSubmitReview = async () => {
    const pid = Number(id)
    if (!pid || !reviewOrderItemId) return
    setReviewMsg('')
    try {
      await reviewAPI.create({
        spu_id: pid,
        order_item_id: reviewOrderItemId,
        rating: reviewRating,
        content: reviewContent,
      })
      setReviewMsg(t('store.product.reviewSuccess'))
      setReviewOk(true)
      setReviewContent('')
      // Refresh reviews
      const data = await reviewAPI.list(pid)
      setReviews(data.results || [])
      setReviewTotal(data.count || 0)
      setAvgRating(data.avg_rating || 0)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || t('store.product.reviewFailed')
      setReviewMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setReviewOk(false)
    }
  }

  if (loading) {
    return <PageLayout><Container><Wrapper><p>{t('common.loading')}</p></Wrapper></Container></PageLayout>
  }

  if (!product) {
    return (
      <PageLayout>
        <Container>
          <Wrapper>
            <h1>{t('store.product.notFound')}</h1>
            <Button variant="primary" onClick={() => navigate('/category')}>{t('store.product.backToShop')}</Button>
          </Wrapper>
        </Container>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Container>
        <Wrapper>
          <Breadcrumb>
            <a href="/">{t('store.product.home')}</a> /
            <a href="/category">{t('store.product.allCategories')}</a> /
            <span>{product.name}</span>
          </Breadcrumb>

          <ProductGrid>
            {/* Image */}
            <ImageSection>
              {product.main_image
                ? <img src={product.main_image} alt={product.name} />
                : <Placeholder>📦</Placeholder>
              }
            </ImageSection>

            {/* Info */}
            <InfoSection>
              <div>
                {product.brand_name && <BrandTag>{product.brand_name}</BrandTag>}
                <ProductName>{product.name}</ProductName>
              </div>

              <PriceSection>
                {hasActivity && <ActivityBadge>{t('store.product.activityPrice')}</ActivityBadge>}
                <PriceValue>${Number(price).toFixed(2)}</PriceValue>
                {hasActivity && (
                  <OriginalPrice>{t('store.product.originalPrice')}: ${Number(originalPrice).toFixed(2)}</OriginalPrice>
                )}
              </PriceSection>

              {/* Dynamic Specs — derived from SKU specs */}
              {specGroups.length > 0 && specGroups.map(spec => (
                <SpecSection key={spec.name}>
                  <SpecLabel>{spec.name}</SpecLabel>
                  <SpecOptions>
                    {spec.values.map((val: string) => (
                      <SpecOption
                        key={val}
                        $selected={selectedSpecs[spec.name] === val}
                        onClick={() => setSelectedSpecs(prev => ({ ...prev, [spec.name]: val }))}
                      >
                        {val}
                      </SpecOption>
                    ))}
                  </SpecOptions>
                </SpecSection>
              ))}

              <QuantityRow>
                <SpecLabel>{t('store.product.quantity')}:</SpecLabel>
                <QtyBtn onClick={() => setQty(Math.max(1, qty - 1))}>-</QtyBtn>
                <QtyInput value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
                <QtyBtn onClick={() => setQty(Math.min(selectedSku?.stock || 99, qty + 1))}>+</QtyBtn>
                {selectedSku && <StockLabel>{t('store.product.stock')}: {selectedSku.stock}</StockLabel>}
              </QuantityRow>

              <Button
                variant="primary"
                size="lg"
                style={{ marginTop: '2vh' }}
                onClick={handleAddToCart}
                disabled={!selectedSku || selectedSku.stock < 1}
              >
                {t('store.product.addToCart')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                style={{ marginTop: '1vh' }}
                onClick={handleToggleFavorite}
                disabled={favLoading}
              >
                {favLoading ? '...' : isFavorited ? '♥ Favorited' : '♡ Add to Favorites'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                style={{ marginTop: '1vh' }}
                onClick={() => navigate(`/support?spu_id=${product.id}&spu_name=${encodeURIComponent(product.name)}&spu_image=${encodeURIComponent(product.main_image || '')}&spu_price=${price}`)}
              >
                {t('store.product.contactSupport')}
              </Button>
              {addedMsg && <Msg $ok>{addedMsg}</Msg>}
            </InfoSection>
          </ProductGrid>

          {/* Description */}
          <SectionTitle>{t('store.product.description')}</SectionTitle>
          <DescriptionText>
            {product.description || t('store.product.noDescription')}
          </DescriptionText>

          {/* Specifications */}
          <SectionTitle>{t('store.product.specifications')}</SectionTitle>
          {product.attributes && product.attributes.length > 0 ? (
            <SpecTable>
              <tbody>
                {product.attributes.map((attr: any) => (
                  <tr key={attr.name}>
                    <th>{attr.name}</th>
                    <td>{attr.value}</td>
                  </tr>
                ))}
              </tbody>
            </SpecTable>
          ) : (
            <DescriptionText>{t('store.product.noSpecs')}</DescriptionText>
          )}

          {/* Reviews */}
          <SectionTitle>
            {t('store.product.reviews').replace('{count}', String(reviewTotal))}
            {avgRating > 0 && ` — ${avgRating.toFixed(1)} ★`}
          </SectionTitle>

          {reviews.length === 0 && <DescriptionText>{t('store.product.noReviews')}</DescriptionText>}

          {reviews.map(r => (
            <ReviewCard key={r.id}>
              <ReviewHeader>
                <span className="name">{r.content}</span>
                <span className="date">{new Date(r.created_at).toLocaleDateString()}</span>
              </ReviewHeader>
              <Stars>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Stars>
              <ReviewContent>{r.content}</ReviewContent>
            </ReviewCard>
          ))}

          {/* Review Form (only for logged-in users who purchased) */}
          {isLoggedIn && reviewableItems.length > 0 && (
            <ReviewForm>
              <h3 style={{ marginBottom: '1vh', fontSize: '1rem' }}>{t('store.product.addReview')}</h3>
              <FormRow>
                <label>{t('store.product.reviewPlaceholder')}</label>
                <StarSelector>
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={n <= reviewRating ? 'active' : ''} onClick={() => setReviewRating(n)}>
                      {n <= reviewRating ? '★' : '☆'}
                    </span>
                  ))}
                </StarSelector>
              </FormRow>
              <FormRow>
                <select
                  value={reviewOrderItemId ?? ''}
                  onChange={e => setReviewOrderItemId(Number(e.target.value) || null)}
                >
                  <option value="">{t('store.product.selectOrderItem')}</option>
                  {reviewableItems.map(item => (
                    <option key={item.id} value={item.id}>{item.order_no}</option>
                  ))}
                </select>
              </FormRow>
              <FormRow>
                <textarea
                  placeholder={t('store.product.reviewPlaceholder')}
                  value={reviewContent}
                  onChange={e => setReviewContent(e.target.value)}
                />
              </FormRow>
              <Button
                variant="primary"
                onClick={handleSubmitReview}
                disabled={!reviewOrderItemId || !reviewContent.trim()}
              >
                {t('store.product.reviewSubmit')}
              </Button>
              {reviewMsg && <Msg $ok={reviewOk}>{reviewMsg}</Msg>}
            </ReviewForm>
          )}

          {isLoggedIn && reviewableItems.length === 0 && (
            <DescriptionText>{t('store.product.buyFirst')}</DescriptionText>
          )}
        </Wrapper>
      </Container>
    </PageLayout>
  )
}
