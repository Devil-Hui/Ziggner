import { describe, expect, it } from 'vitest'

import { toCartItem } from '@/store/cartMapper'

describe('toCartItem', () => {
  it('normalizes the decimal price returned by Django into a finite number', () => {
    const item = toCartItem({
      id: 91,
      sku_id: 4041,
      sku_code: 'LOAD-02000-01',
      spu_name: 'Load Test Product 02000',
      price: '19.99',
      stock: 10000,
      image: '',
      spec_values: [{ spec_name: 'edition', spec_value: 'edition-01' }],
      quantity: 1,
      selected: true,
      created_at: '2026-07-30T00:00:00Z',
    })

    expect(item.price).toBe(19.99)
    expect(Number.isFinite(item.price)).toBe(true)
  })
})
