/** 购物车相关类型定义 — 与后端 CartItemSerializer 对齐 */

export interface CartItem {
  id: number
  sku_id: number
  sku_code: string
  spu_name: string
  price: number
  stock: number
  image: string
  spec_values: { spec_name: string; spec_value: string }[]
  quantity: number
  selected: boolean
  created_at: string
}

export const initialCartItems: CartItem[] = []