import { describe, expect, it } from 'vitest'

import { getSafeLoginRedirect } from '@/pages/Auth/loginRedirect'

describe('getSafeLoginRedirect', () => {
  it('keeps an internal coupon share URL', () => {
    expect(getSafeLoginRedirect('?redirect=%2Fcoupon%2FSHARE10')).toBe('/coupon/SHARE10')
  })

  it('rejects absolute and protocol-relative redirects', () => {
    expect(getSafeLoginRedirect('?redirect=https%3A%2F%2Fevil.example')).toBe('/profile')
    expect(getSafeLoginRedirect('?redirect=%2F%2Fevil.example')).toBe('/profile')
  })

  it('uses the profile page when no redirect is provided', () => {
    expect(getSafeLoginRedirect('')).toBe('/profile')
  })
})
