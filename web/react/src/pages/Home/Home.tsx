import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useProducts, useCategories } from '../../hooks/useProducts'
import { publicAPI, type PublicSKU, type PublicBrand } from '../../api/public'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useTranslation } from '../../i18n'
import { zIndex } from '../../styles/zIndex'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import styled from 'styled-components'
import { Color, Radius, FontSize, Spacing } from '../../theme/tokens'

const BannerSection = styled.section`
  display: flex;
  padding: 2vw 0;
  gap: 2vw;
  max-width: 1200px;
  margin-left: calc(7vw + 120px);
  margin-right: 2vw;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-left: 2vw;
  }
`

const Carousel = styled.div`
  flex: 2;
  position: relative;
  background: linear-gradient(135deg, ${Color.primary} 0%, ${Color.primaryDark} 100%);
  border-radius: ${Radius.md}px;
  overflow: hidden;
  min-height: 350px;
  height: clamp(280px, 35vh, 500px);
  display: flex;
  align-items: center;
  justify-content: center;
`

const CarouselSlide = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: ${Color.text.inverse};
  padding: 24px;
`

const HeroTitle = styled.h1`
  font-size: clamp(24px, 3vw, 40px);
  font-weight: 700;
  margin-bottom: 12px;
`

const HeroSubtitle = styled.p`
  font-size: clamp(14px, 1.5vw, 18px);
  opacity: 0.9;
  margin-bottom: 24px;
  max-width: 500px;
`

const HeroCTA = styled.button`
  background: ${Color.text.inverse};
  color: ${Color.primary};
  border: none;
  padding: 12px 32px;
  border-radius: ${Radius.sm}px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
`

const CarouselNav = styled.div`
  position: absolute;
  bottom: 16px;
  display: flex;
  gap: 8px;
`

const Dot = styled.button<{ $active?: boolean }>`
  width: 10px; height: 10px;
  border-radius: 50%;
  background: ${({ $active }) => $active ? Color.text.inverse : 'rgba(255,255,255,0.4)'};
  border: none;
  cursor: pointer;
  padding: 0;
`

const RightBanners = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1vw;
`

const SmallBanner = styled.div`
  background-color: ${Color.border.medium};
  border-radius: ${Radius.md}px;
  min-height: 170px;
  height: clamp(150px, 16vh, 250px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${Color.text.secondary};
`

const CategorySection = styled.section`
  max-width: 1200px;
  margin: 2vw 2vw 2vw calc(7vw + 120px);
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5vw;

  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    margin-left: 2vw;
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`

const CategoryCard = styled.div`
  background: ${Color.bg.card};
  border-radius: 10px;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  min-height: 340px;
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.is-fixed .star-fix,
  &:hover .star-fix {
    color: #ffca28;
  }
  
  &:hover .stack-item {
    position: static !important;
    transform: none !important;
  }
`

const StarFix = styled.div`
  position: absolute;
  top: 1vw;
  left: 1vw;
  z-index: ${zIndex.content};
  cursor: pointer;
  color: ${Color.border.medium};
  font-size: 1.5rem;
  transition: color 0.3s ease;
`

const CategoryImgContainer = styled.div`
  flex-grow: 1;
  position: relative;
  background: ${Color.primaryLight};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1vw;
`

const StackItem = styled.div<{ $isFixed: boolean }>`
  position: ${props => props.$isFixed ? 'static' : 'absolute'};
  width: ${props => props.$isFixed ? '140px' : '120px'};
  height: ${props => props.$isFixed ? '180px' : '160px'};
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-origin: bottom center;
  overflow: hidden;
  
  ${props => !props.$isFixed && `
    &:nth-child(1) {
      transform: rotate(-30deg) translate(-10px, 10px);
    }
    
    &:nth-child(2) {
      transform: rotate(0deg);
    }
    
    &:nth-child(3) {
      transform: rotate(30deg) translate(10px, 10px);
    }
  `}
`

const StackItemImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: ${Color.primaryLight};
`

const StackItemName = styled.div`
  font-size: 0.5rem;
  text-align: center;
  padding: 2px;
  color: ${Color.primaryHover};
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
`

const CategoryName = styled.div`
  padding: 2vh;
  text-align: center;
  font-weight: bold;
  border-top: 1px solid ${Color.border.light};
  background: ${Color.bg.card};
  font-size: 1.1rem;
`

const ProductCard = styled.div`
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  cursor: pointer;
  position: relative;
`

const ProductImg = styled.div`
  height: 220px;
  background: ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`

const ProductInfo = styled.div`
  padding: 1vh;
`

const ProductName = styled.div`
  text-align: center;
  font-size: 0.9rem;
  margin-bottom: 0.5vh;
`

const PriceContainer = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1vw;
`

const CurrentPrice = styled.span`
  color: #e74c3c;
  font-size: 1.1rem;
  font-weight: bold;
`

const OriginalPrice = styled.span`
  color: ${Color.text.muted};
  font-size: 0.85rem;
  text-decoration: line-through;
`

const RecommendedSection = styled.section`
  max-width: 1200px;
  margin: 2vw 2vw 2vw calc(7vw + 120px);
  padding: 0;

  @media (max-width: 768px) {
    margin-left: 2vw;
  }
`

const RecommendedTitle = styled.h2`
  font-size: 1rem;
  font-weight: 500;
  color: #888;
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  display: block;
`

const RecommendedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2vw;
  margin-top: 24px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`

// ── Hot Products Section ──

const HotSection = styled.section`
  max-width: 1200px;
  margin: 2vw 2vw 2vw calc(7vw + 120px);
  padding: 0;

  @media (max-width: 768px) {
    margin-left: 2vw;
  }
`

const HotTitle = styled.h2`
  font-size: ${FontSize.lg}px;
  font-weight: bold;
  color: ${Color.text.heading};
  margin-bottom: 2vh;
`

const HotScroll = styled.div`
  display: flex;
  gap: 1.5vw;
  overflow-x: auto;
  padding-bottom: 1vh;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${Color.border.medium};
    border-radius: ${Radius.sm}px;
  }
  &::-webkit-scrollbar-track {
    background: ${Color.bg.page};
  }
`

const HotCard = styled.div`
  flex: 0 0 200px;
  background: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`

const HotCardImg = styled.div`
  height: 160px;
  background: ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
  }
`

const HotCardInfo = styled.div`
  padding: 10px;
`

const HotCardName = styled.div`
  font-size: ${FontSize.sm}px;
  font-weight: 500;
  color: ${Color.text.body};
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HotCardPrice = styled.div`
  color: #e74c3c;
  font-weight: bold;
  font-size: ${FontSize.base}px;
`

// ── Brand Section ──

const BrandSection = styled.section`
  max-width: 1200px;
  margin: 2vw 2vw 2vw calc(7vw + 120px);
  padding: 0;

  @media (max-width: 768px) {
    margin-left: 2vw;
  }
`

const BrandTitle = styled.h2`
  font-size: ${FontSize.lg}px;
  font-weight: bold;
  color: ${Color.text.heading};
  margin-bottom: 2vh;
`

const BrandScroll = styled.div`
  display: flex;
  gap: 2.5vw;
  overflow-x: auto;
  padding: 1vh 0;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${Color.border.medium};
    border-radius: ${Radius.sm}px;
  }
  &::-webkit-scrollbar-track {
    background: ${Color.bg.page};
  }
`

const BrandCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${Spacing.sm}px;
  cursor: pointer;
  min-width: 100px;
`

const BrandLogo = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  color: ${Color.primary};
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

const BrandName = styled.span`
  font-size: ${FontSize.sm}px;
  color: ${Color.text.body};
  text-align: center;
`

export default function Home() {
  const navigate = useNavigate()
  const { products, total, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts(1, 20)
  const { categories, loading: categoriesLoading } = useCategories()
  const { t } = useTranslation()
  const [fixedCards, setFixedCards] = useState<number[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState(products)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hotProducts, setHotProducts] = useState<PublicSKU[]>([])
  const [brands, setBrands] = useState<PublicBrand[]>([])

  // 当 API 数据返回后更新推荐列表
  useEffect(() => {
    setRecommendedProducts(products);
    setHasMore(products.length < total);
  }, [products, total]);

  // 按分类名分组商品（取前 3 个分类，每个分类取前 3 个商品）
  const categoryProducts = categories.slice(0, 3).map(cat => {
    const items = products.filter(p => p.category === cat.name).slice(0, 3)
    return { category: cat, products: items }
  })

  // 获取热销商品
  useEffect(() => {
    publicAPI.getHotProducts()
      .then(data => setHotProducts(data || []))
      .catch(() => {})
  }, [])

  // 获取品牌列表
  useEffect(() => {
    publicAPI.getBrandList()
      .then(data => setBrands(data || []))
      .catch(() => {})
  }, [])

  const toggleFix = (index: number) => {
    setFixedCards(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

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
  }, [currentPage])

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: isLoading,
    loadMore,
  })

  const handleProductClick = (id: number) => {
    navigate(`/product/${id}`)
  }

  return (
    <PageLayout>
      
      <BannerSection>
        <Carousel>
          <CarouselSlide>
            <HeroTitle>{t('store.home.heroTitle')}</HeroTitle>
            <HeroSubtitle>{t('store.home.heroSubtitle')}</HeroSubtitle>
            <HeroCTA onClick={() => navigate('/category')}>
              {t('store.home.shopNow')}
            </HeroCTA>
          </CarouselSlide>
          <CarouselNav>
            <Dot $active />
            <Dot />
            <Dot />
          </CarouselNav>
        </Carousel>
        <RightBanners>
          <SmallBanner>{t('store.home.bannerNew')}</SmallBanner>
          <SmallBanner>{t('store.home.bannerSale')}</SmallBanner>
        </RightBanners>
      </BannerSection>
      
      <CategorySection>
        {categoryProducts.map(({ category, products: catProducts }, index) => {
          const isFixed = fixedCards.includes(index)
          return (
            <CategoryCard 
              key={category.id} 
              className={isFixed ? 'is-fixed' : ''}
              onClick={() => navigate(`/category?cat_id=${category.id}`)}
            >
              <StarFix className="star-fix" onClick={(e) => { e.stopPropagation(); toggleFix(index) }}>
                {isFixed ? '★' : '☆'}
              </StarFix>
              <CategoryImgContainer>
                {catProducts.length > 0 ? (
                  catProducts.map((p, _i) => (
                    <StackItem key={p.id} className="stack-item" $isFixed={isFixed}>
                      {p.image ? (
                        <StackItemImg src={p.image} alt={p.name} />
                      ) : (
                        <StackItemName>{p.name}</StackItemName>
                      )}
                    </StackItem>
                  ))
                ) : (
                  <>
                    <StackItem className="stack-item" $isFixed={isFixed}>
                      <StackItemName>{category.name}</StackItemName>
                    </StackItem>
                    <StackItem className="stack-item" $isFixed={isFixed}>
                      <StackItemName>{category.name}</StackItemName>
                    </StackItem>
                    <StackItem className="stack-item" $isFixed={isFixed}>
                      <StackItemName>{category.name}</StackItemName>
                    </StackItem>
                  </>
                )}
              </CategoryImgContainer>
              <CategoryName>{category.name}</CategoryName>
            </CategoryCard>
          )
        })}
      </CategorySection>
      
      {/* Hot Products */}
      {hotProducts.length > 0 && (
        <HotSection>
          <HotTitle>{t('store.home.hotProducts')}</HotTitle>
          <HotScroll>
            {hotProducts.map(sku => {
              const spuId = (sku as any).spu_id || (sku as any).spu
              const displayPrice = sku.discount_price ?? sku.price
              return (
                <HotCard
                  key={sku.id}
                  onClick={() => spuId && navigate(`/product/${spuId}`)}
                >
                  <HotCardImg>
                    {sku.image_url ? (
                      <img src={sku.image_url} alt={sku.name} />
                    ) : (
                      <span style={{ fontSize: '2rem', color: '#ccc' }}>📦</span>
                    )}
                  </HotCardImg>
                  <HotCardInfo>
                    <HotCardName>{sku.name}</HotCardName>
                    <HotCardPrice>
                      {displayPrice ? `$${Number(displayPrice).toFixed(2)}` : ''}
                    </HotCardPrice>
                  </HotCardInfo>
                </HotCard>
              )
            })}
          </HotScroll>
        </HotSection>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <BrandSection>
          <BrandTitle>{t('store.home.brands')}</BrandTitle>
          <BrandScroll>
            {brands.map(brand => (
              <BrandCard key={brand.id}>
                <BrandLogo>
                  {brand.name.charAt(0).toUpperCase()}
                </BrandLogo>
                <BrandName>{brand.name}</BrandName>
              </BrandCard>
            ))}
          </BrandScroll>
        </BrandSection>
      )}
      
      <RecommendedSection>
        <RecommendedTitle>{t('store.home.recommended')}</RecommendedTitle>
        {productsLoading && recommendedProducts.length === 0 ? (
          <LoadingState message={t('store.home.loading')} />
        ) : recommendedProducts.length === 0 ? (
          <EmptyState
            title={t('store.home.noProducts')}
            message={productsError ? t('store.home.loadError') : t('store.home.noProductsDesc')}
          />
        ) : (
          <>
            <RecommendedGrid>
              {recommendedProducts.map(product => (
                <ProductCard key={`rec-${product.id}`} onClick={() => handleProductClick(product.id)}>
                  <ProductImg>
                    <img src={product.image} alt={product.name} style={{ maxHeight: '100%' }} />
                  </ProductImg>
                  <ProductInfo>
                    <ProductName>{product.name}</ProductName>
                    <PriceContainer>
                      <CurrentPrice>${product.price}</CurrentPrice>
                      {product.originalPrice && <OriginalPrice>${product.originalPrice}</OriginalPrice>}
                    </PriceContainer>
                  </ProductInfo>
                </ProductCard>
              ))}
            </RecommendedGrid>
            {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
            {isLoading && <LoadingState message={t('store.home.loading')} />}
          </>
        )}
      </RecommendedSection>
    </PageLayout>
  )
}