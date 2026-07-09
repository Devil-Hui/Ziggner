// TypeScript strict mode enabled
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import { useProducts, useFlatCategories } from '../../hooks/useProducts'
import { useCart } from '../../store/CartContext'
import { useTranslation } from '../../i18n'
import { zIndex } from '../../styles/zIndex'
import styled from 'styled-components'
import { Color, Radius, Shadow, FontSize } from '../../theme/tokens'

const HEART_ICON = '/static/images/icons/heart.svg'
const LOVEIN_ICON = '/static/images/icons/Lovein.svg'

const AlphabetNav = styled.div`
  background-color: #f0f0f0;
  padding: 0.8vh 2vw;
  display: flex;
  align-items: center;
  gap: 1vw;
  overflow-x: auto;

  span {
    font-size: 1rem;
    color: ${Color.primaryHover};
    padding: 0.4vh 0.8vw;
    cursor: pointer;
    border-radius: 3px;

    &:hover {
      background-color: ${Color.border.medium};
    }
  }
`

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
    border: 3px solid #ff6b6b;
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

const FilterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1vh;
`

const FilterLink = styled.div`
  font-size: 1rem;
  color: ${Color.text.secondary};
  cursor: pointer;
  padding: 0.4vh 0;

  &:hover, &.active {
    color: #111;
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
  top: 0;
  left: 1vw;
  width: 24px;
  height: 72px;
  background: #ff4444;
  z-index: ${zIndex.base};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.8vh;
  clip-path: polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%);

  span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    color: ${Color.text.inverse};
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 2px;
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
  font-size: 0.8rem;
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
  font-size: 0.9rem;
  font-weight: 600;
  color: #e74c3c;
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

const CartModal = styled.div<{ $show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: ${props => props.$show ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: ${zIndex.modal};
`

const ModalBody = styled.div`
  background: ${Color.bg.card};
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  border-radius: ${Radius.lg}px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  display: flex;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const ModalCloseBtn = styled.button`
  position: absolute;
  top: 2vh;
  right: 2vh;
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: ${Color.text.muted};
  z-index: 10;
`

const ModalLeft = styled.div`
  width: 15%;
  padding: 2vh 1vw;
  display: flex;
  flex-direction: column;
  gap: 1vh;
  border-right: 1px solid ${Color.border.light};
  
  img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: ${Radius.sm}px;
    
    &.active {
      border-color: #e74c3c;
    }
    
    &:hover {
      border-color: ${Color.border.dark};
    }
  }
`

const ModalCenter = styled.div`
  width: 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vh;
  background: #fafafa;
  position: relative;
  
  img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }
  
  button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 6vh;
    height: 6vh;
    background: rgba(255,255,255,0.8);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    color: ${Color.primaryHover};
    
    &.prev {
      left: 2vw;
    }
    
    &.next {
      right: 2vw;
    }
    
    &:hover {
      background: ${Color.bg.card};
    }
  }
`

const ModalRight = styled.div`
  width: 40%;
  padding: 4vh 3vw;
  overflow-y: auto;
  max-height: 90vh;
`

const ModalTitle = styled.h2`
  margin: 0 0 1.5vh;
  font-size: 1.3rem;
  font-weight: 600;
`

const ModalSKU = styled.p`
  margin: 0 0 2vh;
  font-size: 0.85rem;
  color: ${Color.text.muted};
`

const ModalPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1vw;
  margin-bottom: 2vh;
  
  .current {
    font-size: 1.75rem;
    font-weight: bold;
    color: #e74c3c;
  }
  
  .original {
    font-size: 1rem;
    color: ${Color.text.muted};
    text-decoration: line-through;
  }
  
  .discount {
    background: #e74c3c;
    color: ${Color.text.inverse};
    padding: 0.3vh 0.6vw;
    font-size: 0.85rem;
    border-radius: ${Radius.sm}px;
  }
`

const ModalClub = styled.div`
  background: #fff3e0;
  padding: 1.5vh;
  border-radius: ${Radius.md}px;
  margin-bottom: 3vh;
  display: flex;
  align-items: center;
  gap: 1vw;
  
  span {
    font-size: 0.85rem;
    color: #e65100;
  }
`

const ModalSize = styled.div`
  margin-bottom: 3vh;
  
  h4 {
    margin: 0 0 1.5vh;
    font-size: 0.9rem;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 1vw;
  }

  button {
    padding: 1vh 2vw;
    border: 1px solid ${Color.border.medium};
    background: ${Color.bg.card};
    cursor: pointer;
    font-size: 0.85rem;
    border-radius: ${Radius.sm}px;
    
    &.active {
      border-color: #e74c3c;
      background: #fff5f5;
    }
    
    &:hover {
      border-color: #e74c3c;
    }
  }
`

const ModalFooter = styled.div`
  display: flex;
  gap: 2vw;
  margin-top: 3vh;
  
  button {
    padding: 2vh 0;
    border-radius: ${Radius.sm}px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    
    &.add-cart {
      flex-grow: 1;
      background: #111;
      border: none;
      color: ${Color.text.inverse};
    }
    
    &.favorite {
      width: 12vh;
      background: ${Color.bg.card};
      border: 1px solid ${Color.border.medium};
      color: ${Color.primaryHover};
      display: flex;
      align-items: center;
      justify-content: center;
      
      img {
        width: 18px;
        height: 18px;
      }
    }
  }
`

export default function Category() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addItem } = useCart()
  // 从 URL 参数获取当前分类
  const catId = searchParams.get('cat_id')
  const numericCatId = catId ? Number(catId) : undefined
  const { products, total } = useProducts(1, 20, numericCatId)
  const { categories } = useFlatCategories()
  const { t } = useTranslation()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(500)
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: string[] }>({})
  const [favorites, setFavorites] = useState<number[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const [addedProduct, setAddedProduct] = useState<typeof products[0] | null>(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const activeCategory = catId ? categories.find(c => String(c.id) === catId) : null

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category]?.includes(value)
        ? prev[category].filter(v => v !== value)
        : [...(prev[category] || []), value]
    }))
  }

  const toggleFavorite = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation()
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleAddToCart = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation()
    const product = products.find(p => p.id === productId)
    if (product) {
      setAddedProduct(product)
      setSelectedSize('')
      setCurrentImageIndex(0)
      setShowCartModal(true)
    }
  }

  const handleConfirmAddToCart = () => {
    if (addedProduct) {
      addItem(addedProduct.id, 1, addedProduct.name, addedProduct.price, addedProduct.image)
      handleCloseModal()
    }
  }

  const handleCloseModal = () => {
    setShowCartModal(false)
    setAddedProduct(null)
    setSelectedSize('')
  }

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const handleNextImage = () => {
    if (addedProduct && currentImageIndex < 4) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const handleProductClick = (id: number) => {
    navigate(`/product/${id}`)
  }

  return (
    <PageLayout>

      <AlphabetNav>
        <span onClick={() => navigate('/category')}>{t('store.category.all')}</span>
        {categories.map(cat => (
          <span key={cat.id} onClick={() => navigate(`/category?cat_id=${cat.id}`)}>
            {cat.name}
          </span>
        ))}
      </AlphabetNav>

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

          <SidebarSection>
            <SidebarTitle>{t('store.category.productCategory')}</SidebarTitle>
            <FilterList>
              <FilterLink className={!activeFilters['category']?.length && !catId ? 'active' : ''} onClick={() => navigate('/category')}>
                {t('store.category.allProducts')}
              </FilterLink>
              {categories.map(cat => (
                <FilterLink
                  key={cat.id}
                  className={String(cat.id) === catId || activeFilters['category']?.includes(cat.name) ? 'active' : ''}
                  onClick={() => navigate(`/category?cat_id=${cat.id}`)}
                >
                  {cat.name}
                </FilterLink>
              ))}
            </FilterList>
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
                <ProductImage>
                  <img src={product.image} alt={product.name} />
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
                      <CardAction onClick={(e) => handleAddToCart(e, product.id)}><img src="/static/images/icons/JoinShoppingCar.svg" alt="cart" style={{ width: '20px', height: '20px' }} /></CardAction>
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
                <ProductImage style={{ width: 200, height: 200, flexShrink: 0 }}>
                  <img src={product.image} alt={product.name} />
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
                    <CardAction onClick={(e) => handleAddToCart(e, product.id)}><img src="/static/images/icons/JoinShoppingCar.svg" alt="cart" style={{ width: '20px', height: '20px' }} /></CardAction>
                  </ListItemActions>
                </ListItemInfo>
              </ListItem>
            ))}
          </ListView>
        </ProductList>
      </MainContent>
      
      <CartModal $show={showCartModal}>
        <ModalBody>
          <ModalCloseBtn onClick={handleCloseModal}>&times;</ModalCloseBtn>
          
          {addedProduct && (
            <>
              <ModalLeft>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <img
                    key={idx}
                    src={addedProduct.image}
                    alt={`${addedProduct.name} ${idx + 1}`}
                    className={currentImageIndex === idx ? 'active' : ''}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </ModalLeft>
              
              <ModalCenter>
                <button className="prev" onClick={handlePrevImage}>&lt;</button>
                <img src={addedProduct.image} alt={addedProduct.name} />
                <button className="next" onClick={handleNextImage}>&gt;</button>
              </ModalCenter>
              
              <ModalRight>
                <ModalTitle>{addedProduct.name}</ModalTitle>
                <ModalSKU>{t('store.category.skuPrefix')}{addedProduct.id}</ModalSKU>
                
                <ModalPrice>
                  <span className="current">${addedProduct.price}</span>
                  {addedProduct.originalPrice && (
                    <span className="original">${addedProduct.originalPrice}</span>
                  )}
                  {addedProduct.badge && (
                    <span className="discount">{addedProduct.badge}</span>
                  )}
                </ModalPrice>
                
                <ModalSize>
                  <h4>{t('store.category.description')}</h4>
                  <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5vh' }}>
                    {addedProduct.description || t('store.category.noDescription')}
                  </p>
                </ModalSize>
                
                <ModalFooter>
                  <button className="add-cart" onClick={handleConfirmAddToCart}>{t('store.category.addToCart')}</button>
                  <button className="favorite" onClick={() => toggleFavorite({} as React.MouseEvent, addedProduct.id)}>
                    <img 
                      src={favorites.includes(addedProduct.id) ? LOVEIN_ICON : HEART_ICON} 
                      alt="favorite"
                      style={{ width: '18px', height: '18px' }}
                    />
                  </button>
                </ModalFooter>
              </ModalRight>
            </>
          )}
        </ModalBody>
      </CartModal>
    </PageLayout>
  )
}