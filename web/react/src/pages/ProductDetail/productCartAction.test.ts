import { describe, expect, it, vi } from 'vitest'

import { addProductToCart } from './productCartAction'

describe('addProductToCart', () => {
  it('shows success only after the persisted cart has been refreshed', async () => {
    const sequence: string[] = []
    const addItem = vi.fn(async () => {
      sequence.push('persisted')
    })
    const onSuccess = vi.fn(() => sequence.push('success'))

    await addProductToCart(addItem, 7, 3, onSuccess)

    expect(sequence).toEqual(['persisted', 'success'])
  })

  it('does not show success when persistence fails', async () => {
    const error = new Error('cart write failed')
    const addItem = vi.fn(async () => {
      throw error
    })
    const onSuccess = vi.fn()

    await expect(addProductToCart(addItem, 7, 3, onSuccess)).rejects.toBe(error)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
