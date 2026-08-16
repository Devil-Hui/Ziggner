import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Color, Radius, Spacing, Transition, FontSize, FontWeight } from '../../theme/tokens'
import { DEFAULT_TAG_COLOR } from '../../constants/tagColors'
import { adminAPI } from '../../api/admin'
import type { ProductMediaItem } from '../../api/admin'
import { useTranslation } from '../../i18n'
import { useDebounceSubmit } from '../../hooks/useDebounceSubmit'
import { MediaManager } from '../../components/admin/common/MediaManager'
import { ProductKindToggle } from '../../components/admin/common/ProductKindToggle'
import { Icon } from '../../components/admin/common/Icon'
import {
  getAllStagedItems,
  clearAllStaged,
} from '../../utils/mediaStaging'
import { Input, Select, PrimaryBtn, SecondaryBtn } from '../../components/admin/common/ui'

// ── Types ──

interface CategoryNode {
  id: number
  name: string
  parent_id: number | null
  level: number
  is_active: boolean
  children: CategoryNode[]
}

interface SKUFormItem {
  id?: number
  spec_values: Record<string, string>
  price: string
  stock: string
  discount_price: string
  shelf_status: string
  sku_code: string
  barcode: string
  weight: string
  track_inventory: string
}

interface SpecDef {
  name: string
  values: string[]
}

interface TagItem {
  id: number
  name: string
  color?: string
  is_active: boolean
}

// ── Styled ──

const Container = styled.div`
  max-width: 900px;
  margin: 0 0 0 auto;
  padding-right: 24px;
`

const Title = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 20px;
  color: ${Color.text.heading};
`

const Form = styled.form`
  background: ${Color.bg.card};
  padding: ${Spacing.xxl}px;
  border-radius: ${Radius.md}px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
`

const Section = styled.div`
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${Color.border.light};

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`

const SectionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;

  &:hover .chevron {
    color: ${Color.primary};
  }
`

const SectionTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${Color.primaryHover};
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SectionBody = styled.div`
  margin-top: 14px;
`

// ── 模块导航（右侧栏结构，与左侧状态栏呼应） ──
const FormLayout = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

const ModuleNav = styled.nav`
  width: 200px;
  flex-shrink: 0;
  background: ${Color.bg.card};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  padding: 10px;

  @media (max-width: 900px) {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`

const ModuleNavItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: ${(props) => (props.$active ? Color.primaryLight : "transparent")};
  color: ${(props) => (props.$active ? Color.primary : Color.text.secondary)};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  margin-bottom: 4px;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    background: ${(props) => (props.$active ? Color.primaryLight : "#f2f4f7")};
    color: ${Color.primary};
  }

  span.required-mark {
    color: ${Color.status.error};
    font-weight: 700;
  }

  @media (max-width: 900px) {
    width: auto;
    margin-bottom: 0;
  }
`

const ModuleContent = styled.div`
  flex: 1;
  min-width: 0;
`

const Field = styled.div`
  margin-bottom: 14px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
`

const Label = styled.label`
  display: block;
  font-size: 0.813rem;
  color: ${Color.text.secondary};
  margin-bottom: 4px;
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${Color.border.medium};
  border-radius: 6px;
  font-size: 0.875rem;
  min-height: 80px;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #e74c3c;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
  }
`

const BtnGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 20px;
`

const SpinIcon = styled.span`
  display: inline-flex;
  animation: spin 1s linear infinite;
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

// ── Spec Config Styles ──

const SpecConfigRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`

const SpecNameInput = styled(Input)`
  width: 120px;
`

const SpecValueInput = styled(Input)`
  width: 100px;
`

const SpecValueChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border: 1px solid #e74c3c;
  border-radius: 14px;
  font-size: 0.75rem;
  color: #e74c3c;
  background: #fef2f2;
`

const SpecValueRemove = styled.span`
  cursor: pointer;
  font-weight: 700;
  margin-left: 2px;
  &:hover { color: #c0392b; }
`

const SpecGroup = styled.div`
  background: ${Color.primaryLight};
  border: 1px solid ${Color.border.light};
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
`

const SpecGroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const SpecGroupName = styled.span`
  font-weight: 600;
  font-size: 0.85rem;
  color: ${Color.primaryHover};
`

const SmallBtn = styled.button`
  padding: 3px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 0.7rem;
  cursor: pointer;
  color: #999;
  &:hover { border-color: #e74c3c; color: #e74c3c; }
`

const SmallBtnPrimary = styled(SmallBtn)`
  border-color: #e74c3c;
  color: #e74c3c;
  background: #fef2f2;
  &:hover { background: #e74c3c; color: #fff; }
`

// ── Variant Card Styles (Shopify-style) ──

const VariantCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${Spacing.md}px;
`

const VariantCard = styled.div`
  background: ${Color.primaryLight};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.md}px;
  padding: ${Spacing.lg}px;
  position: relative;
  transition: ${Transition.fast};

  &:hover {
    border-color: ${Color.border.medium};
  }
`

const VariantCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${Spacing.md}px;
`

const VariantName = styled.span`
  font-size: ${FontSize.sm}px;
  font-weight: ${FontWeight.semibold};
  color: ${Color.text.heading};
`

const VariantRemoveBtn = styled.button`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: ${Color.text.muted};
  cursor: pointer;
  font-size: ${FontSize.md}px;
  line-height: 1;
  padding: 0;
  transition: ${Transition.fast};

  &:hover {
    border-color: #e74c3c;
    color: #e74c3c;
    background: #fef2f2;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const VariantMainRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr);
  gap: ${Spacing.md}px;
  margin-bottom: ${Spacing.sm}px;
`

const VariantField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const VariantFieldLabel = styled.label`
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  font-weight: ${FontWeight.medium};
`

const VariantPriceInput = styled.input`
  padding: 7px 10px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.primaryHover};
  background: ${Color.bg.card};
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #e74c3c;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
  }
`

const VariantStockGroup = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  overflow: hidden;

  &:focus-within {
    border-color: #e74c3c;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
  }
`

const VariantStockBtn = styled.button`
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: ${Color.primaryLight};
  color: ${Color.primaryHover};
  font-size: ${FontSize.lg}px;
  font-weight: ${FontWeight.semibold};
  cursor: pointer;
  padding: 0;
  user-select: none;
  transition: ${Transition.fast};

  &:hover {
    background: ${Color.primary};
    color: #fff;
  }

  &:active {
    background: ${Color.primaryDark};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const VariantStockInput = styled.input`
  flex: 1;
  width: 100%;
  padding: 7px 6px;
  border: none;
  font-size: ${FontSize.lg}px;
  font-weight: ${FontWeight.bold};
  color: ${Color.primaryHover};
  text-align: center;
  background: transparent;
  box-sizing: border-box;
  min-width: 0;

  &:focus {
    outline: none;
  }

  /* Hide spinners for number input */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type='number'] {
    -moz-appearance: textfield;
  }
`

const VariantDiscountInput = styled.input`
  padding: 7px 10px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.secondary};
  background: ${Color.bg.card};
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #e74c3c;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
  }
`

const VariantMetaRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: ${Spacing.md}px;
  align-items: end;
  margin-top: ${Spacing.sm}px;
`

const VariantMetaInput = styled.input`
  padding: 6px 10px;
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  font-size: ${FontSize.xs}px;
  color: ${Color.text.secondary};
  background: ${Color.bg.card};
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #e74c3c;
    box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
  }

  &::placeholder {
    color: ${Color.text.muted};
  }
`

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`

const ToggleTrack = styled.button<{ $on: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: none;
  background: ${({ $on }) => ($on ? Color.status.success : Color.border.medium)};
  cursor: pointer;
  padding: 0;
  transition: background ${Transition.fast};

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.25);
  }
`

const ToggleThumb = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $on }) => ($on ? '20px' : '2px')};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: left ${Transition.fast};
`

const ToggleLabel = styled.span<{ $on: boolean }>`
  font-size: ${FontSize.xs}px;
  font-weight: ${FontWeight.medium};
  color: ${({ $on }) => ($on ? Color.status.success : Color.text.muted)};
`

const VariantAddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px dashed #e74c3c;
  border-radius: ${Radius.sm}px;
  background: ${Color.bg.card};
  color: #e74c3c;
  font-size: 0.75rem;
  cursor: pointer;
  margin-top: 10px;

  &:hover {
    background: #fef2f2;
  }
`

const NotTrackingText = styled.span`
  display: block;
  padding: 7px 10px;
  font-size: ${FontSize.sm}px;
  color: ${Color.text.muted};
  background: ${Color.primaryLight};
  border: 1px solid ${Color.border.light};
  border-radius: ${Radius.sm}px;
  text-align: center;
  font-style: italic;
`

// ── Tag Styles ──

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const TagChip = styled.button<{ $selected: boolean; $color?: string }>`
  padding: 4px 12px;
  border: 1px solid ${({ $selected, $color }) => ($selected ? ($color || '#e74c3c') : ($color || '#ddd'))};
  border-radius: 16px;
  background: ${({ $selected, $color }) => ($selected ? ($color || '#e74c3c') : '#fff')};
  color: ${({ $selected }) => ($selected ? '#fff' : '#666')};
  font-size: 0.75rem;
  cursor: pointer;
  transition: ${Transition.fast};

  &:hover {
    border-color: ${({ $color }) => ($color || '#e74c3c')};
    color: ${({ $selected, $color }) => ($selected ? '#fff' : ($color || '#e74c3c'))};
  }
`

// ── Helpers ──

function flattenTree(nodes: CategoryNode[], prefix = ''): { id: number; label: string; level: number }[] {
  const result: { id: number; label: string; level: number }[] = []
  for (const node of nodes) {
    if (!node.is_active) continue
    result.push({ id: node.id, label: `${prefix}${node.name}`, level: node.level })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, `${prefix}${'  '.repeat(node.level)}├ `))
    }
  }
  return result
}

/** 格式化变体名称: 按活跃规格顺序拼接 spec values，无规格时返回默认标题 */
function formatVariantName(specValues: Record<string, string>, specNames: string[], t?: (key: string) => string): string {
  const defaultTitle = t ? t('admin.productVariant.defaultTitle') : 'Default Title'
  if (specNames.length === 0) return defaultTitle
  const parts = specNames.map(name => specValues[name] || '').filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : defaultTitle
}

// ── Component ──

export default function AdminProductForm() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  // Basic fields
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [productType, setProductType] = useState('')
  const [tagInput, setTagInput] = useState('')  // Shopify-style tag input (comma-separated)
  const [requiresShipping, setRequiresShipping] = useState(true)
  const [taxable, setTaxable] = useState(true)
  const [productKind, setProductKind] = useState<'physical' | 'virtual'>('physical')  // 实体/虚拟商品
  // 模块导航：右侧栏一次只显示当前模块（与左侧状态栏一致的栏式设计）
  const [activeSection, setActiveSection] = useState<string>('productType')
  const MODULE_ITEMS = [
    { key: 'productType', label: t('admin.productForm.productTypeTitle'), required: false },
    { key: 'titleDesc', label: t('admin.productForm.titleDescription'), required: true },
    { key: 'media', label: t('admin.productForm.mediaSection'), required: false },
    { key: 'organization', label: t('admin.productForm.organization'), required: true },
    { key: 'sku', label: t('admin.productForm.skuManagement'), required: false },
    { key: 'schedule', label: t('admin.productForm.schedule'), required: false },
  ]

  // Data sources
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  // ── Dynamic Specs ──
  const [specs, setSpecs] = useState<SpecDef[]>([])

  // SKU
  const [skus, setSkus] = useState<SKUFormItem[]>([
    { spec_values: {}, price: '', stock: '', discount_price: '', shelf_status: 'on_shelf', sku_code: '', barcode: '', weight: '', track_inventory: 'true' },
  ])

  // Schedule
  const [publishAt, setPublishAt] = useState('')
  const [unpublishAt, setUnpublishAt] = useState('')

  // 编辑模式已保存媒体（来自 SPUAdminDetailView）
  const [savedMedia, setSavedMedia] = useState<ProductMediaItem[]>([])

  // State
  const [_loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const markDirty = useCallback(() => { setIsDirty(true) }, [])

  // ── Unsaved Changes Guard ──
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // `beforeunload` 事件绑定在上方 useEffect 中已完成
  // React Router v6 的 useBlocker 需要 data router，当前使用 BrowserRouter
  // 改用 beforeunload + 导航前手动确认

  // ── Load Data ──

  useEffect(() => {
    adminAPI.getBrands()
      .then((res) => setBrands(res as Array<{ id: number; name: string }>))
      .catch(() => {})

    adminAPI.getCategoryTree()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {})

    adminAPI.getTags()
      .then((res) => setTags(Array.isArray(res) ? res : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      adminAPI.getSPU(Number(id))
        .then((res) => {
          const data = res as unknown as {
            name: string; brand_id: number; category_id: number;
            description: string; main_image: string; specs?: SpecDef[];
            skus: SKUFormItem[]; tags: TagItem[];
            media?: ProductMediaItem[];
            product_kind?: 'physical' | 'virtual';
            scheduled_publish_at?: string; scheduled_unpublish_at?: string;
          }
          setName(data.name)
          setBrandId(String(data.brand_id))
          setCategoryId(String(data.category_id))
          setDescription(data.description || '')
          if (data.specs?.length) {
            setSpecs(data.specs)
          }
          if (data.skus?.length) {
            setSkus(data.skus.map((s) => ({
              ...s,
              price: String(s.price ?? ''),
              stock: String(s.stock ?? ''),
              discount_price: String(s.discount_price ?? ''),
              track_inventory: String(s.track_inventory ?? 'true'),
            })))
          }
          if (data.tags?.length) {
            setSelectedTags(data.tags.map((t) => t.id))
          }
          if (data.scheduled_publish_at) setPublishAt(data.scheduled_publish_at.slice(0, 16))
          if (data.scheduled_unpublish_at) setUnpublishAt(data.scheduled_unpublish_at.slice(0, 16))
          // 回填商品类型 + 联动 requires_shipping
          if (data.product_kind) {
            setProductKind(data.product_kind)
            setRequiresShipping(data.product_kind === 'physical')
          }
          // 回填已保存媒体
          if (data.media) {
            setSavedMedia(data.media)
          }
        })
        .catch(() => setError(t('admin.productForm.loadFailed')))
    }
  }, [id, isEdit, t])

  const flatCategories = flattenTree(categories)

  // ── Spec Handlers ──

  const addSpec = () => {
    setSpecs([...specs, { name: '', values: [] }])
    markDirty()
  }

  const removeSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx))
    markDirty()
  }

  const updateSpecName = (idx: number, name: string) => {
    setSpecs(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], name }
      return updated
    })
    markDirty()
  }

  const addSpecValue = (idx: number, value: string) => {
    if (!value.trim()) return
    setSpecs(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], values: [...updated[idx].values, value.trim()] }
      return updated
    })
    markDirty()
  }

  const removeSpecValue = (specIdx: number, valIdx: number) => {
    setSpecs(prev => {
      const updated = [...prev]
      updated[specIdx] = { ...updated[specIdx], values: updated[specIdx].values.filter((_, i) => i !== valIdx) }
      return updated
    })
    markDirty()
  }

  // ── SKU Handlers ──

  const addSKU = () => {
    const emptySpec: Record<string, string> = {}
    specs.forEach(s => { if (s.name.trim()) emptySpec[s.name.trim()] = '' })
    setSkus([...skus, { spec_values: emptySpec, price: '', stock: '', discount_price: '', shelf_status: 'on_shelf', sku_code: '', barcode: '', weight: '', track_inventory: 'true' }])
    markDirty()
  }

  const removeSKU = (idx: number) => {
    if (skus.length <= 1) return
    setSkus(skus.filter((_, i) => i !== idx))
    markDirty()
  }

  const updateSKU = (idx: number, field: string, value: string) => {
    setSkus((prev) => {
      const updated = [...prev]
      if (field.startsWith('spec_')) {
        const key = field.replace('spec_', '')
        updated[idx] = { ...updated[idx], spec_values: { ...updated[idx].spec_values, [key]: value } }
      } else {
        updated[idx] = { ...updated[idx], [field]: value }
      }
      return updated
    })
    markDirty()
  }

  // ── Stock +/- with long-press rapid change ──
  const stockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearStockInterval = useCallback(() => {
    if (stockIntervalRef.current !== null) {
      clearInterval(stockIntervalRef.current)
      stockIntervalRef.current = null
    }
  }, [])

  const adjustStock = useCallback((idx: number, delta: number) => {
    setSkus((prev) => {
      const updated = [...prev]
      const currentStock = parseInt(updated[idx].stock, 10) || 0
      const newStock = Math.max(0, currentStock + delta)
      updated[idx] = { ...updated[idx], stock: String(newStock) }
      return updated
    })
    markDirty()
  }, [markDirty])

  const startStockAdjust = useCallback((idx: number, delta: number) => {
    adjustStock(idx, delta)
    stockIntervalRef.current = setInterval(() => {
      adjustStock(idx, delta)
    }, 120)
  }, [adjustStock])

  const stopStockAdjust = useCallback(() => {
    clearStockInterval()
  }, [clearStockInterval])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      clearStockInterval()
    }
  }, [clearStockInterval])

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
    markDirty()
  }

  /** 实体/虚拟商品切换：联动 requires_shipping */
  const handleProductKindChange = (value: 'physical' | 'virtual') => {
    setProductKind(value)
    setRequiresShipping(value === 'physical')
    markDirty()
  }

  /** 编辑模式媒体信息更新回调 */
  const handleMediaUpdate = async (mediaId: number, data: { alt_text?: string; sort_order?: number }) => {
    await adminAPI.updateMedia(mediaId, data)
  }

  // ── Submit ──

  const doSubmit = async (submitForReview = false) => {
    if (!name.trim()) { setError(t('admin.productForm.productNameRequired')); return }
    if (!brandId) { setError(t('admin.productForm.brandRequired')); return }
    if (!categoryId) { setError(t('admin.productForm.categoryRequired')); return }

    setLoading(true)
    setError('')
    try {
      const validSpecs = specs.filter(s => s.name.trim() && s.values.length > 0)
      const spuData = {
        name: name.trim(),
        brand_id: Number(brandId),
        category_id: Number(categoryId),
        description: description.trim(),
        specs: validSpecs,
        meta_title: metaTitle.trim(),
        meta_description: metaDescription.trim(),
        product_type: productType.trim(),
        tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
        requires_shipping: requiresShipping,
        taxable: taxable,
        product_kind: productKind,
      }

      let spuId: number

      if (isEdit && id) {
        await adminAPI.updateSPU(Number(id), spuData)
        spuId = Number(id)

        for (const sku of skus) {
          if (sku.id) {
            await adminAPI.updateSKU(sku.id, {
              spec_values: sku.spec_values,
              price: sku.price,
              stock: Number(sku.stock),
              discount_price: sku.discount_price || null,
              shelf_status: sku.shelf_status,
              sku_code: sku.sku_code || '',
              barcode: sku.barcode || '',
              weight: sku.weight || '0',
              track_inventory: sku.track_inventory === 'true',
            })
          } else {
            await adminAPI.batchCreateSKU({
              spu_id: spuId,
              skus: [{
                spec_values: sku.spec_values,
                price: sku.price,
                stock: Number(sku.stock),
                discount_price: sku.discount_price || null,
                shelf_status: sku.shelf_status,
                sku_code: sku.sku_code || '',
                barcode: sku.barcode || '',
                weight: sku.weight || '0',
                track_inventory: sku.track_inventory === 'true',
              }],
            })
          }
        }

        if (submitForReview) {
          await adminAPI.submitAudit(spuId)
        }
      } else {
        // ── 新建模式 ──
        const stagedItems = await getAllStagedItems()

        let spuRes: { id: number }
        if (stagedItems.length === 0) {
          spuRes = await adminAPI.createSPU(spuData) as unknown as { id: number }
        } else {
          const formData = new FormData()
          formData.append('name', name.trim())
          formData.append('brand_id', String(brandId))
          formData.append('category_id', String(categoryId))
          formData.append('description', description.trim())
          formData.append('specs', JSON.stringify(validSpecs))

          let sortOrder = 0
          for (const item of stagedItems) {
            if (item.mediaType === 'image') {
              const meta = { fileName: item.fileName, sortOrder: sortOrder++, mediaType: 'image' }
              formData.append('media_metadata', JSON.stringify(meta))
              if (item.thumbBlob) formData.append('media_files', item.thumbBlob, `thumb_${item.fileName}`)
              if (item.listBlob) formData.append('media_files', item.listBlob, `list_${item.fileName}`)
              if (item.largeBlob) formData.append('media_files', item.largeBlob, `large_${item.fileName}`)
              if (item.originalBlob) formData.append('media_files', item.originalBlob, `original_${item.fileName}`)
            } else if (item.mediaType === 'video') {
              const meta = { fileName: item.fileName, sortOrder: sortOrder++, mediaType: 'video' }
              formData.append('media_metadata', JSON.stringify(meta))
              if (item.videoBlob) formData.append('media_files', item.videoBlob, item.fileName)
              if (item.videoFrameThumb) formData.append('media_files', item.videoFrameThumb, `video_thumb_${item.fileName}`)
              if (item.videoFrameList) formData.append('media_files', item.videoFrameList, `video_list_${item.fileName}`)
              if (item.videoFrameLarge) formData.append('media_files', item.videoFrameLarge, `video_large_${item.fileName}`)
            }
          }

          spuRes = await adminAPI.createSPUWithMedia(formData) as unknown as { id: number }
        }
        spuId = spuRes.id

        if (skus.length > 0) {
          // Validate all SKUs have prices
          const invalidSkus = skus.filter(s => !s.price || s.price === '' || Number(s.price) <= 0)
          if (invalidSkus.length > 0) {
            setError(t('admin.productForm.priceRequired'))
            setLoading(false)
            return
          }
          await adminAPI.batchCreateSKU({
            spu_id: spuId,
            skus: skus.map((s) => ({
              spec_values: s.spec_values,
              price: s.price,
              stock: Number(s.stock),
              discount_price: s.discount_price || null,
              shelf_status: s.shelf_status,
              sku_code: s.sku_code || '',
              barcode: s.barcode || '',
              weight: s.weight || '0',
              track_inventory: s.track_inventory === 'true',
            })),
          })
        }

        if (submitForReview) {
          await adminAPI.submitAudit(spuId)
        }

        await clearAllStaged()
      }

      await adminAPI.setSPUTags({ spu_id: spuId, tag_ids: selectedTags })

      if (publishAt || unpublishAt) {
        await adminAPI.scheduleSPU(spuId, {
          publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
          unpublish_at: unpublishAt ? new Date(unpublishAt).toISOString() : undefined,
        })
      }

      navigate('/admin/products')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.operationFailed'))
    }
    setLoading(false)
  }

  const { execute: handleSaveDraft, isPending: isSaving } = useDebounceSubmit(
    async () => { await doSubmit(false) },
    800,
  )
  const { execute: handleSaveSubmit, isPending: isSubmitting } = useDebounceSubmit(
    async () => { await doSubmit(true) },
    800,
  )

  const activeSpecNames = specs.filter(s => s.name.trim()).map(s => s.name.trim())

  return (
    <Container>
      <Title>{isEdit ? t('admin.productForm.editTitle') : t('admin.productForm.createTitle')}</Title>

      {error && (
        <div style={{ color: '#e74c3c', marginBottom: 16, fontSize: '0.875rem', padding: '10px 14px', background: '#f5f5f5', borderRadius: 6, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <FormLayout>
        <ModuleNav>
          {MODULE_ITEMS.map((item) => (
            <ModuleNavItem key={item.key} $active={activeSection === item.key} onClick={() => setActiveSection(item.key)}>
              <span>{item.label}{item.required && <span className="required-mark"> *</span>}</span>
            </ModuleNavItem>
          ))}
        </ModuleNav>
        <ModuleContent>
      <Form onSubmit={(e) => { e.preventDefault(); handleSaveDraft() }}>
        {/* ── 商品类型开关 ── */}
        {activeSection === 'productType' && (
        <Section>
          <SectionBody>
              <ProductKindToggle value={productKind} onChange={handleProductKindChange} />
            </SectionBody>
        </Section>
        )}

        {/* ── Title & Description ── */}
        {activeSection === 'titleDesc' && (
        <Section>
          <SectionBody>
              <Field>
                <Label>{t('admin.productForm.productName')} *</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); markDirty() }} required placeholder={t('admin.productForm.productNamePlaceholder')} />
              </Field>
              <Field>
                <Label>{t('admin.productForm.descriptionLabel')}</Label>
                <TextArea value={description} onChange={(e) => { setDescription(e.target.value); markDirty() }} placeholder={t('admin.productForm.descriptionPlaceholder')} />
              </Field>
            </SectionBody>
        </Section>
        )}

        {/* ── Media (shown for all product kinds) ── */}
        {activeSection === 'media' && (
        <Section>
          <SectionBody>
              <MediaManager
                onChange={(staged) => { /* 创建模式暂存项由 MediaManager 内部管理 IndexedDB */ }}
                {...(isEdit && id ? {
                  spuId: Number(id),
                  savedMedia,
                  onMediaUpdate: handleMediaUpdate,
                } : {})}
              />
            </SectionBody>
        </Section>
        )}

        {/* ── Organization ── */}
        {activeSection === 'organization' && (
        <Section>
          <SectionBody>
              <Row>
            <Field>
              <Label>{t('admin.productForm.brand')} *</Label>
              <Select value={brandId} onChange={(e) => { setBrandId(e.target.value); markDirty() }} required>
                <option value="">{t('admin.productForm.selectBrand')}</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field>
              <Label>{t('admin.productForm.category')} *</Label>
              <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); markDirty() }} required>
                <option value="">{t('admin.productForm.selectCategory')}</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id} style={{ paddingLeft: `${c.level * 12}px` }}>
                    {c.label}{c.level === 1 ? ' (L1)' : c.level === 2 ? ' (L2)' : ' (L3)'}
                  </option>
                ))}
              </Select>
            </Field>
          </Row>
          <Field>
            <Label>{t('admin.productForm.tags')}</Label>
            <TagList>
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  type="button"
                  $selected={selectedTags.includes(tag.id)}
                  $color={tag.color || DEFAULT_TAG_COLOR}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </TagChip>
              ))}
            </TagList>
              </Field>
            </SectionBody>
        </Section>
        )}

        {/* ── Variants ── */}
        {activeSection === 'sku' && (
        <Section>
          <SectionBody>

          {/* Spec Configuration */}
          {specs.map((spec, idx) => (
            <SpecGroup key={idx}>
              <SpecGroupHeader>
                <SpecGroupName>规格 {idx + 1}</SpecGroupName>
                <SmallBtn type="button" onClick={() => removeSpec(idx)}>删除</SmallBtn>
              </SpecGroupHeader>
              <SpecConfigRow>
                <SpecNameInput
                  placeholder="规格名称（如：颜色）"
                  value={spec.name}
                  onChange={(e) => updateSpecName(idx, e.target.value)}
                />
                {spec.name.trim() && (
                  <>
                    {spec.values.map((val, vi) => (
                      <SpecValueChip key={vi}>
                        {val}
                        <SpecValueRemove onClick={() => removeSpecValue(idx, vi)}><Icon name="x" size={12} /></SpecValueRemove>
                      </SpecValueChip>
                    ))}
                    <SpecValueInput
                      placeholder="添加规格值"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSpecValue(idx, (e.target as HTMLInputElement).value)
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                  </>
                )}
              </SpecConfigRow>
            </SpecGroup>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <SmallBtn type="button" onClick={addSpec}>+ 添加规格维度</SmallBtn>
          </div>

          {/* Variant Cards */}
          <VariantCardList>
            {skus.map((sku, idx) => {
              const variantName = formatVariantName(sku.spec_values, activeSpecNames)
              const isOnShelf = sku.shelf_status === 'on_shelf'
              return (
                <VariantCard key={idx}>
                  <VariantCardHeader>
                    <VariantName>{variantName}</VariantName>
                    <VariantRemoveBtn
                      type="button"
                      disabled={skus.length <= 1}
                      onClick={() => removeSKU(idx)}
                      title="移除变体"
                    >
                      <Icon name="x" size={14} />
                    </VariantRemoveBtn>
                  </VariantCardHeader>

                  {/* Price / Stock / Discount Price — three-column */}
                  <VariantMainRow>
                    <VariantField>
                      <VariantFieldLabel>Price *</VariantFieldLabel>
                      <VariantPriceInput
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={sku.price}
                        onChange={(e) => updateSKU(idx, 'price', e.target.value)}
                      />
                    </VariantField>
                    <VariantField>
                      <VariantFieldLabel>Stock</VariantFieldLabel>
                      <ToggleWrapper>
                        <ToggleTrack
                          type="button"
                          $on={sku.track_inventory === 'true'}
                          onClick={() => updateSKU(idx, 'track_inventory', sku.track_inventory === 'true' ? 'false' : 'true')}
                          aria-label={t('admin.productForm.trackInventory')}
                        >
                          <ToggleThumb $on={sku.track_inventory === 'true'} />
                        </ToggleTrack>
                        <ToggleLabel $on={sku.track_inventory === 'true'}>
                          {t('admin.productForm.trackInventory')}
                        </ToggleLabel>
                      </ToggleWrapper>
                      {sku.track_inventory === 'true' ? (
                        <VariantStockGroup>
                          <VariantStockBtn
                            type="button"
                            disabled={parseInt(sku.stock, 10) <= 0}
                            onMouseDown={(e) => { e.preventDefault(); startStockAdjust(idx, -1) }}
                            onMouseUp={stopStockAdjust}
                            onMouseLeave={stopStockAdjust}
                            aria-label="减少库存"
                          >
                            −
                          </VariantStockBtn>
                          <VariantStockInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={sku.stock}
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === '' || /^\d+$/.test(raw)) {
                                updateSKU(idx, 'stock', raw === '' ? '' : String(parseInt(raw, 10)))
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value, 10)
                              if (isNaN(value) || value < 0) updateSKU(idx, 'stock', '0')
                            }}
                          />
                          <VariantStockBtn
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); startStockAdjust(idx, 1) }}
                            onMouseUp={stopStockAdjust}
                            onMouseLeave={stopStockAdjust}
                            aria-label="增加库存"
                          >
                            +
                          </VariantStockBtn>
                        </VariantStockGroup>
                      ) : (
                        <NotTrackingText>{t('admin.productForm.notTracking')}</NotTrackingText>
                      )}
                    </VariantField>
                    <VariantField>
                      <VariantFieldLabel>Discount Price</VariantFieldLabel>
                      <VariantDiscountInput
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={sku.discount_price}
                        onChange={(e) => updateSKU(idx, 'discount_price', e.target.value)}
                      />
                    </VariantField>
                  </VariantMainRow>

                  {/* SKU Code / Barcode / Shelf Toggle */}
                  <VariantMetaRow>
                    <VariantField>
                      <VariantFieldLabel>SKU Code</VariantFieldLabel>
                      <VariantMetaInput
                        type="text"
                        placeholder="e.g. TS-RED-S"
                        value={sku.sku_code || ''}
                        onChange={(e) => updateSKU(idx, 'sku_code', e.target.value)}
                      />
                    </VariantField>
                    <VariantField>
                      <VariantFieldLabel>Barcode</VariantFieldLabel>
                      <VariantMetaInput
                        type="text"
                        placeholder="e.g. 5901234123457"
                        value={sku.barcode || ''}
                        onChange={(e) => updateSKU(idx, 'barcode', e.target.value)}
                      />
                    </VariantField>
                    <VariantField>
                      <VariantFieldLabel>Shelf Status</VariantFieldLabel>
                      <ToggleWrapper>
                        <ToggleTrack
                          type="button"
                          $on={isOnShelf}
                          onClick={() => updateSKU(idx, 'shelf_status', isOnShelf ? 'off_shelf' : 'on_shelf')}
                          aria-label={isOnShelf ? '下架' : '上架'}
                        >
                          <ToggleThumb $on={isOnShelf} />
                        </ToggleTrack>
                        <ToggleLabel $on={isOnShelf}>
                          {isOnShelf ? 'On Shelf' : 'Off Shelf'}
                        </ToggleLabel>
                      </ToggleWrapper>
                    </VariantField>
                  </VariantMetaRow>
                </VariantCard>
              )
            })}
          </VariantCardList>
          <VariantAddBtn type="button" onClick={addSKU}>+ {t('admin.productForm.addSku')}</VariantAddBtn>
            </SectionBody>
        </Section>
        )}

        {/* ── Schedule ── */}
        {activeSection === 'schedule' && (
        <Section>
          <SectionBody>
              <Row>
                <Field>
                  <Label>{t('admin.productForm.publishAt')}</Label>
                  <Input type="datetime-local" value={publishAt} onChange={(e) => { setPublishAt(e.target.value); markDirty() }} />
                </Field>
                <Field>
                  <Label>{t('admin.productForm.unpublishAt')}</Label>
                  <Input type="datetime-local" value={unpublishAt} onChange={(e) => { setUnpublishAt(e.target.value); markDirty() }} />
                </Field>
              </Row>
            </SectionBody>
        </Section>
        )}

        <BtnGroup>
          <SecondaryBtn type="submit" disabled={isSaving || isSubmitting}>
            {isSaving ? <><SpinIcon><Icon name="refresh" size={14} /></SpinIcon> Saving…</> : t('admin.productForm.saveDraft')}
          </SecondaryBtn>
          <PrimaryBtn type="button" disabled={isSaving || isSubmitting} onClick={handleSaveSubmit}>
            {isSubmitting ? <><SpinIcon><Icon name="refresh" size={14} /></SpinIcon> Submitting…</> : t('admin.productForm.saveAndSubmit')}
          </PrimaryBtn>
          <SecondaryBtn type="button" onClick={() => navigate('/admin/products')}>
            {t('common.cancel')}
          </SecondaryBtn>
        </BtnGroup>
      </Form>
        </ModuleContent>
      </FormLayout>

    </Container>
  )
}