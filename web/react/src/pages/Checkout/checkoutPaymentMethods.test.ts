import { describe, expect, it } from 'vitest'

import { getCheckoutPaymentMethods } from './checkoutPaymentMethods'

describe('getCheckoutPaymentMethods', () => {
  it('exposes the simulator only when the environment explicitly enables it', () => {
    expect(getCheckoutPaymentMethods(true)).toContain('mock')
    expect(getCheckoutPaymentMethods(false)).not.toContain('mock')
  })
})

