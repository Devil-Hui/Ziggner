export type CheckoutPaymentMethod = 'mock' | 'paypal' | 'stripe' | 'alipay'

export function getCheckoutPaymentMethods(mockEnabled: boolean): CheckoutPaymentMethod[] {
  return mockEnabled ? ['mock', 'paypal', 'stripe', 'alipay'] : ['paypal', 'stripe', 'alipay']
}

