import { beforeEach, describe, expect, it, vi } from 'vitest'

import { patch, put } from './request'
import { publicAPI } from './public'

vi.mock('./request', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

describe('public cart API contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates cart quantities with the PATCH method accepted by Django', async () => {
    vi.mocked(patch).mockResolvedValue({ detail: 'ok' })

    await publicAPI.updateCartItem(402, 3)

    expect(patch).toHaveBeenCalledWith('/cart/items/402/', { quantity: 3 })
    expect(put).not.toHaveBeenCalled()
  })
})
