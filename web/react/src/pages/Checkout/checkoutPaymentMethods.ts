export type CheckoutPaymentMethod = 'mock' | 'paypal' | 'stripe'

export function getCheckoutPaymentMethods(mockEnabled: boolean): CheckoutPaymentMethod[] {
  return mockEnabled ? ['mock', 'paypal', 'stripe'] : ['paypal', 'stripe']
}

