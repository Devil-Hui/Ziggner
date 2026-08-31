export type CheckoutPaymentMethod = 'paypal' | 'stripe'

export function getCheckoutPaymentMethods(_mockEnabled: boolean): CheckoutPaymentMethod[] {
  // 生产环境仅开放 PayPal（优先，支持绑卡）与信用卡（Stripe）
  return ['paypal', 'stripe']
}