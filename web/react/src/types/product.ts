/** 商品相关类型定义 */

export interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  discount?: number
  image: string
  category: string
  categoryId?: number
  description: string
  rating: number
  reviews: number
  badge?: string
}