import type { PublicSKU, PublicSPUDetail } from '../api/public'
import { showMiniCartToast } from '../components/common/MiniCartToast'
import { openCartDropdown } from './cartEvents'
import { resolveMediaUrl } from '../api/chat'

type AddItemFn = (
  skuId: number,
  quantity?: number,
  name?: string,
  price?: number,
  image?: string,
) => Promise<void> | void

/** Shared post-add UX: cart API payload + mini toast + header dropdown */
export async function commitQuickAddToCart(
  addItem: AddItemFn,
  skuId: number,
  quantity: number,
  product: PublicSPUDetail,
  sku: PublicSKU,
  options?: { openDropdownMs?: number },
) {
  const price = Number(sku.discount_price ?? sku.price ?? 0)
  const image = resolveMediaUrl(sku.image_url) || sku.image_url || resolveMediaUrl(product.main_image) || product.main_image || ''
  await addItem(skuId, quantity, product.name, price, image)
  const specsText = sku.spec_values
    ? Object.entries(sku.spec_values)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    : undefined
  showMiniCartToast({
    name: product.name,
    image,
    price,
    quantity,
    specsText,
  })
  openCartDropdown({ durationMs: options?.openDropdownMs ?? 3500 })
}

export function formatCartSpecValues(
  specs: { spec_name: string; spec_value: string }[] | Record<string, string> | undefined | null,
): string {
  if (!specs) return ''
  if (Array.isArray(specs)) {
    return specs.map((s) => `${s.spec_name}: ${s.spec_value}`).join(' · ')
  }
  return Object.entries(specs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
}
