import type { ApiCartItem } from '../api/public'
import type { CartItem } from '../types/cart'

export function toCartItem(item: ApiCartItem): CartItem {
  const price = Number(item.price)
  if (!Number.isFinite(price) || price < 0) {
    throw new TypeError(`Invalid cart item price for item ${item.id}`)
  }

  return {
    ...item,
    price,
  }
}

