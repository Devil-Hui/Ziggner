/** 购物车相关类型定义 */

export interface CartItem {
  id: number
  productId: number
  name: string
  price: number
  quantity: number
  image: string
  size?: string
  color?: string
}

export const initialCartItems: CartItem[] = []