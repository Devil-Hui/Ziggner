import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { publicAPI } from '../api/public'
import { getUserAccessToken } from '../api/request'

// ── 类型定义 ──

export interface CartItem {
  id: number
  skuId: number
  productId: number
  name: string
  price: number
  quantity: number
  image: string
  size?: string
  color?: string
}

interface CartContextValue {
  items: CartItem[]
  isLoading: boolean
  addItem: (skuId: number, quantity?: number, name?: string, price?: number, image?: string) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextValue>({
  items: [],
  isLoading: true,
  addItem: async () => {},
  removeItem: async () => {},
  updateQuantity: async () => {},
  clearCart: () => {},
  total: 0,
  count: 0,
})

export const useCart = () => useContext(CartContext)

// ── 工具函数 ──

function mapBackendItem(item: Record<string, unknown>): CartItem {
  return {
    id: item.id as number,
    skuId: (item.sku_id || item.skuId || item.sku) as number,
    productId: (item.product_id || item.productId || item.spu_id || (item.sku_id || item.skuId)) as number,
    name: (item.spu_name || item.name) as string,
    price: Number(item.price || 0),
    quantity: item.quantity as number,
    image: (item.image as string) || '',
    size: item.size as string | undefined,
    color: item.color as string | undefined,
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const addInProgress = useRef<Set<number>>(new Set())

  // 加载购物车
  const fetchCart = useCallback(async () => {
    try {
      const data = await publicAPI.getCart()
      // 后端返回格式可能是数组 [...] 或 { items: [...] }
      const items = Array.isArray(data) ? data : (data as unknown as { items: Record<string, unknown>[] }).items
      const mapped = (items || []).map(mapBackendItem)
      setItems(mapped)
    } catch {
      // 网络错误时保留旧数据，不清空购物车
      // 只有首次加载且无数据时才会显示空购物车
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // 管理后台页面不需要购物车数据
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return
    }
    // 未登录用户不自动拉取购物车（防止401错误）
    const token = getUserAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchCart()
  }, [fetchCart])

  const addItem = useCallback(async (skuId: number, quantity = 1, name?: string, price?: number, image?: string) => {
    // 防止重复添加: 如果此 SKU 正在添加中，跳过
    if (addInProgress.current.has(skuId)) {
      return
    }
    try {
      addInProgress.current.add(skuId)
      await publicAPI.addToCart(skuId, quantity)
      // 重新加载购物车以获取最新数据
      await fetchCart()
    } catch {
      // 如果 API 失败，降级到本地状态
      setItems(prev => {
        const existing = prev.find(item => item.skuId === skuId)
        if (existing) {
          return prev.map(item =>
            item.skuId === skuId ? { ...item, quantity: item.quantity + quantity } : item
          )
        }
        return [...prev, {
          id: Date.now(),
          skuId,
          productId: skuId,
          name: name || '',
          price: price || 0,
          quantity,
          image: image || '',
        }]
      })
    } finally {
      addInProgress.current.delete(skuId)
    }
  }, [fetchCart])

  const removeItem = useCallback(async (itemId: number) => {
    try {
      await publicAPI.removeCartItem(itemId)
      await fetchCart()
    } catch {
      setItems(prev => prev.filter(item => item.id !== itemId))
    }
  }, [fetchCart])

  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId)
      return
    }
    try {
      await publicAPI.updateCartItem(itemId, quantity)
      await fetchCart()
    } catch {
      setItems(prev =>
        prev.map(item => (item.id === itemId ? { ...item, quantity } : item))
      )
    }
  }, [fetchCart, removeItem])

  const clearCart = useCallback(async () => {
    try {
      await publicAPI.clearCart();
    } catch {
      // silent fail
    }
    setItems([])
  }, [])

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, isLoading, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export default CartContext