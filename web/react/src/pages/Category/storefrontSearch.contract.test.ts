import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const navigation = readFileSync(
  fileURLToPath(new URL('../../components/layout/Navigation/Navigation.tsx', import.meta.url)),
  'utf8',
)
const category = readFileSync(fileURLToPath(new URL('./Category.tsx', import.meta.url)), 'utf8')
const productsHook = readFileSync(
  fileURLToPath(new URL('../../hooks/useProducts.ts', import.meta.url)),
  'utf8',
)

describe('storefront product search contract', () => {
  it('submits the header keyword into a shareable category URL', () => {
    expect(navigation).toContain('handleSearchSubmit')
    expect(navigation).toContain("searchParams.set('q', searchQuery.trim())")
    expect(navigation).toContain('onSubmit={handleSearchSubmit}')
    expect(navigation).toContain('type="submit"')
    expect(navigation).toContain("aria-label={t('common.search')}")
  })

  it('reads q from the category URL and queries the real search API', () => {
    expect(category).toContain("const searchQuery = searchParams.get('q')?.trim() || ''")
    expect(category).toContain('useProducts(1, 20, numericCatId, searchQuery)')
    expect(productsHook).toContain('publicAPI.search')
    expect(productsHook).toContain('query || undefined')
  })
})
