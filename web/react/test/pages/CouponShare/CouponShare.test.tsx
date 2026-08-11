// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { I18nProvider } from '@/i18n'

const mocks = vi.hoisted(() => ({
  getCouponDetail: vi.fn(),
  claimCoupon: vi.fn(),
}))

vi.mock('@/api/public', () => ({
  publicAPI: {
    getCouponDetail: mocks.getCouponDetail,
    claimCoupon: mocks.claimCoupon,
  },
}))

vi.mock('@/store/UserContext', () => ({
  useUser: () => ({ isLoggedIn: true }),
}))

vi.mock('@/components/layout/PageLayout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import CouponShare from '@/pages/CouponShare/CouponShare'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CouponShare', () => {
  it('reloads authoritative remaining inventory after a successful claim', async () => {
    const baseCoupon = {
      id: 1,
      name: 'Share coupon',
      code: 'SHARE10',
      discount_type: 'fixed' as const,
      amount: 10,
      min_amount: '30.00',
      stackable: false,
      total_count: 10,
      claimed_count: 0,
      start_time: '2026-07-01T00:00:00Z',
      end_time: '2026-08-01T00:00:00Z',
      is_active: true,
      created_at: '2026-07-01T00:00:00Z',
      claimable: true,
    }
    mocks.getCouponDetail
      .mockResolvedValueOnce({ ...baseCoupon, remaining: 10 })
      .mockResolvedValueOnce({ ...baseCoupon, claimed_count: 1, remaining: 9 })
    mocks.claimCoupon.mockResolvedValue({ detail: 'claimed' })

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/coupon/SHARE10']}>
          <Routes>
            <Route path="/coupon/:code" element={<CouponShare />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    )

    await screen.findByText('10', { selector: 'dd' })
    fireEvent.click(screen.getByRole('button', { name: '立即领取' }))

    await waitFor(() => expect(mocks.getCouponDetail).toHaveBeenCalledTimes(2))
    expect(screen.getByText('9', { selector: 'dd' })).toBeTruthy()
  })
})
