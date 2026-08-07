// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCart: vi.fn(),
}))

vi.mock('../api/public', () => ({
  publicAPI: {
    getCart: mocks.getCart,
  },
}))

vi.mock('./UserContext', () => ({
  useUser: () => ({ isLoggedIn: true, isLoading: false }),
}))

import { CartProvider, useCart } from './CartContext'

function CartProbe() {
  const { count } = useCart()
  return <span>count:{count}</span>
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CartProvider browser session integration', () => {
  it('loads the cart when UserContext has restored an HttpOnly cookie session', async () => {
    mocks.getCart.mockResolvedValue([
      {
        id: 91,
        sku_id: 4041,
        sku_code: 'LOAD-02000-01',
        spu_name: 'Load Test Product 02000',
        price: '19.99',
        stock: 10000,
        image: '',
        spec_values: [{ spec_name: 'edition', spec_value: 'edition-01' }],
        quantity: 2,
        selected: true,
        created_at: '2026-07-30T00:00:00Z',
      },
    ])

    render(<CartProvider><CartProbe /></CartProvider>)

    await waitFor(() => expect(mocks.getCart).toHaveBeenCalledOnce())
    expect(screen.getByText('count:2')).toBeTruthy()
  })
})
