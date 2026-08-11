import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/api/request', () => ({
  get: vi.fn(),
  post: mocks.post,
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

import { publicAPI } from '@/api/public'

beforeEach(() => mocks.post.mockReset())

describe('publicAPI.requestRefund', () => {
  it('sends the stable idempotency key required by the refund endpoint', async () => {
    mocks.post.mockResolvedValue({ status: 'succeeded' })

    await publicAPI.requestRefund(
      'ORDER-9',
      'customer request',
      12.34,
      'refund-ui-order-9',
    )

    expect(mocks.post).toHaveBeenCalledWith(
      '/payment/refund/',
      { order_no: 'ORDER-9', reason: 'customer request', amount: 12.34 },
      { headers: { 'Idempotency-Key': 'refund-ui-order-9' } },
    )
  })
})
