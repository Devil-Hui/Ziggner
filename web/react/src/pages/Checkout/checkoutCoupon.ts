import type { PublicCoupon, UserCoupon } from '../../api/public'

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function numeric(value: number | string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function calculateCouponDiscount(total: number, coupon?: PublicCoupon | null): number {
  const orderTotal = numeric(total)
  if (!coupon || orderTotal < numeric(coupon.min_amount)) return 0

  const amount = numeric(coupon.amount)
  const rawDiscount = coupon.discount_type === 'percent'
    ? orderTotal * amount / 100
    : amount
  const maxDiscount = numeric(coupon.max_discount)
  const cappedDiscount = maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount

  return money(Math.min(orderTotal, cappedDiscount))
}

export function getSelectableUserCoupons(coupons: UserCoupon[]): UserCoupon[] {
  return coupons.filter(({ status }) => status === 'available' || status === 'returned')
}

export function buildCheckoutCouponSelection(userCouponId: number | null): { user_coupon_id?: number } {
  return userCouponId == null ? {} : { user_coupon_id: userCouponId }
}
