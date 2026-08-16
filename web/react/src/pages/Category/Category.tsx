// TypeScript strict mode enabled
import { useState, useEffect, useCallback } from 'react'
import { PromoTags } from '../../components/business/PromoTags'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useProducts, useFlatCategories, useCategories } from '../../hooks/useProducts'
import { useTranslation } from '../../i18n'
import styled from 'styled-components'
import { Color, Radius, Shadow, FontSize } from '../../theme/tokens'
import { zIndex } from '../../styles/zIndex'
import ProductDetailModal from '../../components/business/ProductDetailModal/ProductDetailModal'
import { publicAPI } from '../../api/public'
import { useQuickAddModal } from '../../hooks/useQuickAddModal'
import { optionalMediaUrl } from '../../utils/mediaUrl'

const HEART_ICON = '/static/images/icons/heart.svg'
const LOVEIN_ICON = '/static/images/icons/Lovein.svg'

const BreadcrumbBar = styled.div`
  max-width: 1200px;
  margin: 1.5vh 2vw 0 2vw;
  padding: 0;
`

const Breadcrumb = styled.div`
  color: ${Color.text.muted};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5vw;
`

const BreadcrumbLink = styled.span`
  color: ${Color.primaryHover};
  cursor: pointer;

  &:hover {
    color: #e74c3c;
    text-decoration: underline;
  }
`

const BreadcrumbSeparator = styled.span`
  color: ${Color.text.muted};
`

const MainContent = styled.div`
  max-width: 95%;
  margin: 1.5vh 2vw 1.5vh 0;
  display: grid;
  grid-template-columns: calc(5vw + 120px) 1fr;
  gap: 3vw;
  padding: 0 0 0 2vw;

  @media (max-width: 992px) {
    grid-template-columns: 180px 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 150px 1fr;
    gap: 2vw;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 3vw;
    padding: 0 3vw;
  }
`

const Sidebar = styled.aside`
  position: sticky;
  top: 2vh;
  height: calc(100vh - 4vh);
  background-color: ${Color.bg.card};
  padding: 2vh;
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  overflow-y: auto;

  @media (max-width: 640px) {
    position: static;
    height: auto;
    overflow-y: visible;
    padding: 2vh 3vw;
  }
`

const SidebarSection = styled.div`
  margin-bottom: 2.5vh;
`

const SidebarTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: bold;
  margin-bottom: 1.5vh;
  color: #111;
  padding-bottom: 0.6vh;
  border-bottom: 1px solid ${Color.border.light};
`

const CatNodeBtn = styled.button<{ $active?: boolean; $level: number }>`
  display: block;
  width: 100%;
  text-align: left;
  background: ${({ $active }) => ($active ? Color.primaryLight : 'none')};
  color: ${({ $active }) => ($active ? Color.primaryHover : Color.text.body)};
  border: none;
  padding: 7px 10px;
  padding-left: ${({ $level }) => 10 + $level * 14}px;
  font-size: ${({ $level }) => ($level === 0 ? '0.95rem' : '0.88rem')};
  font-weight: ${({ $level, $active }) => ($level === 0 || $active ? 600 : 400)};
  cursor: pointer;
  border-radius: 6px;
  &:hover { background: ${Color.bg.page}; color: ${Color.primaryHover}; }
`

const PriceTrack = styled.div`
  margin: 2vh 0;
  position: relative;
  height: 5px;
  background: ${Color.border.light};
  border-radius: 5px;
`

const PriceRange = styled.input`
  position: absolute;
  width: 100%;
  height: 5px;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${Color.bg.card};
    border: 3px solid ${Color.primary};
    pointer-events: all;
    cursor: pointer;
  }
`

const FilterButton = styled.button`
  display: block;
  width: 100%;
  background: #111;
  color: ${Color.bg.card};
  border: none;
  padding: 0.8vh 1.6vw;
  font-size: 1rem;
  cursor: pointer;
  border-radius: ${Radius.sm}px;
  margin-bottom: 1.5vh;

  &:hover {
    background: ${Color.primaryHover};
  }
`

const PriceLabel = styled.span`
  display: block;
  font-size: 1rem;
  color: #555;
  margin-top: 0.5vh;
`

const SizeList = styled.div`
  display: flex;
  gap: 0.8vw;
  flex-wrap: wrap;
`

const SizeButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid ${Color.border.light};
  background: #f8f8f8;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover, &.active {
    border-color: #111;
    background: ${Color.bg.card};
  }
`

const ColorList = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.8vw;
`

const ColorButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;

  &:hover, &.active {
    border-color: #111;
  }
`

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6vw;
`

const TagButton = styled.button`
  padding: 0.4vh 1vw;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.lg}px;
  font-size: 0.85rem;
  cursor: pointer;
  background: ${Color.bg.card};

  &.active {
    background: #111;
    color: ${Color.text.inverse};
    border-color: #111;
  }
`

const ProductList = styled.div``

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2vh;
`

const ListCount = styled.div`
  font-size: 1rem;
  color: ${Color.text.secondary};
`

const ViewControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vw;
`

const SortSelect = styled.select`
  border: none;
  font-size: 1rem;
  color: ${Color.text.secondary};
  cursor: pointer;
  background: transparent;
`

const ViewButtons = styled.div`
  display: flex;
  border: 1px solid ${Color.border.medium};
`

const ViewButton = styled.button`
  background: ${Color.bg.card};
  border: none;
  padding: 0.6vh 1vw;
  cursor: pointer;
  border-right: 1px solid ${Color.border.medium};
  font-size: 1rem;

  &:last-child {
    border-right: none;
  }

  &.active {
    background: #111;
    color: ${Color.text.inverse};
  }
`

const ProductGrid = styled.div<{ $show?: boolean }>`
  display: ${props => props.$show ? 'grid' : 'none'};
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`

const ProductCard = styled.div`
  background-color: ${Color.bg.card};
  border-radius: ${Radius.md}px;
  overflow: hidden;
  box-shadow: ${Shadow.card};
  position: relative;
`

const ProductBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  background: #ff4444;
  border-radius: ${Radius.xs}px;
  z-index: ${zIndex.base};

  span {
    color: ${Color.text.inverse};
    font-size: ${FontSize.xs}px;
    font-weight: bold;
    line-height: 1.3;
    white-space: nowrap;
  }
`

const ProductImage = styled.div`
  width: 100%;
  aspect-ratio: 1;
  background-color: ${Color.border.light};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${Color.text.secondary};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const ProductInfo = styled.div`
  padding: 8px 8px 10px;
`

const ProductTitle = styled.div`
  font-size: clamp(0.72rem, 2.4vw, 0.85rem);
  font-weight: 500;
  margin-bottom: 6px;
  color: ${Color.primaryHover};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const CardPrice = styled.div`
  font-size: clamp(0.85rem, 2vw, 1rem);
  font-weight: 600;
  color: #111;
  display: flex;
  align-items: baseline;
  gap: 4px;
`

const CardOldPrice = styled.span`
  font-size: 0.75rem;
  color: ${Color.text.muted};
  text-decoration: line-through;
  font-weight: 400;
`

const CardActions = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

const CardAction = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid ${Color.border.light};
  border-radius: 50%;
  background: ${Color.bg.card};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  padding: 0;
  flex-shrink: 0;

  &:hover {
    background: ${Color.primaryLight};
    border-color: ${Color.border.medium};
  }
`

const CardBuyBtn = styled.button`
  width: 100%;
  margin-top: 6px;
  background: #111;
  color: ${Color.text.inverse};
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 5px 0;
  border-radius: ${Radius.sm}px;

  &:hover {
    background: ${Color.primaryHover};
  }
`

const ListView = styled.div<{ $show?: boolean }>`
  display: ${props => props.$show ? 'flex' : 'none'};
  flex-direction: column;
  gap: 2.5vh;
`

const ListItem = styled.div`
  display: flex;
  gap: 2vw;
  background: ${Color.bg.card};
  padding: 1.5vh;
  border-radius: ${Radius.md}px;
  box-shadow: ${Shadow.card};
  position: relative;

  @media (max-width: 576px) {
    flex-direction: column;
  }
`

const ListItemInfo = styled.div`
  flex-grow: 1;
`

const ListItemTitle = styled.div`
  font-size: 1.15rem;
  font-weight: bold;
  margin-bottom: 0.8vh;
`

const ListItemPrice = styled.div`
  font-size: 1.15rem;
  margin-bottom: 1vh;
`

const ListItemDesc = styled.p`
  font-size: 1rem;
  color: ${Color.text.secondary};
  margin-bottom: 1vh;
  line-height: 1.5;
`

const ListItemFeatures = styled.ul`
  list-style: none;
  margin-bottom: 1.5vh;
`

const ListFeature = styled.li`
  font-size: 0.9rem;
  color: ${Color.text.secondary};
  margin-bottom: 0.4vh;
`

const ListItemActions = styled.div`
  display: flex;
  gap: 0.8vw;
`

type TreeItem = { id: number; name: string; level?: number; children?: TreeItem[] }

function CategoryTree({
  nodes,
  catId,
  level = 0,
  onPick,
}: {
  nodes: TreeItem[]
  catId?: string
  level?: number
  onPick: (id: number) => void
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <CatNodeBtn
            $level={level}
            $active={catId ? String(node.id) === catId : false}
            onClick={() => onPick(node.id)}
          >
            {node.name}
          </CatNodeBtn>
          {node.children && node.children.length > 0 && (
            <CategoryTree nodes={node.children} catId={catId} level={level + 1} onPick={onPick} />
          )}
        </div>
      ))}
    </>
  )
}

export default function Category() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    isLoggedIn,
    quickAddProductId,
    quickAddOpen,
    openQuickAdd,
    closeQuickAdd,
    handleQuickAddToCart,
    redirectLogin,
  } = useQuickAddModal()
  // 从 URL 参数获取当前分类
  const catId = searchParams.get('cat_id')
  const numericCatId = catId ? Number(catId) : undefined
  const searchQuery = searchParams.get('q')?.trim() || ''
  const { products, total } = useProducts(1, 20, numericCatId, searchQuery)
  const { categories } = useFlatCategories()
  const { categories: categoryTree } = useCategories()
  const { t } = useTranslation()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(500)
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: string[] }>({})
  const [favorites, setFavorites] = useState<number[]>([])
  const [favBusyId, setFavBusyId] = useState<number | null>(null)

  const activeCategory = catId ? categories.find(c => String(c.id) === catId) : null

  useEffect(() => {
    if (!isLoggedIn) {
      setFavorites([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await publicAPI.getFavorites({ page: 1, per_page: 200 })
        const list = Array.isArray(res)
          ? res
          : ((res as { results?: { spu_id: number }[] }).results ?? [])
        if (cancelled) return
        setFavorites(
          list
            .map((item) => Number(item.spu_id))
            .filter((id) => Number.isFinite(id) && id > 0),
        )
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category]?.includes(value)
        ? prev[category].filter(v => v !== value)
        : [...(prev[category] || []), value]
    }))
  }

  const toggleFavorite = useCallback(async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      redirectLogin()
      return
    }
    if (favBusyId === productId) return
    const wasFav = favorites.includes(productId)
    setFavorites(prev =>
      wasFav ? prev.filter(id => id !== productId) : [...prev, productId],
    )
    setFavBusyId(productId)
    try {
      if (wasFav) await publicAPI.removeFavorite(productId)
      else await publicAPI.addFavorite(productId)
    } catch {
      setFavorites(prev =>
        wasFav ? [...prev, productId] : prev.filter(id => id !== productId),
      )
    } finally {
      setFavBusyId(null)
    }
  }, [favBusyId, favorites, isLoggedIn, redirectLogin])

  const handleProductClick = (id: number) => {
    navigate(`/product/${id}`)
  }

  return (
    <PageLayout>

      <BreadcrumbBar>
        <Breadcrumb>
          <BreadcrumbLink onClick={() => navigate('/')}>{t('store.category.home')}</BreadcrumbLink>
          <BreadcrumbSeparator>&gt;</BreadcrumbSeparator>
          {activeCategory ? (
            <BreadcrumbLink onClick={() => navigate(`/category?cat_id=${catId}`)}>
              {activeCategory.name}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbLink onClick={() => navigate('/category')}>{t('store.category.allCategories')}</BreadcrumbLink>
          )}
          <BreadcrumbSeparator>&gt;</BreadcrumbSeparator>
          <span>{t('store.category.products')} ({products.length})</span>
        </Breadcrumb>
      </BreadcrumbBar>

      <MainContent>
        <Sidebar>
          <SidebarSection>
            <SidebarTitle>{t('store.nav.categories')}</SidebarTitle>
            <CategoryTree
              nodes={categoryTree}
              catId={catId || undefined}
              onPick={(id) => navigate(`/category?cat_id=${id}`)}
            />
          </SidebarSection>
          <SidebarSection>
            <SidebarTitle>{t('store.category.priceRange')}</SidebarTitle>
            <FilterButton onClick={() => {
              // Apply price filter: navigate or refetch
              navigate(`/category${catId ? `?cat_id=${catId}` : ''}`)
            }}>{t('store.category.filter')}</FilterButton>
            <PriceTrack>
              <PriceRange type="range" min="0" max="500" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} />
              <PriceRange type="range" min="0" max="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
            </PriceTrack>
            <PriceLabel>${minPrice} - ${maxPrice}</PriceLabel>
          </SidebarSection>
        </Sidebar>

        <ProductList>
          <ListHeader>
            <ListCount>{t('store.category.showing').replace('{count}', String(products.length)).replace('{total}', String(total))}</ListCount>
            <ViewControls>
              <SortSelect>
                <option>{t('store.category.defaultSorting')}</option>
                <option>{t('store.category.priceLowHigh')}</option>
                <option>{t('store.category.priceHighLow')}</option>
                <option>{t('store.category.newestFirst')}</option>
              </SortSelect>
              <ViewButtons>
                <ViewButton
                  data-view="grid"
                  className={view === 'grid' ? 'active' : ''}
                  onClick={() => setView('grid')}
                >
                  ▦
                </ViewButton>
                <ViewButton
                  data-view="list"
                  className={view === 'list' ? 'active' : ''}
                  onClick={() => setView('list')}
                >
                  ☰
                </ViewButton>
              </ViewButtons>
            </ViewControls>
          </ListHeader>

          <ProductGrid $show={view === 'grid'}>
            {products.map(product => (
              <ProductCard key={product.id} onClick={() => handleProductClick(product.id)}>
                {product.badge && (
                  <ProductBadge>
                    <span>{product.badge}</span>
                  </ProductBadge>
                )}
                <PromoTags tags={product.promo_tags} onClick={() => navigate('/coupons/center')} />
                <ProductImage>
                  {optionalMediaUrl(product.image) && (
                    <img src={optionalMediaUrl(product.image)} alt={product.name} />
                  )}
                </ProductImage>
                <ProductInfo>
                  <ProductTitle>{product.name}</ProductTitle>
                  <CardFooter>
                    <CardPrice>
                      ${product.price}
                      {product.originalPrice && (
                        <CardOldPrice>${product.originalPrice}</CardOldPrice>
                      )}
                    </CardPrice>
                    <CardActions>
                      <CardAction onClick={(e) => toggleFavorite(e, product.id)}>
                        <img 
                          src={favorites.includes(product.id) ? LOVEIN_ICON : HEART_ICON} 
                          alt="favorite" 
                          style={{ width: '18px', height: '18px' }}
                        />
                      </CardAction>
                      <CardAction onClick={(e) => openQuickAdd(e, product.id)}><img src="/static/images/icons/JoinShoppingCar.svg" alt="cart" style={{ width: '20px', height: '20px' }} /></CardAction>
                    </CardActions>
                  </CardFooter>
                  <CardBuyBtn>{t('store.category.buy')}</CardBuyBtn>
                </ProductInfo>
              </ProductCard>
            ))}
          </ProductGrid>

          <ListView $show={view === 'list'}>
            {products.map(product => (
              <ListItem key={product.id} onClick={() => handleProductClick(product.id)}>
                {product.badge && (
                  <ProductBadge>
                    <span>{product.badge}</span>
                  </ProductBadge>
                )}
                <PromoTags tags={product.promo_tags} onClick={() => navigate('/coupons/center')} />
                <ProductImage style={{ width: 200, height: 200, flexShrink: 0 }}>
                  {optionalMediaUrl(product.image) && (
                    <img src={optionalMediaUrl(product.image)} alt={product.name} />
                  )}
                </ProductImage>
                <ListItemInfo>
                  <ListItemTitle>{product.name}</ListItemTitle>
                  <ListItemPrice>
                    ${product.price}
                    {product.originalPrice && (
                      <CardOldPrice>${product.originalPrice}</CardOldPrice>
                    )}
                  </ListItemPrice>
                  <ListItemDesc>{product.description}</ListItemDesc>
                  <ListItemActions>
                    <CardBuyBtn>{t('store.category.buyNow')}</CardBuyBtn>
                    <CardAction onClick={(e) => toggleFavorite(e, product.id)}>
                      <img 
                        src={favorites.includes(product.id) ? LOVEIN_ICON : HEART_ICON} 
                        alt="favorite" 
                        style={{ width: '18px', height: '18px' }}
                      />
                    </CardAction>
                    <CardAction onClick={(e) => openQuickAdd(e, product.id)}><img src="/static/images/icons/JoinShoppingCar.svg" alt="cart" style={{ width: '20px', height: '20px' }} /></CardAction>
                  </ListItemActions>
                </ListItemInfo>
              </ListItem>
            ))}
          </ListView>
        </ProductList>
      </MainContent>
      
      <ProductDetailModal
        productId={quickAddProductId}
        isOpen={quickAddOpen}
        onClose={closeQuickAdd}
        onAddToCart={handleQuickAddToCart}
        onToggleFavorite={(id, next) => {
          setFavorites(prev =>
            next
              ? prev.includes(id)
                ? prev
                : [...prev, id]
              : prev.filter(x => x !== id),
          )
        }}
      />
    </PageLayout>
  )
}
