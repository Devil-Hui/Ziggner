import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PRODUCTS_BY_ID, type View } from '../data/catalog';

export type DrawerTab = 'bag' | 'saved' | 'orders';

export interface BagItem {
  key: string;
  id: string;
  size?: string;
  qty: number;
}

export interface Order {
  id: string;
  items: BagItem[];
  total: number;
  placedAt: number;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  id: number;
  message: string;
  image?: number;
  action?: ToastAction;
}

interface ShopContextValue {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  bag: BagItem[];
  bagCount: number;
  subtotal: number;
  addToBag: (id: string, size?: string, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeFromBag: (key: string) => void;
  orders: Order[];
  checkout: () => void;
  followed: string[];
  toggleFollow: (brand: string) => void;
  activeProduct: string | null;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  drawer: DrawerTab | null;
  openDrawer: (tab: DrawerTab) => void;
  closeDrawer: () => void;
  toast: ToastData | null;
  notify: (message: string, opts?: { image?: number; action?: ToastAction }) => void;
  dismissToast: () => void;
  view: View | null;
  setView: (view: View | null) => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, [key, state]);

  return [state, setState] as const;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = usePersistentState<string[]>('shop:favorites', ['h4', 'w7', 'a1']);
  const [bag, setBag] = usePersistentState<BagItem[]>('shop:bag', []);
  const [orders, setOrders] = usePersistentState<Order[]>('shop:orders', []);
  const [followed, setFollowed] = usePersistentState<string[]>('shop:followed', ['Hearth Hour']);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerTab | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [view, setView] = useState<View | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string, opts?: { image?: number; action?: ToastAction }) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, ...opts });
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const dismissToast = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      const has = favorites.includes(id);
      setFavorites(has ? favorites.filter((f) => f !== id) : [id, ...favorites]);
      notify(has ? 'Removed from saved' : 'Saved to your list', {
        image: PRODUCTS_BY_ID[id]?.image,
        action: has ? undefined : { label: 'View', onClick: () => setDrawer('saved') },
      });
    },
    [favorites, notify, setFavorites],
  );

  const addToBag = useCallback(
    (id: string, size?: string, qty = 1) => {
      const key = size ? `${id}:${size}` : id;
      setBag((prev) => {
        const found = prev.find((i) => i.key === key);
        if (found) return prev.map((i) => (i.key === key ? { ...i, qty: Math.min(9, i.qty + qty) } : i));
        return [...prev, { key, id, size, qty }];
      });
      notify('Added to bag', {
        image: PRODUCTS_BY_ID[id]?.image,
        action: { label: 'View bag', onClick: () => setDrawer('bag') },
      });
    },
    [notify, setBag],
  );

  const setQty = useCallback(
    (key: string, qty: number) => {
      setBag((prev) =>
        qty <= 0
          ? prev.filter((i) => i.key !== key)
          : prev.map((i) => (i.key === key ? { ...i, qty: Math.min(9, qty) } : i)),
      );
    },
    [setBag],
  );

  const removeFromBag = useCallback((key: string) => setBag((prev) => prev.filter((i) => i.key !== key)), [setBag]);

  const bagCount = useMemo(() => bag.reduce((s, i) => s + i.qty, 0), [bag]);
  const subtotal = useMemo(() => bag.reduce((s, i) => s + (PRODUCTS_BY_ID[i.id]?.price ?? 0) * i.qty, 0), [bag]);

  const checkout = useCallback(() => {
    if (bag.length === 0) return;
    const order: Order = {
      id: `SH-${Math.floor(10000 + Math.random() * 90000)}`,
      items: bag,
      total: subtotal,
      placedAt: Date.now(),
    };
    setOrders((prev) => [order, ...prev]);
    setBag([]);
    setDrawer('orders');
    notify(`Order ${order.id} placed — thank you!`);
  }, [bag, subtotal, notify, setOrders, setBag]);

  const toggleFollow = useCallback(
    (brand: string) => {
      const has = followed.includes(brand);
      setFollowed(has ? followed.filter((b) => b !== brand) : [...followed, brand]);
      notify(has ? `Unfollowed ${brand}` : `Following ${brand}`);
    },
    [followed, notify, setFollowed],
  );

  const openProduct = useCallback((id: string) => setActiveProduct(id), []);
  const closeProduct = useCallback(() => setActiveProduct(null), []);
  const openDrawer = useCallback((tab: DrawerTab) => setDrawer(tab), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  // Lock page scroll while an overlay is open
  useEffect(() => {
    const lock = activeProduct !== null || drawer !== null;
    document.documentElement.style.overflow = lock ? 'hidden' : '';
  }, [activeProduct, drawer]);

  const value = useMemo<ShopContextValue>(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      bag,
      bagCount,
      subtotal,
      addToBag,
      setQty,
      removeFromBag,
      orders,
      checkout,
      followed,
      toggleFollow,
      activeProduct,
      openProduct,
      closeProduct,
      drawer,
      openDrawer,
      closeDrawer,
      toast,
      notify,
      dismissToast,
      view,
      setView,
    }),
    [
      favorites,
      isFavorite,
      toggleFavorite,
      bag,
      bagCount,
      subtotal,
      addToBag,
      setQty,
      removeFromBag,
      orders,
      checkout,
      followed,
      toggleFollow,
      activeProduct,
      openProduct,
      closeProduct,
      drawer,
      openDrawer,
      closeDrawer,
      toast,
      notify,
      dismissToast,
      view,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within <ShopProvider>');
  return ctx;
}
