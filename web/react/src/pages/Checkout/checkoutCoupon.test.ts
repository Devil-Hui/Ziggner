import { describe, expect, it } from 'vitest'

import type { PublicCoupon, UserCoupon } from '../../api/public'
import {
  buildCheckoutCouponSelection,
  calculateCouponDiscount,
  getSelectableUserCoupons,
} from './checkoutCoupon'

function coupon(overrides: Partial<PublicCoupon> = {}): PublicCoupon {
  return {
    id: 1,
    code: 'SAVE15',
    discount_type: 'percent',
    amount: 15,
    min_amount: '50.00',
    max_discount: '30.00',
    stackable: false,
    total_count: 100,
    claimed_count: 1,
    start_time: '2026-01-01T00:00:00Z',
    end_time: '2027-01-01T00:00:00Z',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function userCoupon(id: number, status: UserCoupon['status']): UserCoupon {
  return {
    id,
    status,
    coupon: coupon({ id, code: `SAVE${id}` }),
    claimed_at: '2026-01-01T00:00:00Z',
  }
}

describe('calculateCouponDiscount', () => {
  it('returns zero when a percentage coupon minimum is not met', () => {
    expect(calculateCouponDiscount(19.99, coupon())).toBe(0)
  })

  it('calculates a percentage discount after the minimum is met', () => {
    expect(calculateCouponDiscount(100, coupon())).toBe(15)
  })

  it('caps a percentage discount at max_discount', () => {
    expect(calculateCouponDiscount(300, coupon())).toBe(30)
  })

  it('enforces the minimum and order total for a fixed coupon', () => {
    const fixed = coupon({ discount_type: 'fixed', amount: 25, min_amount: '50.00' })

    expect(calculateCouponDiscount(49.99, fixed)).toBe(0)
    expect(calculateCouponDiscount(60, fixed)).toBe(25)
    expect(calculateCouponDiscount(10, coupon({ discount_type: 'fixed', amount: 25, min_amount: '0' }))).toBe(10)
  })
})

describe('checkout coupon selection', () => {
  it('only exposes available and returned user coupons', () => {
    const coupons = [
      userCoupon(1, 'available'),
      userCoupon(2, 'returned'),
      userCoupon(3, 'locked'),
      userCoupon(4, 'used'),
      userCoupon(5, 'expired'),
    ]

    expect(getSelectableUserCoupons(coupons).map(item => item.id)).toEqual([1, 2])
  })

  it('submits the owned coupon id and never the public coupon code', () => {
    expect(buildCheckoutCouponSelection(42)).toEqual({ user_coupon_id: 42 })
    expect(buildCheckoutCouponSelection(null)).toEqual({})
  })
})
