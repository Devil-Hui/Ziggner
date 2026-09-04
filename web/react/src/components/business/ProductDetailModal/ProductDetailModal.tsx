import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { publicAPI, type PublicSPUDetail, type PublicSKU, type FavoriteItem } from '../../../api/public'
import { useTranslation } from '../../../i18n'
import { useUser } from '../../../store/UserContext'
import { useCurrency } from '../../../store/CurrencyContext'
import { Color, Radius, Shadow, FontSize, Transition, Type } from '../../../theme/tokens'
import { zIndex } from '../../../styles/zIndex'
import { resolveMediaUrl } from '../../../api/chat'

export interface ProductDetailModalProps {
  productId: number | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (skuId: number, quantity: number, product: PublicSPUDetail, sku: PublicSKU) => void
  onToggleFavorite?: (productId: number, nextFavorited: boolean) => void
}

/**
 * 加购快览弹窗（Quick Add）— SHEIN 规范：参数优先
 * ─────────────────────────────────────────────────────────
 * 只做一件事：让用户用最短路径选完规格并加购。
 *   · 左：紧凑单图（锁死 3:4，任何视口不变形）+ 极小缩略图条，无大图画廊／左右箭头
 *   · 右：参数面板 —— 名称/价格/SKU → 规格组（必选）→ 库存 → 数量 → 加购
 *   · 移除长描述，弹窗不为「逛」服务，详情页才是
 * 保留：规格可用性判断、未选全提示、低库存、移动端下拉关闭、成功后自动关闭。
 */

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`

const sheetUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(14, 16, 19, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${zIndex.modal};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: opacity 0.22s ease, visibility 0.22s ease;
  padding: 20px;
  animation: ${({ $isOpen }) => ($isOpen ? fadeIn : 'none')} 0.22s ease;

  @media (max-width: 768px) {
    align-items: flex-end;
    padding: 0;
  }
`

const ModalBody = styled.div<{ $dragY?: number; $dragging?: boolean }>`
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  width: min(860px, 100%);
  max-height: min(88vh, 700px);
  background: ${Color.bg.card};
  border-radius: ${Radius.panel}px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 16px 48px rgba(14, 16, 19, 0.28);
  animation: ${slideUp} 0.26s cubic-bezier(0.22, 1, 0.36, 1);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    max-height: 92vh;
    border-radius: ${Radius.xl}px ${Radius.xl}px 0 0;
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
    height: 24px;
    z-index: 13;
    cursor: grab;
    touch-action: none;

    &::after {
      content: '';
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: ${Color.border.medium};
    }

    &:active {
      cursor: grabbing;
    }
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid ${Color.border.light};
  background: ${Color.bg.card};
  color: ${Color.text.primary};
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  transition: background ${Transition.fast}, border-color ${Transition.fast};

  &:hover {
    background: ${Color.primaryLight};
    border-color: ${Color.border.medium};
  }
`

/* ── 左：紧凑主图 ─────────────────────────────────────────── */
const MediaCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: ${Color.bg.sunken};
  border-right: 1px solid ${Color.border.light};
  min-width: 0;

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${Color.border.light};
    padding: 30px 14px 12px;
  }
`

/** 锁死 3:4：无论弹窗如何缩放，画幅比例恒定不塌陷 */
const MainImageBox = styled.div`
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: ${Radius.md}px;
  overflow: hidden;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};

  @media (max-width: 768px) {
    max-height: 42vh;
  }
`

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const ThumbRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${Color.border.medium};
    border-radius: 2px;
  }
`

const ThumbItem = styled.button<{ $active: boolean }>`
  width: 46px;
  height: 60px;
  flex-shrink: 0;
  aspect-ratio: 3 / 4;
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: ${Color.bg.card};
  border: 2px solid ${({ $active }) => ($active ? Color.text.primary : Color.border.light)};
  transition: border-color ${Transition.fast};

  &:hover {
    border-color: ${Color.text.primary};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

/* ── 右：参数面板 ─────────────────────────────────────────── */
const ParamCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  padding: 26px 26px 22px;

  @media (max-width: 768px) {
    padding: 18px 18px 16px;
    -webkit-overflow-scrolling: touch;
  }
`

const BrandTag = styled.div`
  ${Type.wideCaps}
  font-size: 0.7rem;
  font-weight: 700;
  color: ${Color.text.muted};
  margin-bottom: 8px;
`

const ProductName = styled.h2`
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.4;
  ${Type.tight}
  color: ${Color.text.primary};
  margin: 0 0 12px;
`

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
`

const CurrentPrice = styled.span`
  ${Type.tnum}
  font-size: 1.75rem;
  font-weight: 700;
  ${Type.tighter}
  color: ${Color.text.primary};
`

const OriginalPrice = styled.span`
  ${Type.tnum}
  font-size: 0.95rem;
  color: ${Color.text.muted};
  text-decoration: line-through;
`

const SkuCode = styled.div`
  ${Type.tnum}
  font-size: 0.78rem;
  color: ${Color.text.muted};
  margin-bottom: 18px;
`

const SpecBlock = styled.div`
  margin-bottom: 16px;
`

const SpecTitle = styled.h4`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${Color.text.primary};
  margin: 0 0 10px;
  display: flex;
  align-items: center;
`

const RequiredMark = styled.span`
  color: ${Color.status.error};
  margin-left: 4px;
  font-weight: 700;
`

const SpecOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

/** SHEIN 式方形规格按钮：选中墨黑描边 + 反色，不可选置灰加删除线 */
const SpecOption = styled.button<{ $selected: boolean; $disabled?: boolean }>`
  min-width: 56px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: ${Radius.sm}px;
  border: ${({ $selected, $disabled }) =>
    $disabled
      ? `1px solid ${Color.border.light}`
      : $selected
        ? `2px solid ${Color.text.primary}`
        : `1px solid ${Color.border.medium}`};
  background: ${({ $selected, $disabled }) =>
    $disabled ? Color.bg.sunken : $selected ? Color.text.primary : Color.bg.card};
  color: ${({ $selected, $disabled }) =>
    $disabled ? Color.text.muted : $selected ? Color.text.inverse : Color.text.primary};
  font-size: 0.85rem;
  font-weight: ${({ $selected }) => ($selected ? 700 : 400)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  text-decoration: ${({ $disabled }) => ($disabled ? 'line-through' : 'none')};
  transition: border-color ${Transition.fast}, background ${Transition.fast};

  &:hover:not(:disabled) {
    border-color: ${Color.text.primary};
  }
`

const HintText = styled.div<{ $tone?: 'muted' | 'warn' | 'ok' }>`
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 8px;
  color: ${({ $tone }) =>
    $tone === 'warn'
      ? Color.status.error
      : $tone === 'ok'
        ? Color.status.success
        : Color.text.muted};
`

const Divider = styled.div`
  height: 1px;
  background: ${Color.border.light};
  margin: 4px 0 16px;
`

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
`

const QuantityLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${Color.text.primary};
`

const Stepper = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid ${Color.border.medium};
  border-radius: ${Radius.sm}px;
  overflow: hidden;
`

const StepBtn = styled.button`
  width: 34px;
  height: 34px;
  border: none;
  background: ${Color.bg.card};
  color: ${Color.text.primary};
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${Transition.fast};

  &:hover:not(:disabled) {
    background: ${Color.primaryLight};
  }

  &:disabled {
    color: ${Color.border.dark};
    cursor: not-allowed;
  }
`

const QuantityDisplay = styled.span`
  ${Type.tnum}
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  font-size: ${FontSize.md}px;
  border-left: 1px solid ${Color.border.light};
  border-right: 1px solid ${Color.border.light};
  line-height: 34px;
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
    background: ${Color.bg.card};
    padding-bottom: env(safe-area-inset-bottom, 0);
    z-index: 4;
  }
`

const AddToCartButton = styled.button`
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 999px;
  background: ${Color.primary};
  color: ${Color.text.inverse};
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background ${Transition.fast}, box-shadow ${Transition.fast};

  &:hover:not(:disabled) {
    background: ${Color.primaryHover};
    box-shadow: 0 8px 20px -10px rgba(14, 16, 19, 0.6);
  }

  &:disabled {
    background: ${Color.primaryLight};
    color: ${Color.text.muted};
    cursor: not-allowed;
  }
`

const SecondaryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const GhostButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  height: 38px;
  border: 1px solid ${({ $active }) => ($active ? Color.text.primary : Color.border.medium)};
  border-radius: 999px;
  background: ${({ $active }) => ($active ? Color.primaryLight : Color.bg.card)};
  color: ${Color.text.primary};
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color ${Transition.fast}, background ${Transition.fast};

  &:hover:not(:disabled) {
    border-color: ${Color.text.primary};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const StateBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: ${Color.text.muted};
  font-size: 0.9rem;
  grid-column: 1 / -1;
`

function isSkuSellable(sku: PublicSKU): boolean {
  if ((sku.stock ?? 0) <= 0) return false
  if (sku.shelf_status && sku.shelf_status !== 'on') return false
  return true
}

function collectImages(detail: PublicSPUDetail | null, selectedSku: PublicSKU | null): string[] {
  if (!detail) return []
  const list: string[] = []
  if (selectedSku?.image_url) list.push(resolveMediaUrl(selectedSku.image_url) || selectedSku.image_url)
  for (const m of detail.media || []) {
    if (m.media_type === 'video') {
      const thumb = m.video_large_url || m.video_list_url || m.video_thumb_url
      if (thumb) list.push(resolveMediaUrl(thumb) || thumb)
      continue
    }
    // 详情大图优先用 original（≤2560px 高清），Retina 屏放大不糊；
    // 回退 large(800) → list(400) → thumb(200)。
    const url = m.original_url || m.large_url || m.list_url || m.thumb_url
    if (url) list.push(resolveMediaUrl(url) || url)
  }
  if (detail.main_image) list.push(resolveMediaUrl(detail.main_image) || detail.main_image)
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
  const { format } = useCurrency()
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
  const selectedImageUrl = resolveMediaUrl(images[selectedImageIndex] || detail?.main_image)

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
  }, [productId, isLoggedIn, isFavorited, favLoading, onToggleFavorite, redirectLogin])

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
            {/* 左：紧凑单图 + 极小缩略图条（无大图画廊、无左右箭头） */}
            <MediaCol>
              <MainImageBox>
                {selectedImageUrl ? (
                  <MainImage src={selectedImageUrl} alt={detail.name} />
                ) : null}
              </MainImageBox>
              {images.length > 1 && (
                <ThumbRow>
                  {images.slice(0, 6).map((img, index) => (
                    <ThumbItem
                      key={`${img}-${index}`}
                      $active={index === selectedImageIndex}
                      onClick={() => setSelectedImageIndex(index)}
                      type="button"
                      aria-label={`${detail.name} ${index + 1}`}
                    >
                      <img src={img} alt="" />
                    </ThumbItem>
                  ))}
                </ThumbRow>
              )}
            </MediaCol>

            {/* 右：参数面板 —— 弹窗的主体，只服务于「选规格 + 加购」 */}
            <ParamCol>
              {detail.brand_name && <BrandTag>{detail.brand_name}</BrandTag>}
              <ProductName>{detail.name}</ProductName>

              <PriceRow>
                <CurrentPrice>
                  {selectedSku ? format(displayPrice) : `${t('store.productDetailModal.from')} ${format(displayPrice)}`}
                </CurrentPrice>
                {originalPrice != null && originalPrice > displayPrice && (
                  <OriginalPrice>{format(originalPrice)}</OriginalPrice>
                )}
              </PriceRow>

              {selectedSku && (
                <SkuCode>
                  {t('store.category.skuPrefix')}
                  {selectedSku.sku_code || selectedSku.id}
                </SkuCode>
              )}

              {specGroups.map(spec => (
                <SpecBlock key={spec.name}>
                  <SpecTitle>
                    {spec.name}
                    {!selectedSpecs[spec.name] && <RequiredMark>*</RequiredMark>}
                  </SpecTitle>
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
                </SpecBlock>
              ))}

              {hasSpecs && !allSpecsSelected && (
                <HintText $tone="warn">{t('store.productDetailModal.selectAllOptions')}</HintText>
              )}

              {allSpecsSelected && (
                <HintText $tone={isOutOfStock ? 'warn' : isLowStock ? 'warn' : 'ok'}>
                  {isOutOfStock
                    ? t('store.productDetailModal.outOfStock')
                    : isLowStock
                      ? t('store.productDetailModal.onlyLeft').replace('{count}', String(stock))
                      : t('store.productDetailModal.available').replace('{count}', String(stock))}
                </HintText>
              )}

              <Divider />

              <QuantityRow>
                <QuantityLabel>{t('store.product.quantity')}</QuantityLabel>
                <Stepper>
                  <StepBtn
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || adding}
                    aria-label={t('store.productDetailModal.decrease')}
                  >
                    −
                  </StepBtn>
                  <QuantityDisplay>{quantity}</QuantityDisplay>
                  <StepBtn
                    type="button"
                    onClick={() =>
                      setQuantity(q => Math.min(allSpecsSelected && stock > 0 ? stock : 99, q + 1))
                    }
                    disabled={adding || (allSpecsSelected && stock > 0 && quantity >= stock)}
                    aria-label={t('store.productDetailModal.increase')}
                  >
                    +
                  </StepBtn>
                </Stepper>
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
                  <GhostButton
                    type="button"
                    $active={isFavorited}
                    disabled={favLoading}
                    onClick={handleToggleFavorite}
                  >
                    {isFavorited ? t('store.productDetailModal.favorited') : t('store.product.wishlist')}
                  </GhostButton>
                  <GhostButton
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/product/${detail.id}`)
                    }}
                  >
                    {t('store.product.productDetail')}
                  </GhostButton>
                </SecondaryRow>
                {successMsg && <HintText $tone="ok">{successMsg}</HintText>}
              </FooterActions>
            </ParamCol>
          </>
        )}
      </ModalBody>
    </ModalOverlay>
  )
}

export default ProductDetailModal
