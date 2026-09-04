import { Fragment, useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import PageLayout from '../../components/layout/PageLayout/PageLayout'
import Button from '../../components/common/Button/Button'
import { useCart } from '../../store/CartContext'
import { useCurrency } from '../../store/CurrencyContext'
import { showMiniCartToast } from '../../components/common/MiniCartToast'
import { openCartDropdown } from '../../utils/cartEvents'
import { useUser } from '../../store/UserContext'
import { useTranslation } from '../../i18n'
import { publicAPI, type PublicSPUDetail, type PublicSKU } from '../../api/public'
import { reviewAPI, type ReviewItem } from '../../api/review'
import { Color, Radius, Shadow, Type, FontSize, Transition } from '../../theme/tokens'
import { addProductToCart } from './productCartAction'
import { resolveMediaUrl } from '../../api/chat'

/**
 * 商品详情页 — SHEIN 三栏规范
 * ─────────────────────────────────────────────────────────
 *   [左] 缩略图列   [中] 主图（锁死 3:4）   [右] 参数面板（sticky）
 *
 * 比例铁律：图区一律用 aspect-ratio 控制，绝不用百分比高度嵌套，
 * 因此无论视口怎么缩放，画幅始终保持 3:4 同比例、不变形不塌陷。
 */

const PAGE_MAX = 1240

const Container = styled.div`
  min-height: 60vh;
  background: ${Color.bg.page};
  padding: 24px 20px 64px;
`

const Shell = styled.div`
  width: 100%;
  max-width: ${PAGE_MAX}px;
  margin-inline: auto;
`

const Breadcrumb = styled.nav`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.8rem;
  color: ${Color.text.muted};
  margin-bottom: 20px;

  a {
    color: ${Color.text.muted};
    text-decoration: none;
    transition: color ${Transition.fast};

    &:hover {
      color: ${Color.text.primary};
    }
  }
`

/* ── 三栏主体 ─────────────────────────────────────────────── */
const PdpGrid = styled.div`
  display: grid;
  gap: 20px;
  /* 左缩略图 / 中主图 / 右参数 */
  grid-template-columns: 88px minmax(0, 1fr) 380px;

  @media (max-width: 1199px) and (min-width: 900px) {
    grid-template-columns: 72px minmax(0, 1fr) 340px;
    gap: 16px;
  }

  /* 窄屏：缩略图转横向条，主图与参数各自占满一行；比例仍锁 3:4 */
  @media (max-width: 899px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
`

/* ── 左：缩略图列 ─────────────────────────────────────────── */
const ThumbCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 899px) {
    order: 2;
    flex-direction: row;
    max-height: none;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;
  }
`

const Thumb = styled.button<{ $active: boolean }>`
  width: 100%;
  aspect-ratio: 3 / 4;
  flex-shrink: 0;
  padding: 0;
  border-radius: ${Radius.sm}px;
  overflow: hidden;
  cursor: pointer;
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

  @media (max-width: 899px) {
    width: 64px;
  }
`

/* ── 中：主图 ─────────────────────────────────────────────── */
const StageCol = styled.div`
  min-width: 0;

  @media (max-width: 899px) {
    order: 1;
  }
`

/** 锁死 3:4 —— 缩放时高度由宽度推导，比例恒定 */
const Stage = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: calc(100vh - 120px);
  margin-inline: auto;
  border-radius: ${Radius.md}px;
  border: 1px solid ${Color.border.light};
  background: ${Color.bg.card};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 899px) {
    max-width: 520px;
  }
`

const EmptyStage = styled(Stage)`
  color: ${Color.text.muted};
  font-size: 2.5rem;
`

/* ── 右：参数面板 ─────────────────────────────────────────── */
const ParamCol = styled.div`
  min-width: 0;

  @media (min-width: 900px) {
    position: sticky;
    top: 96px;
    align-self: start;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
    padding-right: 2px;
  }

  @media (max-width: 899px) {
    order: 3;
  }
`

const BrandTag = styled.span`
  display: inline-block;
  ${Type.wideCaps}
  font-size: 0.7rem;
  font-weight: 700;
  color: ${Color.text.muted};
  margin-bottom: 10px;
`

const ProductName = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.35;
  ${Type.tight}
  color: ${Color.text.primary};
  margin: 0 0 14px;
`

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${Color.border.light};
`

const PriceValue = styled.span`
  ${Type.tnum}
  ${Type.tighter}
  font-size: 1.75rem;
  font-weight: 700;
  color: ${Color.text.primary};
`

const ActivityBadge = styled.span`
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${Color.text.inverse};
  background: ${Color.brand};
  padding: 3px 8px;
  border-radius: ${Radius.sm}px;
`

const OriginalPrice = styled.span`
  ${Type.tnum}
  font-size: 0.95rem;
  color: ${Color.text.muted};
  text-decoration: line-through;
`

const SpecSection = styled.div`
  margin-top: 18px;
`

const SpecLabel = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${Color.text.primary};
  margin-bottom: 10px;
`

const SpecOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

/** SHEIN 式方形规格按钮：选中墨黑描边 + 反色 */
const SpecOption = styled.button<{ $selected: boolean }>`
  min-width: 56px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: ${Radius.sm}px;
  border: ${({ $selected }) =>
    $selected ? `2px solid ${Color.text.primary}` : `1px solid ${Color.border.medium}`};
  background: ${({ $selected }) => ($selected ? Color.text.primary : Color.bg.card)};
  color: ${({ $selected }) => ($selected ? Color.text.inverse : Color.text.primary)};
  font-size: 0.85rem;
  font-weight: ${({ $selected }) => ($selected ? 700 : 400)};
  cursor: pointer;
  transition: border-color ${Transition.fast}, background ${Transition.fast};

  &:hover {
    border-color: ${Color.text.primary};
  }
`

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
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

const QtyValue = styled.span`
  ${Type.tnum}
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  font-size: ${FontSize.md}px;
  line-height: 34px;
  border-left: 1px solid ${Color.border.light};
  border-right: 1px solid ${Color.border.light};
`

const StockLabel = styled.span`
  ${Type.tnum}
  font-size: 0.82rem;
  color: ${Color.text.muted};
`

const ActionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 22px;
`

const PrimaryBtn = styled.button`
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

const SecondaryBtn = styled.button<{ $active?: boolean }>`
  width: 100%;
  height: 40px;
  border: 1px solid ${({ $active }) => ($active ? Color.text.primary : Color.border.medium)};
  border-radius: 999px;
  background: ${({ $active }) => ($active ? Color.primaryLight : Color.bg.card)};
  color: ${Color.text.primary};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color ${Transition.fast}, background ${Transition.fast};

  &:hover:not(:disabled) {
    border-color: ${Color.text.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const PromiseRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 18px;
  font-size: 0.75rem;
  color: ${Color.text.muted};

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

const Msg = styled.p<{ $ok?: boolean }>`
  font-size: 0.85rem;
  color: ${p => (p.$ok ? Color.status.success : Color.status.error)};
  margin-top: 10px;
`

/* ── 下方详情区 ───────────────────────────────────────────── */
const DetailBlock = styled.section`
  margin-top: 48px;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.lg}px;
  padding: 24px;
  box-shadow: ${Shadow.card};
`

const SectionTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${Color.text.primary};
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${Color.border.light};
`

const DescriptionText = styled.p`
  font-size: 0.9rem;
  color: ${Color.text.body};
  line-height: 1.75;
  margin: 0;
`

const SpecTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;

  th,
  td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid ${Color.border.light};
  }

  th {
    color: ${Color.text.muted};
    font-weight: 400;
    width: 160px;
  }

  td {
    color: ${Color.text.primary};
  }
`

const ReviewCard = styled.div`
  padding: 14px 16px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  margin-bottom: 10px;
`

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;

  .name {
    font-weight: 600;
    font-size: 0.88rem;
    color: ${Color.text.primary};
  }

  .date {
    font-size: 0.78rem;
    color: ${Color.text.muted};
  }
`

const Stars = styled.div`
  color: ${Color.status.warning};
  font-size: 0.85rem;
  margin-bottom: 6px;
`

const ReviewContent = styled.p`
  font-size: 0.88rem;
  color: ${Color.text.body};
  line-height: 1.6;
  margin: 0;
`

const ReviewForm = styled.div`
  margin-top: 20px;
  padding: 16px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  background: ${Color.bg.sunken};
`

const FormRow = styled.div`
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 0.82rem;
    color: ${Color.text.body};
    margin-bottom: 6px;
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid ${Color.border.medium};
    border-radius: ${Radius.sm}px;
    font-size: 0.88rem;
    box-sizing: border-box;
    background: ${Color.bg.card};
    color: ${Color.text.primary};

    &:focus {
      outline: none;
      border-color: ${Color.focus};
      box-shadow: ${Shadow.focus};
    }
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }
`

const StarSelector = styled.div`
  display: flex;
  gap: 4px;
  font-size: 1.35rem;
  cursor: pointer;

  span {
    color: ${Color.border.medium};

    &.active {
      color: ${Color.status.warning};
    }
  }
`

/** 单个图集项：缩略图(小图) + 大图 + srcset（响应式按设备宽度选图，省带宽） */
interface GalleryItem {
  /** 缩略图列用：list(400px)，Retina 下清晰且省带宽 */
  thumb: string
  /** 主图 src 兜底：original(≤2560px) 高清 */
  full: string
  /** 主图 srcset：list 400w / large 800w / original 2560w，浏览器按设备宽度自动选 */
  srcSet: string
}

/** 收集图集：SKU 图 → media 列表 → 主图，去重 */
function collectGallery(detail: PublicSPUDetail | null): GalleryItem[] {
  if (!detail) return []
  const seen = new Set<string>()
  const list: GalleryItem[] = []
  for (const m of detail.media || []) {
    if (m.media_type === 'video') {
      const thumb = m.video_large_url || m.video_list_url || m.video_thumb_url
      if (thumb) {
        const t = resolveMediaUrl(thumb) || thumb
        if (!seen.has(t)) {
          seen.add(t)
          list.push({ thumb: t, full: t, srcSet: `${t} 800w` })
        }
      }
      continue
    }
    collectGalleryItem(m, list, seen)
  }
  if (detail.main_image) {
    const full = resolveMediaUrl(detail.main_image) || detail.main_image
    if (!seen.has(full)) {
      seen.add(full)
      list.push({ thumb: full, full, srcSet: `${full} 2560w` })
    }
  }
  return list
}

function collectGalleryItem(
  m: { original_url?: string; large_url?: string; list_url?: string; thumb_url?: string },
  list: GalleryItem[],
  seen: Set<string>,
) {
  const full = m.original_url || m.large_url || m.list_url || m.thumb_url
  if (!full || seen.has(full)) return
  seen.add(full)
  const thumb = m.list_url || m.large_url || m.thumb_url || full
  const r = (u: string) => resolveMediaUrl(u) || u
  list.push({
    thumb: r(thumb),
    full: r(full),
    srcSet: [
      r(m.list_url || m.thumb_url || full) + ' 400w',
      r(m.large_url || m.list_url || full) + ' 800w',
      r(full) + ' 2560w',
    ].join(', '),
  })
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { isLoggedIn } = useUser()
  const { t } = useTranslation()
  const { format } = useCurrency()

  const [product, setProduct] = useState<PublicSPUDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({})
  const [qty, setQty] = useState(1)
  const [addedMsg, setAddedMsg] = useState('')
  const [activeImage, setActiveImage] = useState(0)

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
    if (Array.isArray(product.specs) && product.specs.length > 0) {
      return product.specs.map(s => ({ name: s.name, values: s.values || [] }))
    }
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

  const gallery = useMemo(() => collectGallery(product), [product])
  const activeImageItem = gallery[activeImage] || gallery[0]
  const activeImageUrl = activeImageItem?.full || ''

  // Fetch product
  useEffect(() => {
    const pid = Number(id)
    if (!pid) return
    setLoading(true)
    publicAPI
      .getSPUDetail(pid)
      .then(data => {
        setProduct(data)
        setActiveImage(0)
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
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
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
    reviewAPI
      .list(pid)
      .then(data => {
        setReviews(data.results || [])
        setReviewTotal(data.count || 0)
        setAvgRating(data.avg_rating || 0)
      })
      .catch(() => {})
  }, [id])

  // Fetch reviewable items
  useEffect(() => {
    if (!isLoggedIn) return
    const pid = Number(id)
    if (!pid) return
    reviewAPI
      .getReviewableItems(pid)
      .then(data => {
        setReviewableItems(data.order_items || [])
      })
      .catch(() => {})
  }, [id, isLoggedIn])

  // Check favorite status
  useEffect(() => {
    if (!isLoggedIn) return
    const pid = Number(id)
    if (!pid) return
    publicAPI
      .getFavorites({ page: 1, per_page: 100 })
      .then(data => {
        const items = data.results || data.items || []
        setIsFavorited(items.some((fav: { spu_id?: number }) => Number(fav.spu_id) === pid))
      })
      .catch(() => {})
  }, [id, isLoggedIn])

  // Find SKU by selected specs
  const selectedSku: PublicSKU | null = useMemo(() => {
    if (!product?.skus) return null
    if (Object.keys(selectedSpecs).length === 0) return product.skus[0] || null
    return (
      product.skus.find(sku => {
        if (!sku.spec_values) return false
        for (const [name, value] of Object.entries(selectedSpecs)) {
          if (sku.spec_values[name] !== value) return false
        }
        return true
      }) || product.skus[0]
    )
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
    const img =
      resolveMediaUrl(selectedSku.image_url) ||
      selectedSku.image_url ||
      resolveMediaUrl(product.main_image) ||
      product.main_image ||
      ''
    const specsText = selectedSku.spec_values
      ? Object.entries(selectedSku.spec_values)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')
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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: unknown } }; message?: string }
      const msg = e?.response?.data?.detail || e?.message || t('store.product.reviewFailed')
      setReviewMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setReviewOk(false)
    }
  }

  /** 面包屑分类链：category_path 形如 "Electronics / Phones"，拆成多级 */
  const categoryTrail = useMemo(
    () => (product?.category_path ? product.category_path.split(' / ').filter(Boolean) : []),
    [product?.category_path],
  )
  const categoryHref = product?.category_id
    ? `/category?cat_id=${product.category_id}`
    : '/category'

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <Shell>
            <p>{t('common.loading')}</p>
          </Shell>
        </Container>
      </PageLayout>
    )
  }

  if (!product) {
    return (
      <PageLayout>
        <Container>
          <Shell>
            <h1>{t('store.product.notFound')}</h1>
            <Button variant="primary" onClick={() => navigate('/category')}>
              {t('store.product.backToShop')}
            </Button>
          </Shell>
        </Container>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Container>
        <Shell>
          <Breadcrumb>
            <a href="/">{t('store.product.home')}</a> /
            <a href="/category">{t('store.product.allCategories')}</a>
            {categoryTrail.map((seg, i) => (
              <Fragment key={i}>
                {' / '}
                {i === categoryTrail.length - 1 ? (
                  <a href={categoryHref}>{seg}</a>
                ) : (
                  <span>{seg}</span>
                )}
              </Fragment>
            ))}
            {' / '}
            <span>{product.name}</span>
          </Breadcrumb>

          <PdpGrid>
            {/* 左：缩略图列 */}
            {gallery.length > 1 && (
              <ThumbCol>
                {gallery.map((item, i) => (
                  <Thumb
                    key={`${item.full}-${i}`}
                    $active={i === activeImage}
                    onClick={() => setActiveImage(i)}
                    type="button"
                    aria-label={`${product.name} ${i + 1}`}
                  >
                    <img src={item.thumb} alt="" loading="lazy" />
                  </Thumb>
                ))}
              </ThumbCol>
            )}

            {/* 中：主图（锁死 3:4） */}
            <StageCol>
              {activeImageUrl ? (
                <Stage>
                  <img
                    src={activeImageUrl}
                    srcSet={activeImageItem?.srcSet}
                    sizes="(max-width: 899px) 100vw, 60vw"
                    alt={product.name}
                  />
                </Stage>
              ) : (
                <EmptyStage aria-hidden="true">📦</EmptyStage>
              )}
            </StageCol>

            {/* 右：参数面板 */}
            <ParamCol>
              {product.brand_name && <BrandTag>{product.brand_name}</BrandTag>}
              <ProductName>{product.name}</ProductName>

              <PriceRow>
                {hasActivity && <ActivityBadge>{t('store.product.activityPrice')}</ActivityBadge>}
                <PriceValue>{format(Number(price))}</PriceValue>
                {hasActivity && (
                  <OriginalPrice>
                    {t('store.product.originalPrice')}: {format(Number(originalPrice))}
                  </OriginalPrice>
                )}
              </PriceRow>

              {/* 规格组 */}
              {specGroups.length > 0 &&
                specGroups.map(spec => (
                  <SpecSection key={spec.name}>
                    <SpecLabel>{spec.name}</SpecLabel>
                    <SpecOptions>
                      {spec.values.map((val: string) => (
                        <SpecOption
                          key={val}
                          $selected={selectedSpecs[spec.name] === val}
                          onClick={() =>
                            setSelectedSpecs(prev => ({ ...prev, [spec.name]: val }))
                          }
                        >
                          {val}
                        </SpecOption>
                      ))}
                    </SpecOptions>
                  </SpecSection>
                ))}

              <QuantityRow>
                <SpecLabel style={{ margin: 0 }}>{t('store.product.quantity')}</SpecLabel>
                <Stepper>
                  <StepBtn
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                    aria-label="-"
                  >
                    −
                  </StepBtn>
                  <QtyValue>{qty}</QtyValue>
                  <StepBtn
                    type="button"
                    onClick={() => setQty(Math.min(selectedSku?.stock || 99, qty + 1))}
                    disabled={qty >= (selectedSku?.stock || 99)}
                    aria-label="+"
                  >
                    +
                  </StepBtn>
                </Stepper>
                {selectedSku && (
                  <StockLabel>
                    {t('store.product.stock')}: {selectedSku.stock}
                  </StockLabel>
                )}
              </QuantityRow>

              <ActionStack>
                <PrimaryBtn
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedSku || (selectedSku.stock ?? 0) < 1}
                >
                  {t('store.product.addToCart')}
                </PrimaryBtn>
                <SecondaryBtn
                  type="button"
                  $active={isFavorited}
                  onClick={handleToggleFavorite}
                  disabled={favLoading}
                >
                  {favLoading ? '...' : isFavorited ? '♥ Favorited' : '♡ Add to Favorites'}
                </SecondaryBtn>
                <SecondaryBtn
                  type="button"
                  onClick={() => navigate('/profile?tab=support')}
                >
                  {t('store.product.contactSupport')}
                </SecondaryBtn>
                {addedMsg && <Msg $ok>{addedMsg}</Msg>}
              </ActionStack>

              <PromiseRow>
                <span>✓ {t('store.product.freeReturn')}</span>
                <span>✓ {t('store.product.securePay')}</span>
              </PromiseRow>
            </ParamCol>
          </PdpGrid>

          {/* 描述 */}
          <DetailBlock>
            <SectionTitle>{t('store.product.description')}</SectionTitle>
            <DescriptionText>
              {product.description || t('store.product.noDescription')}
            </DescriptionText>
          </DetailBlock>

          {/* 规格参数 */}
          <DetailBlock>
            <SectionTitle>{t('store.product.specifications')}</SectionTitle>
            {product.attributes && product.attributes.length > 0 ? (
              <SpecTable>
                <tbody>
                  {product.attributes.map((attr: { name: string; value: string }) => (
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
          </DetailBlock>

          {/* 评价 */}
          <DetailBlock>
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
                <Stars>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </Stars>
                <ReviewContent>{r.content}</ReviewContent>
              </ReviewCard>
            ))}

            {isLoggedIn && reviewableItems.length > 0 && (
              <ReviewForm>
                <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>
                  {t('store.product.addReview')}
                </h3>
                <FormRow>
                  <label>{t('store.product.reviewPlaceholder')}</label>
                  <StarSelector>
                    {[1, 2, 3, 4, 5].map(n => (
                      <span
                        key={n}
                        className={n <= reviewRating ? 'active' : ''}
                        onClick={() => setReviewRating(n)}
                      >
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
                      <option key={item.id} value={item.id}>
                        {item.order_no}
                      </option>
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
          </DetailBlock>
        </Shell>
      </Container>
    </PageLayout>
  )
}
