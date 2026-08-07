type MoneyFields = {
  total_amount?: number | string | null
  actual_amount?: number | string | null
  discount_amount?: number | string | null
}

function money(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getOrderItemImage(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

export function getOrderAmounts(order: MoneyFields) {
  return {
    subtotal: money(order.total_amount),
    discount: money(order.discount_amount),
    payable: money(order.actual_amount),
  }
}

export function markOrderCancelled<T extends { status: string; cancel_reason?: string }>(
  order: T,
  reason: string,
): T {
  return { ...order, status: 'cancelled', cancel_reason: reason }
}
