import React, { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { zIndex } from '../../../styles/zIndex'
import { useTranslation } from '../../../i18n'
import { Color, Radius, Shadow, Spacing, FontSize, Transition } from '../../../theme/tokens'

// ==================== 类型定义 ====================

/** 产品详情数据（扩展） */
interface ProductDetail {
  id: string | number
  name: string
  price: number
  image: string
  images?: string[]          // 多张产品图片
  description?: string
  specs?: Record<string, string>  // 规格参数
  stock?: number             // 库存
  [key: string]: unknown
}

/** ProductDetailModal 组件 Props */
export interface ProductDetailModalProps {
  product: ProductDetail | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (product: ProductDetail, quantity: number) => void
}

// ==================== 样式组件 ====================

/** 遮罩层 */
const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${zIndex.modal};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`

/** 模态框主体 - 三列布局 */
const ModalBody = styled.div`
  display: flex;
  width: 85vw;
  max-width: 960px;
  height: 70vh;
  max-height: 640px;
  background: ${Color.bg.card};
  border-radius: ${Radius.lg};
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    flex-direction: column;
    width: 95vw;
    height: 90vh;
    max-height: none;
  }
`

/** 圆形关闭按钮 - 卡片右上角 */
const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: ${Color.text.inverse};
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s ease;
  line-height: 1;

  &:hover {
    background: rgba(0, 0, 0, 0.85);
  }
`

// ==================== 左列：缩略图列表 ====================

/** 缩略图列表容器 - 可垂直滚动 */
const ThumbnailList = styled.div`
  width: 80px;
  min-width: 80px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 8px;
  overflow-y: auto;
  border-right: 1px solid ${Color.border.light};
  background: #fafafa;

  /* 隐藏滚动条 - 保持美观 */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
  }
`

/** 缩略图单项 */
const ThumbnailItem = styled.div<{ $active: boolean }>`
  width: 64px;
  height: 64px;
  border-radius: ${Radius.sm};
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${({ $active }) => ($active ? '#1a73e8' : 'transparent')};
  transition: border-color 0.2s ease;
  flex-shrink: 0;

  &:hover {
    border-color: #1a73e8;
  }
`

/** 缩略图图片 */
const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

// ==================== 中列：大图展示 ====================

/** 大图展示容器 */
const MainImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${Color.bg.card};
`

/** 主图 */
const MainImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
`

// ==================== 右列：商品信息 ====================

/** 商品信息面板 */
const InfoPanel = styled.div`
  width: 280px;
  min-width: 280px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid ${Color.border.light};
  overflow-y: auto;
`

/** 商品名称 */
const ProductName = styled.h2`
  font-size: 1.2rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 8px;
  line-height: 1.4;
`

/** 商品价格 */
const ProductPrice = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #e53935;
  margin-bottom: 16px;
`

/** 信息区块标题 */
const SectionTitle = styled.h4`
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
  margin: 16px 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

/** 规格列表 */
const SpecsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/** 规格项 */
const SpecItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;

  span:first-child {
    color: #888;
  }
  span:last-child {
    color: ${Color.primaryHover};
    font-weight: 500;
  }
`

/** 库存信息 */
const StockInfo = styled.div<{ $lowStock: boolean }>`
  font-size: 0.85rem;
  color: ${({ $lowStock }) => ($lowStock ? '#e53935' : '#4caf50')};
  font-weight: 600;
  margin-top: 4px;
`

/** 数量选择器容器 */
const QuantitySelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
`

/** 数量调节按钮 */
const QuantityButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm};
  background: ${Color.bg.card};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    background: ${Color.primaryLight};
    border-color: ${Color.text.muted};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

/** 数量显示 */
const QuantityDisplay = styled.span`
  font-size: 1rem;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
`

/** 加入购物车按钮 */
const AddToCartButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: none;
  border-radius: 6px;
  background: #1a73e8;
  color: ${Color.text.inverse};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #1557b0;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`

// ==================== 组件 ====================

/**
 * ProductDetailModal - 商品详情弹窗组件
 *
 * 三列布局：
 * - 左列：缩略图列表（可垂直滚动）
 * - 中列：选中大图展示
 * - 右列：商品信息（名称、价格、规格、库存、数量选择器）
 * - 右上角：圆形关闭按钮
 */
const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const { t } = useTranslation()
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)

  // 当产品变化时重置状态
  useEffect(() => {
    setSelectedImageIndex(0)
    setQuantity(1)
  }, [product?.id])

  // 获取所有图片（主图 + 多图）
  const allImages: string[] = product
    ? [product.image, ...(product.images || [])]
    : []

  // 切换缩略图
  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedImageIndex(index)
  }, [])

  // 调整数量
  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta
      if (next < 1) return 1
      return next
    })
  }, [])

  // 加入购物车
  const handleAddToCart = useCallback(() => {
    if (product && onAddToCart) {
      onAddToCart(product, quantity)
    }
  }, [product, quantity, onAddToCart])

  // 点击遮罩关闭
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!product) return null

  const isLowStock = (product.stock ?? 0) <= 5 && (product.stock ?? 0) > 0
  const isOutOfStock = (product.stock ?? 0) === 0

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalBody>
        {/* 右上角关闭按钮 */}
        <CloseButton onClick={onClose} aria-label={t('store.productDetailModal.close')}>
          &#x2715;
        </CloseButton>

        {/* 左列：缩略图列表 */}
        {allImages.length > 1 && (
          <ThumbnailList>
            {allImages.map((img, index) => (
              <ThumbnailItem
                key={`thumb-${index}`}
                $active={index === selectedImageIndex}
                onClick={() => handleThumbnailClick(index)}
              >
                <ThumbnailImage src={img} alt={`${product.name} thumbnail ${index + 1}`} />
              </ThumbnailItem>
            ))}
          </ThumbnailList>
        )}

        {/* 中列：主图展示 */}
        <MainImageContainer>
          <MainImage
            src={allImages[selectedImageIndex] || product.image}
            alt={product.name}
          />
        </MainImageContainer>

        {/* 右列：商品信息 */}
        <InfoPanel>
          <ProductName>{product.name}</ProductName>
          <ProductPrice>${product.price.toFixed(2)}</ProductPrice>

          {/* 规格参数 */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <>
              <SectionTitle>{t('store.productDetailModal.specifications')}</SectionTitle>
              <SpecsList>
                {Object.entries(product.specs).map(([key, value]) => (
                  <SpecItem key={key}>
                    <span>{key}</span>
                    <span>{value}</span>
                  </SpecItem>
                ))}
              </SpecsList>
            </>
          )}

          {/* 库存信息 */}
          {product.stock !== undefined && (
            <>
              <SectionTitle>{t('store.productDetailModal.stock')}</SectionTitle>
              {isOutOfStock ? (
                <StockInfo $lowStock={true}>{t('store.productDetailModal.outOfStock')}</StockInfo>
              ) : (
                <StockInfo $lowStock={isLowStock}>
                  {isLowStock
                    ? t('store.productDetailModal.onlyLeft').replace('{count}', String(product.stock))
                    : t('store.productDetailModal.available').replace('{count}', String(product.stock))}
                </StockInfo>
              )}
            </>
          )}

          {/* 数量选择器 */}
          <QuantitySelector>
            <QuantityButton
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1 || isOutOfStock}
              aria-label={t('store.productDetailModal.decrease')}
            >
              &minus;
            </QuantityButton>
            <QuantityDisplay>{quantity}</QuantityDisplay>
            <QuantityButton
              onClick={() => handleQuantityChange(1)}
              disabled={isOutOfStock}
              aria-label={t('store.productDetailModal.increase')}
            >
              +
            </QuantityButton>
          </QuantitySelector>

          {/* 加入购物车按钮 */}
          <AddToCartButton
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {t('store.productDetailModal.addToCart')}
          </AddToCartButton>
        </InfoPanel>
      </ModalBody>
    </ModalOverlay>
  )
}

export default ProductDetailModal