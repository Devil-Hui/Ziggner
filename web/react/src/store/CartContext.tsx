import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { publicAPI } from '../api/public'
import type { CartItem } from '../types/cart'
import { toCartItem } from './cartMapper'
import { useUser } from './UserContext'

// ── 类型定义 ──

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const addInProgress = useRef<Set<number>>(new Set())
  const { isLoggedIn, isLoading: isUserLoading } = useUser()

  // 加载购物车
  const fetchCart = useCallback(async () => {
    try {
      const data = await publicAPI.getCart()
      setItems(data.map(toCartItem))
    } catch {
      // 网络错误时保留旧数据，不清空购物车
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // 管理后台页面不需要购物车数据
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      setIsLoading(false)
      return
    }
    if (isUserLoading) return
    if (!isLoggedIn) {
      setItems([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    void fetchCart()
  }, [fetchCart, isLoggedIn, isUserLoading])

  const addItem = useCallback(async (skuId: number, quantity = 1) => {
    if (addInProgress.current.has(skuId)) return
    try {
      addInProgress.current.add(skuId)
      await publicAPI.addToCart(skuId, quantity)
      await fetchCart()
    } catch (error) {
      // Keep the current state, but let callers avoid displaying a false success.
      throw error
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

  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, isLoading, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export default CartContext
