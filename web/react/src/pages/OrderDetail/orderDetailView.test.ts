import { describe, expect, it } from 'vitest'

import { getOrderAmounts, getOrderItemImage, markOrderCancelled } from './orderDetailView'

describe('order detail view model', () => {
  it('uses the pre-discount total as subtotal and actual_amount as payable total', () => {
    expect(getOrderAmounts({
      total_amount: '59.97',
      actual_amount: '49.97',
      discount_amount: '10.00',
    })).toEqual({ subtotal: 59.97, discount: 10, payable: 49.97 })
  })

  it('normalizes missing or malformed money instead of rendering NaN', () => {
    expect(getOrderAmounts({
      total_amount: undefined,
      actual_amount: 'invalid',
      discount_amount: null,
    })).toEqual({ subtotal: 0, discount: 0, payable: 0 })
  })

  it('updates the visible order immediately after cancellation succeeds', () => {
    const order = { status: 'pending_payment', cancel_reason: '' }

    expect(markOrderCancelled(order, 'buyer cancelled')).toEqual({
      status: 'cancelled',
      cancel_reason: 'buyer cancelled',
    })
    expect(order.status).toBe('pending_payment')
  })

  it('omits an image element when the API has no usable image URL', () => {
    expect(getOrderItemImage('/media/product.jpg')).toBe('/media/product.jpg')
    expect(getOrderItemImage('   ')).toBeUndefined()
    expect(getOrderItemImage(null)).toBeUndefined()
  })
})
