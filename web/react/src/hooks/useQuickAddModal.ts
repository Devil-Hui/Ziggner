import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PublicSKU, PublicSPUDetail } from '../api/public'
import { useCart } from '../store/CartContext'
import { useUser } from '../store/UserContext'
import { commitQuickAddToCart } from '../utils/quickAdd'

/**
 * Shared quick-add modal state for product lists.
 * Modal requires full option selection before add (enforced inside ProductDetailModal).
 */
export function useQuickAddModal() {
  const navigate = useNavigate()
  const { isLoggedIn } = useUser()
  const { addItem } = useCart()
  const [productId, setProductId] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const redirectLogin = useCallback(() => {
    navigate(
      `/auth?tab=login&redirect=${encodeURIComponent(
        window.location.pathname + window.location.search,
      )}`,
    )
  }, [navigate])

  const openQuickAdd = useCallback(
    (e: React.MouseEvent | null, id: number) => {
      e?.stopPropagation()
      if (!isLoggedIn) {
        redirectLogin()
        return
      }
      setProductId(id)
      setIsOpen(true)
    },
    [isLoggedIn, redirectLogin],
  )

  const closeQuickAdd = useCallback(() => {
    setIsOpen(false)
    setProductId(null)
  }, [])

  const handleAddToCart = useCallback(
    (skuId: number, quantity: number, product: PublicSPUDetail, sku: PublicSKU) => {
      if (!isLoggedIn) {
        redirectLogin()
        return
      }
      void commitQuickAddToCart(addItem, skuId, quantity, product, sku)
    },
    [addItem, isLoggedIn, redirectLogin],
  )

  return {
    isLoggedIn,
    quickAddProductId: productId,
    quickAddOpen: isOpen,
    openQuickAdd,
    closeQuickAdd,
    handleQuickAddToCart: handleAddToCart,
    redirectLogin,
  }
}
