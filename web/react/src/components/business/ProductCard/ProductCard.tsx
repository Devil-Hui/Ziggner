import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import {
  PROMO_COLORS,
  promoPennantContainer,
  promoPennantPrimary,
  promoPennantSecondary,
} from '../../../styles/promoTag'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import { useUser } from '../../../store/UserContext'
import { useCart } from '../../../store/CartContext'
import HeartIcon from '../../../assets/icons/heart.svg?react'
import CartIcon from '../../../assets/icons/cart.svg?react'
import ProductDetailModal from '../ProductDetailModal/ProductDetailModal'
import { commitQuickAddToCart } from '../../../utils/quickAdd'
import type { PublicSKU, PublicSPUDetail } from '../../../api/public'
import { optionalMediaUrl } from '../../../utils/mediaUrl'

// ==================== 类型定义 ====================

export interface PromoTag {
  type: 'primary' | 'secondary'
  label: string
}

export interface Product {
  id: string | number
  name: string
  price: number
  image: string
  promo_tags?: PromoTag[]
  [key: string]: unknown
}

export interface ProductCardProps {
  product: Product
  isLoggedIn?: boolean
  /** Override quick-add (opens modal by default when omitted) */
  onAddToCart?: (product: Product) => void
  onToggleFavorite?: (product: Product) => void
  onProductClick?: (product: Product) => void
  /** When true, cart icon opens ProductDetailModal (default true if onAddToCart omitted) */
  useQuickAddModal?: boolean
}

// ==================== 样式组件 ====================

/** 卡片容器 */
const CardWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: ${PROMO_COLORS.primary};
  transition: box-shadow 0.3s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`

/** 产品图片 */
const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const ProductImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: #eef2f6;
`

// ── 锦旗标签 (燕尾形, 右上角绝对定位) ──

/** 标签容器 */
const PennantContainer = styled.div`
  ${promoPennantContainer}
`

/** 蓝色主标签 */
const PennantPrimary = styled.span`
  ${promoPennantPrimary}
`

/** 黄色副标签 (层叠偏移) */
const PennantSecondary = styled.span`
  ${promoPennantSecondary}
`

/** 双标签包裹器 —— 相对定位容器，让黄色层叠在蓝色之上 */
const PennantStack = styled.div`
  position: relative;
  display: inline-block;
`

// ── 右下角切换圆钮 ──

/** 切换按钮容器 */
const ToggleDots = styled.div`
  position: absolute;
  bottom: 48px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: ${zIndex.content};
`

/** 切换圆钮 */
const ToggleDot = styled.button<{ $active: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid ${PROMO_COLORS.primary};
  background: ${({ $active }) => ($active ? PROMO_COLORS.primary : 'transparent')};
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
  outline: none;

  &:hover {
    background: ${({ $active }) => ($active ? PROMO_COLORS.primary : 'rgba(79, 195, 247, 0.3)')};
  }
`

// ── 底部 info 栏 ──

/** 底部信息栏 */
const InfoBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #000;
  z-index: ${zIndex.content};
`

// ── 操作按钮 ──

const ActionBar = styled.div`
  position: absolute;
  bottom: 46px;
  right: 8px;
  display: flex;
  flex-direction: row;
  gap: 6px;
  z-index: ${zIndex.content};
`

const ActionIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: ${PROMO_COLORS.primary};
  cursor: pointer;
  padding: 5px;
  transition: opacity 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
    fill: #fff;
  }

  &:hover {
    opacity: 0.8;
  }
`

// ==================== 组件 ====================

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isLoggedIn: isLoggedInProp,
  onAddToCart,
  onToggleFavorite,
  onProductClick,
  useQuickAddModal,
}) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isLoggedIn: ctxLoggedIn } = useUser()
  const { addItem } = useCart()
  const isLoggedIn = isLoggedInProp ?? ctxLoggedIn
  const [tagVariant, setTagVariant] = useState(0) // 0=单标签, 1=双标签
  // 图片加载失败回退占位（URL 存在但 404/网络错误时避免裂图）
  const [imgFailed, setImgFailed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const openModal = useQuickAddModal ?? !onAddToCart
  const productIdNum = Number(product.id)

  const requireLogin = useCallback(() => {
    navigate(
      `/auth?tab=login&redirect=${encodeURIComponent(
        window.location.pathname + window.location.search,
      )}`,
    )
  }, [navigate])

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isLoggedIn) {
        requireLogin()
        return
      }
      onToggleFavorite?.(product)
    },
    [isLoggedIn, onToggleFavorite, product, requireLogin],
  )

  const handleCartClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isLoggedIn) {
        requireLogin()
        return
      }
      if (openModal) {
        setModalOpen(true)
        return
      }
      onAddToCart?.(product)
    },
    [isLoggedIn, onAddToCart, openModal, product, requireLogin],
  )

  const handleCardClick = useCallback(() => {
    if (onProductClick) {
      onProductClick(product)
      return
    }
    if (productIdNum) navigate(`/product/${productIdNum}`)
  }, [navigate, onProductClick, product, productIdNum])

  const handleQuickAddToCart = useCallback(
    (skuId: number, quantity: number, detail: PublicSPUDetail, sku: PublicSKU) => {
      if (!isLoggedIn) {
        requireLogin()
        return
      }
      void commitQuickAddToCart(addItem, skuId, quantity, detail, sku)
    },
    [addItem, isLoggedIn, requireLogin],
  )

  const promoTags = product.promo_tags || []

  /**
   * 渲染锦旗标签 —— 单/双信息态
   * - tagVariant=0: 单信息, 仅蓝色标签
   * - tagVariant=1: 双信息, 蓝黄层叠
   */
  const renderPennant = () => {
    if (promoTags.length === 0) return null

    if (tagVariant === 0 || promoTags.length === 1) {
      // 单信息: 仅天蓝色标签
      return (
        <PennantContainer>
          <PennantPrimary>{promoTags[0].label}</PennantPrimary>
        </PennantContainer>
      )
    }

    // 双信息: 蓝黄上下错位层叠
    const primaryTag = promoTags.find((tag) => tag.type === 'primary')
    const secondaryTag = promoTags.find((tag) => tag.type === 'secondary')
    return (
      <PennantContainer>
        <PennantStack>
          <PennantSecondary>{secondaryTag?.label || promoTags[1].label}</PennantSecondary>
          <PennantPrimary>{primaryTag?.label || promoTags[0].label}</PennantPrimary>
        </PennantStack>
      </PennantContainer>
    )
  }

  return (
    <>
      <CardWrapper onClick={handleCardClick}>
        {optionalMediaUrl(product.image) && !imgFailed ? (
          <ProductImage
            src={optionalMediaUrl(product.image)}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <ProductImagePlaceholder aria-hidden="true" />
        )}

        {/* 锦旗标签 */}
        {renderPennant()}

        {/* 右下角切换圆钮 */}
        {promoTags.length >= 2 && (
          <ToggleDots>
            <ToggleDot
              $active={tagVariant === 0}
              onClick={(e) => {
                e.stopPropagation()
                setTagVariant(0)
              }}
            />
            <ToggleDot
              $active={tagVariant === 1}
              onClick={(e) => {
                e.stopPropagation()
                setTagVariant(1)
              }}
            />
          </ToggleDots>
        )}

        {/* 收藏/购物车 */}
        <ActionBar>
          <ActionIcon
            onClick={handleFavoriteClick}
            aria-label={t('store.product.wishlist')}
            title={t('store.product.wishlist')}
          >
            <HeartIcon />
          </ActionIcon>
          <ActionIcon
            onClick={handleCartClick}
            aria-label={t('store.product.addToCart')}
            title={t('store.product.addToCart')}
          >
            <CartIcon />
          </ActionIcon>
        </ActionBar>

        {/* 底部 info 栏 */}
        <InfoBar>
          {typeof product.price === 'number' ? `$${product.price}` : 'info'}
        </InfoBar>
      </CardWrapper>

      {openModal && (
        <ProductDetailModal
          productId={Number.isFinite(productIdNum) ? productIdNum : null}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAddToCart={handleQuickAddToCart}
        />
      )}
    </>
  )
}

export default ProductCard
