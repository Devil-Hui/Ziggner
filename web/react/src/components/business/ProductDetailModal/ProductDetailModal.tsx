import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { publicAPI, type PublicSPUDetail, type PublicSKU, type FavoriteItem } from '../../../api/public'
import { useTranslation } from '../../../i18n'
import { useUser } from '../../../store/UserContext'
import { Color, FontSize, Transition } from '../../../theme/tokens'
import { zIndex } from '../../../styles/zIndex'
import { optionalMediaUrl } from '../../../utils/mediaUrl'

export interface ProductDetailModalProps {
  productId: number | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (skuId: number, quantity: number, product: PublicSPUDetail, sku: PublicSKU) => void
  onToggleFavorite?: (productId: number, nextFavorited: boolean) => void
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const sheetUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${zIndex.modal};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: opacity 0.25s ease, visibility 0.25s ease;
  padding: 16px;
  animation: ${({ $isOpen }) => ($isOpen ? fadeIn : 'none')} 0.25s ease;

  @media (max-width: 768px) {
    align-items: flex-end;
    justify-content: stretch;
    padding: 0;
  }
`

const ModalBody = styled.div<{ $dragY?: number; $dragging?: boolean }>`
  display: flex;
  width: min(1080px, 96vw);
  height: min(720px, 90vh);
  background: ${Color.bg.card};
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
  animation: ${slideUp} 0.28s ease;

  @media (max-width: 900px) and (min-width: 769px) {
    flex-direction: column;
    width: 96vw;
    height: 92vh;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100vw;
    height: min(92vh, 860px);
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
    overflow: hidden;
    animation: ${({ $dragging }) => ($dragging ? 'none' : sheetUp)} 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    transform: translateY(${({ $dragY = 0 }) => $dragY}px);
    transition: ${({ $dragging }) => ($dragging ? 'none' : 'transform 0.22s ease')};
    will-change: transform;
    touch-action: pan-y;
  }
`

const SheetHandle = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 28px;
    z-index: 13;
    cursor: grab;
    touch-action: none;

    &::after {
      content: '';
      width: 42px;
      height: 4px;
      border-radius: 999px;
      background: #d0d0d0;
    }

    &:active {
      cursor: grabbing;
    }
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.85);
  }

  @media (max-width: 768px) {
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.5);
  }
`

const Gallery = styled.div`
  flex: 1.15;
  display: flex;
  min-width: 0;
  background: #fafafa;
  border-right: 1px solid ${Color.border.light};

  @media (max-width: 900px) and (min-width: 769px) {
    flex: none;
    height: 48vh;
    border-right: none;
    border-bottom: 1px solid ${Color.border.light};
  }

  @media (max-width: 768px) {
    flex: none;
    height: 42vh;
    min-height: 240px;
    border-right: none;
    border-bottom: 1px solid ${Color.border.light};
  }
`

const ThumbnailList = styled.div`
  width: 84px;
  min-width: 84px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 10px;
  overflow-y: auto;
  background: #f5f5f5;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
  }

  @media (max-width: 900px) and (min-width: 769px) {
    width: 72px;
    min-width: 72px;
  }

  @media (max-width: 768px) {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    min-width: 0;
    height: auto;
    flex-direction: row;
    gap: 8px;
    padding: 10px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    background: linear-gradient(to top, rgba(255,255,255,0.96), rgba(255,255,255,0.72));
    z-index: 5;
  }
`

const ThumbnailItem = styled.button<{ $active: boolean }>`
  width: 64px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${({ $active }) => ($active ? '#222' : 'transparent')};
  padding: 0;
  background: #fff;
  flex-shrink: 0;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #222;
  }

  @media (max-width: 768px) {
    width: 52px;
    height: 64px;
  }
`

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const MainImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  position: relative;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 16px 16px 72px;
  }
`

const MainImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
`

const NavBtn = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 12px;' : 'right: 12px;')}
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${Color.border.medium};
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  font-size: 18px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &:hover {
    background: #fff;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`

const InfoPanel = styled.div`
  width: 380px;
  min-width: 320px;
  max-width: 42%;
  padding: 28px 24px 24px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  @media (max-width: 900px) and (min-width: 769px) {
    width: 100%;
    max-width: none;
    min-width: 0;
  }

  @media (max-width: 768px) {
    width: 100%;
    max-width: none;
    min-width: 0;
    flex: 1;
    padding: 16px 16px 18px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
`

const BrandTag = styled.div`
  font-size: 0.75rem;
  color: #888;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 8px;
`

const ProductName = styled.h2`
  font-size: 1.15rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 10px;
  line-height: 1.4;
`

const ProductPrice = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
`

const CurrentPrice = styled.span`
  font-size: 1.6rem;
  font-weight: 700;
  color: #e74c3c;
`

const OriginalPrice = styled.span`
  font-size: 0.95rem;
  color: #999;
  text-decoration: line-through;
`

const SkuCode = styled.div`
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 16px;
`

const SectionTitle = styled.h4`
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
  margin: 14px 0 10px;
`

const SpecOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const SpecOption = styled.button<{ $selected: boolean; $disabled?: boolean }>`
  min-width: 44px;
  padding: 8px 12px;
  border: 1px solid ${({ $selected, $disabled }) =>
    $disabled ? '#e5e5e5' : $selected ? '#222' : Color.border.medium};
  background: ${({ $selected, $disabled }) =>
    $disabled ? '#f5f5f5' : $selected ? '#111' : '#fff'};
  color: ${({ $selected, $disabled }) =>
    $disabled ? '#bbb' : $selected ? '#fff' : '#333'};
  border-radius: 4px;
  font-size: 0.82rem;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.7 : 1)};
  text-decoration: ${({ $disabled }) => ($disabled ? 'line-through' : 'none')};
  transition: ${Transition.fast};

  &:hover:not(:disabled) {
    border-color: #222;
  }
`

const StockInfo = styled.div<{ $low: boolean }>`
  font-size: 0.82rem;
  color: ${({ $low }) => ($low ? '#e74c3c' : '#2e7d32')};
  font-weight: 600;
  margin-top: 4px;
`

const Description = styled.p`
  font-size: 0.85rem;
  color: #666;
  line-height: 1.55;
  margin: 0;
`

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
`

const QuantityButton = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid ${Color.border.medium};
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    border-color: #222;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const QuantityDisplay = styled.span`
  min-width: 28px;
  text-align: center;
  font-weight: 600;
  font-size: ${FontSize.md}px;
`

const FooterActions = styled.div`
  margin-top: auto;
  padding-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 768px) {
    position: sticky;
    bottom: 0;
    background: linear-gradient(to top, #fff 70%, rgba(255,255,255,0.92));
    padding-top: 12px;
    padding-bottom: env(safe-area-inset-bottom, 0);
    z-index: 4;
  }
`

const SecondaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const FavButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  padding: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#e74c3c' : '#ddd')};
  border-radius: 6px;
  background: ${({ $active }) => ($active ? '#fff5f5' : '#fff')};
  color: ${({ $active }) => ($active ? '#e74c3c' : '#333')};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: #e74c3c;
    color: #e74c3c;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const AddToCartButton = styled.button`
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: 6px;
  background: #111;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #000;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`

const ViewDetailLink = styled.button`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    border-color: #999;
  }
`

const StateBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
  width: 100%;
`

const SuccessTip = styled.div`
  margin-top: 8px;
  font-size: 0.82rem;
  color: #2e7d32;
  font-weight: 600;
  text-align: center;
`

function isSkuSellable(sku: PublicSKU): boolean {
  if ((sku.stock ?? 0) <= 0) return false
  if (sku.shelf_status && sku.shelf_status !== 'on') return false
  return true
}

function collectImages(detail: PublicSPUDetail | null, selectedSku: PublicSKU | null): string[] {
  if (!detail) return []
  const list: string[] = []
  if (selectedSku?.image_url) list.push(selectedSku.image_url)
  for (const m of detail.media || []) {
    if (m.media_type === 'video') {
      const thumb = m.video_large_url || m.video_list_url || m.video_thumb_url
      if (thumb) list.push(thumb)
      continue
    }
    const url = m.large_url || m.original_url || m.list_url || m.thumb_url
    if (url) list.push(url)
  }
  if (detail.main_image) list.push(detail.main_image)
  return Array.from(new Set(list.filter(Boolean)))
}

function deriveSpecGroups(detail: PublicSPUDetail | null): { name: string; values: string[] }[] {
  if (!detail) return []
  if (Array.isArray(detail.specs) && detail.specs.length > 0) {
    return detail.specs.map(s => ({ name: s.name, values: s.values || [] }))
  }
  const map: Record<string, Set<string>> = {}
  for (const sku of detail.skus || []) {
    if (!sku.spec_values) continue
    for (const [k, v] of Object.entries(sku.spec_values)) {
      if (!map[k]) map[k] = new Set()
      map[k].add(v)
    }
  }
  return Object.entries(map).map(([name, values]) => ({ name, values: Array.from(values) }))
}

/** 在已选其他规格下，该规格值是否仍存在可售 SKU */
function isSpecValueAvailable(
  detail: PublicSPUDetail | null,
  selectedSpecs: Record<string, string>,
  specName: string,
  value: string,
): boolean {
  if (!detail?.skus?.length) return false
  return detail.skus.some(sku => {
    if (!sku.spec_values || !isSkuSellable(sku)) return false
    if (sku.spec_values[specName] !== value) return false
    return Object.entries(selectedSpecs).every(([k, v]) => {
      if (k === specName) return true
      return !v || sku.spec_values[k] === v
    })
  })
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  isOpen,
  onClose,
  onAddToCart,
  onToggleFavorite,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const [detail, setDetail] = useState<PublicSPUDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({})
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [successMsg, setSuccessMsg] = useState('')
  const [adding, setAdding] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const dragDeltaY = useRef(0)
  const closeTimerRef = useRef<number | null>(null)

  // Load SPU detail when opening
  useEffect(() => {
    if (!isOpen || !productId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setDetail(null)
    setSelectedSpecs({})
    setSelectedImageIndex(0)
    setQuantity(1)
    setSuccessMsg('')
    setAdding(false)
    setIsFavorited(false)
    setDragY(0)
    setDragging(false)
    dragStartY.current = null
    dragDeltaY.current = 0
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    publicAPI
      .getSPUDetail(productId)
      .then(async data => {
        if (cancelled) return
        setDetail(data)
        // 浮窗要求用户手动完成全部规格选择，不预选默认值
        setSelectedSpecs({})
        if (isLoggedIn) {
          try {
            const fav = await publicAPI.getFavorites({ page: 1, per_page: 100 })
            const items: FavoriteItem[] = Array.isArray(fav)
              ? (fav as FavoriteItem[])
              : ((fav as { results?: FavoriteItem[] }).results ?? [])
            if (!cancelled) {
              setIsFavorited(items.some(f => Number(f.spu_id) === productId))
            }
          } catch {
            // ignore favorite status errors in modal
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('store.product.notFound'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [isOpen, productId, t, isLoggedIn])

  const specGroups = useMemo(() => deriveSpecGroups(detail), [detail])

  const hasSpecs = specGroups.length > 0

  // 所有规格维度都已选择
  const allSpecsSelected = useMemo(() => {
    if (!hasSpecs) return true
    return specGroups.every(g => Boolean(selectedSpecs[g.name]))
  }, [hasSpecs, specGroups, selectedSpecs])

  // 精确匹配 SKU：未选齐规格时返回 null（不 fallback 到第一个）
  const selectedSku = useMemo(() => {
    if (!detail?.skus?.length) return null
    // 无规格商品：优先第一个可售 SKU
    if (!hasSpecs) return detail.skus.find(isSkuSellable) || detail.skus[0] || null
    // 未选齐：不可加购
    if (!allSpecsSelected) return null
    return (
      detail.skus.find(sku => {
        if (!sku.spec_values) return false
        return Object.entries(selectedSpecs).every(
          ([name, value]) => sku.spec_values[name] === value,
        )
      }) || null
    )
  }, [detail, selectedSpecs, hasSpecs, allSpecsSelected])

  // 展示价：已选中 SKU 用 SKU 价；否则用最低可售价作参考
  const displayPrice = useMemo(() => {
    if (selectedSku) {
      return Number(selectedSku.discount_price ?? selectedSku.price ?? 0)
    }
    if (!detail?.skus?.length) return 0
    const prices = detail.skus
      .filter(isSkuSellable)
      .map(s => Number(s.discount_price ?? s.price ?? 0))
      .filter(n => n > 0)
    if (prices.length) return Math.min(...prices)
    const all = detail.skus.map(s => Number(s.discount_price ?? s.price ?? 0)).filter(n => n > 0)
    return all.length ? Math.min(...all) : 0
  }, [selectedSku, detail])

  const originalPrice = selectedSku?.discount_price
    ? Number(selectedSku.price)
    : undefined

  const images = useMemo(() => collectImages(detail, selectedSku), [detail, selectedSku])
  const selectedImageUrl = optionalMediaUrl(images[selectedImageIndex] || detail?.main_image)

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [selectedSku?.id, detail?.id])

  // 已选规格若因互斥变得无效，自动清理
  useEffect(() => {
    if (!detail || !hasSpecs) return
    setSelectedSpecs(prev => {
      let changed = false
      const next = { ...prev }
      for (const [name, value] of Object.entries(prev)) {
        if (!value) continue
        if (!isSpecValueAvailable(detail, prev, name, value)) {
          delete next[name]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [detail, hasSpecs, selectedSpecs])

  const stock = selectedSku?.stock ?? 0
  const isOutOfStock = allSpecsSelected && (!selectedSku || !isSkuSellable(selectedSku) || stock <= 0)
  const isLowStock = allSpecsSelected && stock > 0 && stock <= 5
  const canAddToCart = Boolean(selectedSku) && allSpecsSelected && !isOutOfStock

  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) return
    dragStartY.current = e.touches[0].clientY
    dragDeltaY.current = 0
    setDragging(true)
  }, [])

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current == null) return
    const delta = e.touches[0].clientY - dragStartY.current
    // only allow downward drag to dismiss
    const next = Math.max(0, delta)
    dragDeltaY.current = next
    setDragY(next)
  }, [])

  const handleSheetTouchEnd = useCallback(() => {
    if (dragStartY.current == null) return
    const delta = dragDeltaY.current
    dragStartY.current = null
    setDragging(false)
    if (delta > 120) {
      setDragY(0)
      onClose()
      return
    }
    setDragY(0)
    dragDeltaY.current = 0
  }, [onClose])

  const handleOverlayClick = useCallback(

    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // lock body scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, onClose])

  const redirectLogin = useCallback(() => {
    navigate(
      `/auth?tab=login&redirect=${encodeURIComponent(
        window.location.pathname + window.location.search,
      )}`,
    )
  }, [navigate])

  const handleToggleFavorite = useCallback(async () => {
    if (!productId || favLoading) return
    if (!isLoggedIn) {
      redirectLogin()
      return
    }
    setFavLoading(true)
    const prev = isFavorited
    setIsFavorited(!prev)
    try {
      if (prev) {
        await publicAPI.removeFavorite(productId)
        onToggleFavorite?.(productId, false)
      } else {
        await publicAPI.addFavorite(productId)
        onToggleFavorite?.(productId, true)
      }
    } catch {
      setIsFavorited(prev)
    } finally {
      setFavLoading(false)
    }
  }, [productId, isLoggedIn, isFavorited, onToggleFavorite, favLoading, redirectLogin])

  const handleAddToCart = useCallback(() => {
    if (!detail || !selectedSku || !canAddToCart || adding) return
    setAdding(true)
    try {
      onAddToCart?.(selectedSku.id, quantity, detail, selectedSku)
      setSuccessMsg(t('store.product.addedToCart'))
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = window.setTimeout(() => {
        setSuccessMsg('')
        setAdding(false)
        onClose()
      }, 900)
    } catch {
      setAdding(false)
    }
  }, [detail, selectedSku, canAddToCart, onAddToCart, quantity, t, onClose, adding])

  if (!isOpen) return null

  return (
    <ModalOverlay $isOpen={isOpen} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <ModalBody $dragY={dragY} $dragging={dragging}>
        <SheetHandle
          aria-hidden
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
        />
        <CloseButton onClick={onClose} aria-label={t('store.productDetailModal.close')}>
          &#x2715;
        </CloseButton>

        {loading && <StateBox>{t('common.loading')}</StateBox>}
        {!loading && error && <StateBox>{error}</StateBox>}

        {!loading && !error && detail && (
          <>
            <Gallery>
              {images.length > 1 && (
                <ThumbnailList>
                  {images.map((img, index) => (
                    <ThumbnailItem
                      key={`${img}-${index}`}
                      $active={index === selectedImageIndex}
                      onClick={() => setSelectedImageIndex(index)}
                      type="button"
                    >
                      <ThumbnailImage src={img} alt={`${detail.name} ${index + 1}`} />
                    </ThumbnailItem>
                  ))}
                </ThumbnailList>
              )}

              <MainImageContainer>
                {images.length > 1 && (
                  <NavBtn
                    $side="left"
                    type="button"
                    disabled={selectedImageIndex <= 0}
                    onClick={() => setSelectedImageIndex(i => Math.max(0, i - 1))}
                    aria-label="Previous image"
                  >
                    ‹
                  </NavBtn>
                )}
                {selectedImageUrl && (
                  <MainImage
                    src={selectedImageUrl}
                    alt={detail.name}
                  />
                )}
                {images.length > 1 && (
                  <NavBtn
                    $side="right"
                    type="button"
                    disabled={selectedImageIndex >= images.length - 1}
                    onClick={() => setSelectedImageIndex(i => Math.min(images.length - 1, i + 1))}
                    aria-label="Next image"
                  >
                    ›
                  </NavBtn>
                )}
              </MainImageContainer>
            </Gallery>

            <InfoPanel>
              {detail.brand_name && <BrandTag>{detail.brand_name}</BrandTag>}
              <ProductName>{detail.name}</ProductName>

              <ProductPrice>
                <CurrentPrice>
                  {selectedSku ? `$${displayPrice.toFixed(2)}` : `${t('store.productDetailModal.from')} $${displayPrice.toFixed(2)}`}
                </CurrentPrice>
                {originalPrice != null && originalPrice > displayPrice && (
                  <OriginalPrice>${originalPrice.toFixed(2)}</OriginalPrice>
                )}
              </ProductPrice>

              {selectedSku && (
                <SkuCode>
                  {t('store.category.skuPrefix')}
                  {selectedSku.sku_code || selectedSku.id}
                </SkuCode>
              )}

              {specGroups.map(spec => (
                <div key={spec.name}>
                  <SectionTitle>
                    {spec.name}
                    {!selectedSpecs[spec.name] && (
                      <span style={{ color: '#e74c3c', marginLeft: 6, fontWeight: 500 }}>
                        *
                      </span>
                    )}
                  </SectionTitle>
                  <SpecOptions>
                    {spec.values.map(val => {
                      const available = isSpecValueAvailable(detail, selectedSpecs, spec.name, val)
                      const selected = selectedSpecs[spec.name] === val
                      return (
                        <SpecOption
                          key={val}
                          type="button"
                          $selected={selected}
                          $disabled={!available}
                          disabled={!available}
                          title={!available ? t('store.productDetailModal.optionUnavailable') : undefined}
                          onClick={() => {
                            if (!available) return
                            setSelectedSpecs(prev => {
                              // 再次点击已选项 → 取消选择
                              if (prev[spec.name] === val) {
                                const next = { ...prev }
                                delete next[spec.name]
                                return next
                              }
                              return { ...prev, [spec.name]: val }
                            })
                          }}
                        >
                          {val}
                        </SpecOption>
                      )
                    })}
                  </SpecOptions>
                </div>
              ))}

              {hasSpecs && !allSpecsSelected && (
                <StockInfo $low style={{ marginTop: 10 }}>
                  {t('store.productDetailModal.selectAllOptions')}
                </StockInfo>
              )}

              {allSpecsSelected && (
                <>
                  <SectionTitle>{t('store.productDetailModal.stock')}</SectionTitle>
                  {isOutOfStock ? (
                    <StockInfo $low>{t('store.productDetailModal.outOfStock')}</StockInfo>
                  ) : (
                    <StockInfo $low={isLowStock}>
                      {isLowStock
                        ? t('store.productDetailModal.onlyLeft').replace('{count}', String(stock))
                        : t('store.productDetailModal.available').replace('{count}', String(stock))}
                    </StockInfo>
                  )}
                </>
              )}

              {detail.description && (
                <>
                  <SectionTitle>{t('store.category.description')}</SectionTitle>
                  <Description>{detail.description}</Description>
                </>
              )}

              <QuantityRow>
                <SectionTitle style={{ margin: 0 }}>
                  {t('store.product.quantity')}
                </SectionTitle>
                <QuantityButton
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || adding}
                  aria-label={t('store.productDetailModal.decrease')}
                >
                  −
                </QuantityButton>
                <QuantityDisplay>{quantity}</QuantityDisplay>
                <QuantityButton
                  type="button"
                  onClick={() =>
                    setQuantity(q => Math.min(allSpecsSelected && stock > 0 ? stock : 99, q + 1))
                  }
                  disabled={adding || (allSpecsSelected && stock > 0 && quantity >= stock)}
                  aria-label={t('store.productDetailModal.increase')}
                >
                  +
                </QuantityButton>
              </QuantityRow>

              <FooterActions>
                <AddToCartButton
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || adding}
                >
                  {adding
                    ? t('store.product.addedToCart')
                    : !allSpecsSelected
                      ? t('store.productDetailModal.selectAllOptions')
                      : isOutOfStock
                        ? t('store.productDetailModal.outOfStock')
                        : t('store.productDetailModal.addToCart')}
                </AddToCartButton>
                <SecondaryRow>
                  <FavButton
                    type="button"
                    $active={isFavorited}
                    disabled={favLoading}
                    onClick={handleToggleFavorite}
                  >
                    {isFavorited ? t('store.productDetailModal.favorited') : t('store.product.wishlist')}
                  </FavButton>
                  <ViewDetailLink
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/product/${detail.id}`)
                    }}
                  >
                    {t('store.product.productDetail')}
                  </ViewDetailLink>
                </SecondaryRow>
                {successMsg && <SuccessTip>{successMsg}</SuccessTip>}
              </FooterActions>
            </InfoPanel>
          </>
        )}
      </ModalBody>
    </ModalOverlay>
  )
}

export default ProductDetailModal
