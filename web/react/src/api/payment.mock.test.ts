import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('./request', () => ({
  get: vi.fn(),
  post: mocks.post,
}))

import { paymentAPI } from './payment'

beforeEach(() => mocks.post.mockReset())

describe('paymentAPI.completeMock', () => {
  it('submits an authenticated simulator scenario without exposing its signing secret', async () => {
    mocks.post.mockResolvedValue({ status: 'success' })

    await paymentAPI.completeMock('PAY-123', 'success')

    expect(mocks.post).toHaveBeenCalledWith(
      '/payment/mock/PAY-123/complete/',
      { scenario: 'success' },
    )
  })
})
