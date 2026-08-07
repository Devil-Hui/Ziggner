import { useState, useCallback } from 'react';
import { publicAPI } from '../api/public';
import type { PaymentMethodType, PaymentSession, PaymentStatusResult } from '../types/payment';

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCallback(async (
    orderNo: string,
    method: PaymentMethodType,
  ): Promise<PaymentSession | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await publicAPI.createPayment(orderNo, method);
      return data as unknown as PaymentSession;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Payment creation failed';
      setError(msg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const pollPaymentStatus = useCallback(async (orderNo: string): Promise<PaymentStatusResult | null> => {
    try {
      return await publicAPI.getPaymentStatus(orderNo) as unknown as PaymentStatusResult;
    } catch {
      return null;
    }
  }, []);

  return { createPayment, pollPaymentStatus, isProcessing, error };
}
