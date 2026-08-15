/** Payment type definitions. */

export type PaymentMethodType = 'stripe' | 'paypal' | 'alipay' | 'mock';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface PaymentSession {
  payment_no: string;
  pay_url: string;
  client_secret?: string;
}

export interface PaymentStatusResult {
  paid: boolean;
  status: PaymentStatus | null;
  method: PaymentMethodType | null;
  payment_no: string | null;
  amount: number | null;
  currency: string | null;
}
