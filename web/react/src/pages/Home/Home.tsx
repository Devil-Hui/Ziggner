import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useProducts, useCategories } from '../../hooks/useProducts'
import { publicAPI, type PublicSKU, type PublicBrand } from '../../api/public'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useTranslation } from '../../i18n'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ProductDetailModal from '../../components/business/ProductDetailModal/ProductDetailModal'
import { useQuickAddModal } from '../../hooks/useQuickAddModal'
import styled, { css, keyframes } from 'styled-components'
import { optionalMediaUrl } from '../../utils/mediaUrl'

/* ───────────────────────────────────────────────────────────
 *  Lumiere-style editorial design system
 *  (cream / ink / clay / forest palette + Playfair Display serif)
 * ─────────────────────────────────────────────────────────── */
const C = {
  cream: '#f7f4ef',
  ink: '#1a1712',
  muted: '#6b6459',
  clay: '#c8623a',
  forest: '#2f4b3f',
  card: '#ffffff',
} as const

const SERIF = "'Playfair Display', Georgia, serif"

// ── Keyframes (mirrors lumiere globals.css) ──
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
`
const marquee = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
`
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-14px); }
`
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

// ── Reveal (IntersectionObserver scroll-in, pure CSS) ──
const RevealBox = styled.div<{ $delay?: number; $shown: boolean }>`
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: ${p => p.$delay ?? 0}ms;
  will-change: opacity, transform;
  ${p => p.$shown && css`
    opacity: 1;
    transform: translateY(0);
  `}
`
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <RevealBox ref={ref} $delay={delay} $shown={shown} className={className}>
      {children}
    </RevealBox>
  )
}

// ── Layout primitives ──
const HomeRoot = styled.div`
  background: ${C.cream};
  color: ${C.ink};
  font-family: ${SERIF};
  -webkit-font-smoothing: antialiased;

  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; }
`

const Shell = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
`

const Eyebrow = styled.p`
  font-family: ui-sans-serif, system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: 0.72rem;
  color: ${C.clay};
  margin: 0;
`

const SectionTitle = styled.h2`
  font-family: ${SERIF};
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.1;
  margin: 0.6rem 0 0;
  color: ${C.ink};
`

const PrimaryBtn = styled.button`
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: ${C.clay};
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 1rem 2.2rem;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s;
  &:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(200, 98, 58, 0.55); }
  &:active { transform: translateY(0) scale(0.98); }
`

const GhostLink = styled.button`
  font-family: ui-sans-serif, system-ui, sans-serif;
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  color: ${C.ink};
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.4rem 0;
  &::after {
    content: '';
    position: absolute;
    left: 0; bottom: 0;
    height: 1.5px; width: 0;
    background: currentColor;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  &:hover::after { width: 100%; }
`

/* ───────────────────────────────────────────────────────────
 *  HERO — full-screen parallax + staggered serif title
 * ─────────────────────────────────────────────────────────── */
const Hero = styled.section`
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  overflow: hidden;
`

const HeroBg = styled.div<{ $offset: number }>`
  position: absolute;
  inset: 0;
  background: ${C.cream};
`

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
`

const HeroEyebrow = styled.p`
  font-family: ui-sans-serif, system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.35em;
  font-size: 0.72rem;
  color: ${C.clay};
  margin: 0 0 1.4rem;
  animation: ${fadeIn} 0.6s ease both;
`

const HeroTitle = styled.h1`
  font-family: ${SERIF};
  font-size: clamp(2.6rem, 6vw, 5.5rem);
  line-height: 1.04;
  font-weight: 600;
  color: ${C.ink};
  margin: 0;
  max-width: 14ch;
  span { display: inline-block; opacity: 0; animation: ${fadeUp} 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
`

const HeroSub = styled.p`
  font-family: ui-sans-serif, system-ui, sans-serif;
  margin: 1.8rem 0 0;
  max-width: 32rem;
  font-size: 1.05rem;
  line-height: 1.7;
  color: ${C.muted};
  animation: ${fadeIn} 0.6s ease both;
  animation-delay: 0.9s;
  opacity: 0;
`

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2.4rem;
  animation: ${fadeIn} 0.6s ease both;
  animation-delay: 1.1s;
  opacity: 0;
`

const ScrollHint = styled.div`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: ${C.ink};
  opacity: 0.4;
  animation: ${float} 6s ease-in-out infinite;
  z-index: 1;
`

/* ───────────────────────────────────────────────────────────
 *  MARQUEE — brand promises ticker
 * ─────────────────────────────────────────────────────────── */
const MarqueeBar = styled.div`
  background: ${C.card};
  color: ${C.muted};
  overflow: hidden;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
`

const MarqueeTrack = styled.div`
  display: flex;
  width: max-content;
  gap: 3rem;
  animation: ${marquee} 28s linear infinite;
  span { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.85rem; letter-spacing: 0.04em; }
`

/* ───────────────────────────────────────────────────────────
 *  FEATURED — product grid with scroll reveal
 * ─────────────────────────────────────────────────────────── */
const Section = styled.section`
  padding: 6rem 0;
`

const SectionHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 3rem;
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem 1.25rem;
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
`

const Card = styled.div`
  position: relative;
  cursor: pointer;
`

const CardImgWrap = styled.div`
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 1rem;
  background: ${C.card};
  box-shadow: 0 2px 10px rgba(26, 23, 18, 0.06);
  transition: box-shadow 0.4s ease;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  ${Card}:hover & img { transform: scale(1.08); }
  ${Card}:hover & { box-shadow: 0 18px 40px -16px rgba(26, 23, 18, 0.3); }
`

const CardBadge = styled.span`
  position: absolute;
  left: 0.75rem;
  top: 0.75rem;
  background: ${C.ink};
  color: ${C.cream};
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.7rem;
  border-radius: 9999px;
  backdrop-filter: blur(4px);
`

const QuickAdd = styled.button`
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  background: ${C.clay};
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 0.7rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  ${Card}:hover & { opacity: 1; transform: translateY(0); }
  @media (hover: none) { opacity: 1; transform: none; }
`

const CardMeta = styled.div`
  padding: 1rem 0.2rem 0;
`

const CardCat = styled.p`
  font-family: ui-sans-serif, system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.65rem;
  color: ${C.muted};
  margin: 0;
`

const CardName = styled.h3`
  font-family: ${SERIF};
  font-size: 1.15rem;
  line-height: 1.3;
  margin: 0.35rem 0 0.4rem;
  color: ${C.ink};
  transition: color 0.3s ease;
  ${Card}:hover & { color: ${C.clay}; }
`

const CardPrice = styled.div`
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  color: ${C.ink};
  font-size: 1rem;
`

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #cfc7ba;
`

/* ───────────────────────────────────────────────────────────
 *  EDITORIAL split (forest philosophy panel)
 * ─────────────────────────────────────────────────────────── */
const ForestPanel = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  border-radius: 1rem;
  overflow: hidden;
  background: ${C.card};
  color: ${C.ink};
  border: 1px solid #e5e7eb;
  @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }
`

const ForestText = styled.div`
  padding: 2.5rem;
  @media (min-width: 768px) { padding: 4rem; }
`

const ForestImg = styled.div`
  position: relative;
  min-height: 12rem;
`

const ForestBtn = styled.button`
  margin-top: 2rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: ${C.ink};
  border: none;
  color: ${C.cream};
  border-radius: 9999px;
  padding: 0.9rem 1.8rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
  &:hover { opacity: 0.85; }
`

/* ───────────────────────────────────────────────────────────
 *  VALUE PROPS
 * ─────────────────────────────────────────────────────────── */
const ValueGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`

const ValueCard = styled.div`
  background: ${C.card};
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 2rem;
  transition: border-color 0.2s ease;
  &:hover { border-color: ${C.ink}33; }
`

const ValueIcon = styled.div`
  font-size: 1.5rem;
  color: ${C.ink};
  margin-bottom: 1rem;
  line-height: 1;
`

const ValueTitle = styled.h3`
  font-family: ${SERIF};
  font-size: 1.5rem;
  margin: 0 0 0.5rem;
  color: ${C.ink};
`

const ValueBody = styled.p`
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: ${C.muted};
  line-height: 1.7;
  margin: 0;
`

/* ───────────────────────────────────────────────────────────
 *  CATEGORY cards (editorial)
 * ─────────────────────────────────────────────────────────── */
const CatGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(2, 1fr);
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`

const CatCard = styled.div`
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 4 / 3;
  background: ${C.card};
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  &:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
  &:hover img { transform: scale(1.04); }
`

const CatName = styled.div`
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 1.25rem;
  background: ${C.ink};
  color: ${C.cream};
  font-family: ${SERIF};
  font-size: 1.15rem;
  text-align: center;
`

/* ───────────────────────────────────────────────────────────
 *  HORIZONTAL scroll (hot products)
 * ─────────────────────────────────────────────────────────── */
const HScroll = styled.div`
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: ${C.ink}33; border-radius: 3px; }
`

const HCard = styled.div`
  flex: 0 0 200px;
  cursor: pointer;
  .himg {
    aspect-ratio: 1;
    border-radius: 1rem;
    overflow: hidden;
    background: ${C.card};
    box-shadow: 0 2px 10px rgba(26, 23, 18, 0.06);
    img { width: 100%; height: 100%; object-fit: contain; transition: transform 0.5s ease; }
  }
  &:hover .himg img { transform: scale(1.05); }
`

const HName = styled.div`
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${C.ink};
  margin: 0.6rem 0 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HPrice = styled.div`
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: ${C.clay};
  font-weight: 600;
`

/* ───────────────────────────────────────────────────────────
 *  BRANDS wall
 * ─────────────────────────────────────────────────────────── */
const BrandWall = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  justify-content: center;
  align-items: center;
`

const BrandItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  min-width: 90px;
`

const BrandLogo = styled.div`
  width: 76px;
  height: 76px;
  border-radius: 9999px;
  background: ${C.card};
  border: 1px solid ${C.ink}1a;
  display: grid;
  place-items: center;
  font-family: ${SERIF};
  font-size: 1.5rem;
  color: ${C.clay};
  transition: box-shadow 0.3s ease;
  ${BrandItem}:hover & { box-shadow: 0 6px 18px -6px rgba(26, 23, 18, 0.3); }
`

const BrandLabel = styled.span`
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.8rem;
  color: ${C.muted};
`

// ── Static content ──
const MARQUEE_ITEMS = [
  'Free shipping over $150',
  'Handmade in small batches',
  '30-day easy returns',
  'Carbon-neutral delivery',
  'Designed to last a lifetime',
]
const VALUE_PROPS = [
  { icon: '✦', title: 'Made to last', body: 'Solid materials and real craftsmanship. Everything we sell is built to outlive trends.' },
  { icon: '❋', title: 'Small batches', body: 'We work with independent makers producing in limited runs, never mass-manufactured.' },
  { icon: '◈', title: 'Considered impact', body: 'Carbon-neutral shipping, recyclable packaging, and materials we can stand behind.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { products, total, loading: productsLoading, error: productsError } = useProducts(1, 20)
  const { categories } = useCategories()
  const { t } = useTranslation()
  const {
    quickAddProductId,
    quickAddOpen,
    openQuickAdd,
    closeQuickAdd,
    handleQuickAddToCart,
  } = useQuickAddModal()
  const [recommendedProducts, setRecommendedProducts] = useState(products)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hotProducts, setHotProducts] = useState<PublicSKU[]>([])
  const [brands, setBrands] = useState<PublicBrand[]>([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    setRecommendedProducts(products)
    setHasMore(products.length < total)
  }, [products, total])

  // Hero parallax
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    publicAPI.getHotProducts().then(d => setHotProducts(d || [])).catch(() => {})
  }, [])
  useEffect(() => {
    publicAPI.getBrandList().then(d => setBrands(d || [])).catch(() => {})
  }, [])

  const categoryProducts = categories.slice(0, 3).map(cat => ({
    category: cat,
    products: products.filter(p => p.category === cat.name).slice(0, 1),
  }))

  const loadMore = useCallback(async () => {
    setIsLoading(true)
    const nextPage = currentPage + 1
    try {
      const response = await publicAPI.getSPUList({ page: nextPage, per_page: 20 })
      const items = response.items || response.results || []
      if (items.length === 0) {
        setHasMore(false)
      } else {
        const newProducts = items.map((spu, i) => ({
          id: spu.id,
          name: spu.name,
          price: parseFloat(spu.min_price || '0') || 0,
          image: spu.main_image || '',
          category: spu.category_name || '',
          description: spu.description || '',
          rating: 0,
          reviews: 0,
          badge: i < 2 ? t('store.home.newBadge') : undefined,
        }))
        setRecommendedProducts(prev => [...prev, ...newProducts])
        setCurrentPage(nextPage)
      }
    } catch {
      setHasMore(false)
    }
    setIsLoading(false)
  }, [currentPage, t])

  const { sentinelRef } = useInfiniteScroll({ hasMore, loading: isLoading, loadMore })

  const handleProductClick = (id: number) => navigate(`/product/${id}`)

  const heroWords = t('store.home.heroTitle').split(' ')

  return (
    <PageLayout>
      <HomeRoot>
        {/* ── HERO ── */}
        <Hero>
          <HeroBg $offset={offset} />
          <HeroInner>
            <HeroEyebrow>Design Studio · Est. 2019</HeroEyebrow>
            <HeroTitle>
              {heroWords.map((w, i) => (
                <span key={i} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                  {w}&nbsp;
                </span>
              ))}
            </HeroTitle>
            <HeroSub>{t('store.home.heroSubtitle')}</HeroSub>
            <HeroActions>
              <PrimaryBtn onClick={() => navigate('/category')}>{t('store.home.shopNow')}</PrimaryBtn>
              <GhostLink onClick={() => navigate('/category')}>Explore the collection →</GhostLink>
            </HeroActions>
          </HeroInner>
          <ScrollHint>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </ScrollHint>
        </Hero>

        {/* ── MARQUEE ── */}
        <MarqueeBar>
          <MarqueeTrack>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3rem' }}>
                {m}
                <span style={{ color: C.clay }}>✦</span>
              </span>
            ))}
          </MarqueeTrack>
        </MarqueeBar>

        {/* ── CATEGORIES ── */}
        {categories.length > 0 && (
          <Section>
            <Shell>
              <Reveal>
                <SectionHead>
                  <div>
                    <Eyebrow>Shop by category</Eyebrow>
                    <SectionTitle>Find your niche</SectionTitle>
                  </div>
                  <GhostLink onClick={() => navigate('/category')}>View all categories →</GhostLink>
                </SectionHead>
              </Reveal>
              <CatGrid>
                {categoryProducts.map(({ category, products: catProducts }, index) => {
                  const img = catProducts[0] ? optionalMediaUrl(catProducts[0].image) : undefined
                  return (
                    <Reveal key={category.id} delay={index * 90}>
                      <CatCard onClick={() => navigate(`/category?cat_id=${category.id}`)}>
                        {img ? <img src={img} alt={category.name} /> : null}
                        <CatName>{category.name}</CatName>
                      </CatCard>
                    </Reveal>
                  )
                })}
              </CatGrid>
            </Shell>
          </Section>
        )}

        {/* ── FEATURED / RECOMMENDED ── */}
        <Section style={{ paddingTop: 0 }}>
          <Shell>
            <Reveal>
              <SectionHead>
                <div>
                  <Eyebrow>Curated selection</Eyebrow>
                  <SectionTitle>{t('store.home.recommended')}</SectionTitle>
                </div>
                <GhostLink onClick={() => navigate('/category')}>View all products →</GhostLink>
              </SectionHead>
            </Reveal>

            {productsLoading && recommendedProducts.length === 0 ? (
              <LoadingState message={t('store.home.loading')} />
            ) : recommendedProducts.length === 0 ? (
              <EmptyState
                title={t('store.home.noProducts')}
                message={productsError ? t('store.home.loadError') : t('store.home.noProductsDesc')}
              />
            ) : (
              <>
                <Grid>
                  {recommendedProducts.map((product, i) => {
                    const imgUrl = optionalMediaUrl(product.image)
                    return (
                      <Reveal key={`rec-${product.id}`} delay={(i % 4) * 90}>
                        <Card onClick={() => handleProductClick(product.id)}>
                          <CardImgWrap>
                            {imgUrl ? (
                              <img src={imgUrl} alt={product.name} loading="lazy" />
                            ) : (
                              <Placeholder>📦</Placeholder>
                            )}
                            {i < 2 && <CardBadge>{t('store.home.newBadge')}</CardBadge>}
                            <QuickAdd
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openQuickAdd(e, product.id)
                              }}
                            >
                              {t('store.productDetailModal.addToCart')}
                            </QuickAdd>
                          </CardImgWrap>
                          <CardMeta>
                            <CardCat>{product.category || 'Ziggner'}</CardCat>
                            <CardName>{product.name}</CardName>
                            <CardPrice>${product.price}</CardPrice>
                          </CardMeta>
                        </Card>
                      </Reveal>
                    )
                  })}
                </Grid>
                {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
                {isLoading && <LoadingState message={t('store.home.loading')} />}
              </>
            )}
          </Shell>
        </Section>

        {/* ── HOT PRODUCTS ── */}
        {hotProducts.length > 0 && (
          <Section style={{ paddingTop: 0 }}>
            <Shell>
              <Reveal>
                <Eyebrow>Trending now</Eyebrow>
                <SectionTitle>{t('store.home.hotProducts').replace('🔥 ', '')}</SectionTitle>
              </Reveal>
              <div style={{ marginTop: '2.5rem' }}>
                <HScroll>
                  {hotProducts.map(sku => {
                    const spuId = Number((sku as any).spu_id || (sku as any).spu || 0)
                    const displayPrice = sku.discount_price ?? sku.price
                    return (
                      <HCard key={sku.id} onClick={() => spuId && navigate(`/product/${spuId}`)}>
                        <div className="himg">
                          {sku.image_url ? (
                            <img src={sku.image_url} alt={sku.name} loading="lazy" />
                          ) : (
                            <span style={{ fontSize: '2.5rem', color: '#ccc', display: 'grid', placeItems: 'center', height: '100%' }}>📦</span>
                          )}
                        </div>
                        <HName>{sku.name}</HName>
                        <HPrice>{displayPrice ? `$${Number(displayPrice).toFixed(2)}` : ''}</HPrice>
                      </HCard>
                    )
                  })}
                </HScroll>
              </div>
            </Shell>
          </Section>
        )}

        {/* ── EDITORIAL (forest) ── */}
        <Section>
          <Shell>
            <Reveal>
              <ForestPanel>
                <ForestText>
                  <Eyebrow style={{ color: `${C.cream}80` }}>The philosophy</Eyebrow>
                  <SectionTitle style={{ color: C.cream, marginTop: '1rem' }}>
                    Fewer things, made <span style={{ fontStyle: 'italic', color: C.clay }}>beautifully</span>.
                  </SectionTitle>
                  <ValueBody style={{ marginTop: '1.5rem', maxWidth: '26rem' }}>
                    We believe a home should be filled slowly, with objects that mean something.
                    Every piece in our collection is chosen for how it feels, how it's made, and how
                    it ages — never for how quickly it can be replaced.
                  </ValueBody>
                  <ForestBtn onClick={() => navigate('/category')}>Discover more →</ForestBtn>
                </ForestText>
                <ForestImg />
              </ForestPanel>
            </Reveal>
          </Shell>
        </Section>

        {/* ── VALUE PROPS ── */}
        <Section style={{ paddingTop: 0 }}>
          <Shell>
            <ValueGrid>
              {VALUE_PROPS.map((v, i) => (
                <Reveal key={v.title} delay={i * 120}>
                  <ValueCard>
                    <ValueIcon>{v.icon}</ValueIcon>
                    <ValueTitle>{v.title}</ValueTitle>
                    <ValueBody>{v.body}</ValueBody>
                  </ValueCard>
                </Reveal>
              ))}
            </ValueGrid>
          </Shell>
        </Section>

        {/* ── BRANDS ── */}
        {brands.length > 0 && (
          <Section style={{ paddingTop: 0 }}>
            <Shell>
              <Reveal>
                <Eyebrow>Trusted labels</Eyebrow>
                <SectionTitle>{t('store.home.brands')}</SectionTitle>
              </Reveal>
              <div style={{ marginTop: '2.5rem' }}>
                <BrandWall>
                  {brands.map(brand => (
                    <BrandItem key={brand.id}>
                      <BrandLogo>{brand.name.charAt(0).toUpperCase()}</BrandLogo>
                      <BrandLabel>{brand.name}</BrandLabel>
                    </BrandItem>
                  ))}
                </BrandWall>
              </div>
            </Shell>
          </Section>
        )}

        <ProductDetailModal
          productId={quickAddProductId}
          isOpen={quickAddOpen}
          onClose={closeQuickAdd}
          onAddToCart={handleQuickAddToCart}
        />
      </HomeRoot>
    </PageLayout>
  )
}
