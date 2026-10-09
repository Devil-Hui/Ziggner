import { useEffect } from 'react';
import { Heart, Minus, Package, Plus, ShoppingBag, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop, type BagItem, type DrawerTab, type Order } from '../context/shop';
import { PRODUCTS_BY_ID, money, px } from '../data/catalog';
import { EmptyState, HeartButton, Img, PillButton } from './ui';

const FREE_SHIPPING = 75;
const STEPS = ['Placed', 'Shipped', 'Out for delivery', 'Delivered'];

export function Drawer() {
  const { drawer, openDrawer, closeDrawer, bag, bagCount, subtotal, favorites, orders, checkout, activeProduct } =
    useShop();

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !activeProduct) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, activeProduct, closeDrawer]);

  if (!drawer) return null;

  const tabs: { key: DrawerTab; label: string; count: number }[] = [
    { key: 'bag', label: 'Bag', count: bagCount },
    { key: 'saved', label: 'Saved', count: favorites.length },
    { key: 'orders', label: 'Orders', count: orders.length },
  ];
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING) * 100);
  const browse = <PillButton onClick={closeDrawer}>Continue shopping</PillButton>;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={closeDrawer} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Bag, saved items and orders"
        className="absolute bottom-2 right-2 top-2 flex w-[calc(100%-16px)] max-w-[420px] flex-col overflow-hidden rounded-card bg-white shadow-float animate-drawer-in"
      >
        <header className="flex items-center justify-between gap-3 p-4">
          <div role="tablist" aria-label="Drawer sections" className="flex rounded-full bg-canvas p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={drawer === t.key}
                onClick={() => openDrawer(t.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-body transition',
                  drawer === t.key ? 'bg-white text-ink shadow-pill' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
                {t.count > 0 && <span className="text-body-sm text-muted">{t.count}</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={closeDrawer}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-canvas"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {drawer === 'bag' &&
            (bag.length ? (
              <BagList items={bag} />
            ) : (
              <EmptyState
                icon={<ShoppingBag size={22} />}
                title="Your bag is empty"
                body="Items you add will show up here, ready for one-tap checkout."
                action={browse}
              />
            ))}
          {drawer === 'saved' &&
            (favorites.length ? (
              <SavedGrid ids={favorites} />
            ) : (
              <EmptyState
                icon={<Heart size={22} />}
                title="Nothing saved yet"
                body="Tap the heart on any product to keep it for later."
                action={browse}
              />
            ))}
          {drawer === 'orders' &&
            (orders.length ? (
              <OrderList orders={orders} />
            ) : (
              <EmptyState
                icon={<Package size={22} />}
                title="No orders yet"
                body="Track every order from every brand, all in one place."
                action={browse}
              />
            ))}
        </div>

        {drawer === 'bag' && bag.length > 0 && (
          <footer className="border-t border-hairline p-4">
            <p className="text-body-sm text-muted">
              {remaining > 0 ? (
                <>
                  You're <span className="text-ink">{money(remaining)}</span> away from free shipping
                </>
              ) : (
                'You’ve unlocked free shipping'
              )}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-body text-muted">Subtotal</span>
              <span className="text-title font-semibold">{money(subtotal)}</span>
            </div>
            <button
              type="button"
              onClick={checkout}
              className="mt-4 h-12 w-full rounded-full bg-ink text-body-lg font-medium text-white transition hover:bg-umber active:scale-[0.99]"
            >
              Check out
            </button>
            <p className="mt-2 text-center text-caption text-muted">Demo checkout — no payment is taken.</p>
          </footer>
        )}
      </aside>
    </div>
  );
}

function BagList({ items }: { items: BagItem[] }) {
  const { setQty, removeFromBag, openProduct } = useShop();
  return (
    <ul className="divide-y divide-hairline">
      {items.map((item) => {
        const p = PRODUCTS_BY_ID[item.id];
        if (!p) return null;
        return (
          <li key={item.key} className="flex gap-3 py-3">
            <button
              type="button"
              onClick={() => openProduct(p.id)}
              aria-label={p.name}
              className="h-20 w-20 shrink-0 overflow-hidden rounded-[16px] bg-canvas"
            >
              <Img src={px(p.image, 160)} alt="" className="h-full w-full object-cover" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-body-sm text-muted">{p.brand}</p>
                  <p className="truncate text-body">{p.name}</p>
                  {item.size && <p className="text-body-sm text-muted">Size {item.size}</p>}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => removeFromBag(item.key)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex h-8 items-center rounded-full border border-hairline">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty(item.key, item.qty - 1)}
                    className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-canvas"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-5 text-center text-body tabular-nums">{item.qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQty(item.key, item.qty + 1)}
                    className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-canvas"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-body font-medium">{money(p.price * item.qty)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SavedGrid({ ids }: { ids: string[] }) {
  const { openProduct, addToBag } = useShop();
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 pt-1">
      {ids.map((id) => {
        const p = PRODUCTS_BY_ID[id];
        if (!p) return null;
        return (
          <div key={id} className="relative">
            <button type="button" onClick={() => openProduct(id)} className="block w-full text-left">
              <div className="aspect-square overflow-hidden rounded-img bg-canvas">
                <Img src={px(p.image, 360)} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <p className="mt-2 truncate text-body-sm text-muted">{p.brand}</p>
              <p className="truncate text-body">{p.name}</p>
            </button>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-body font-semibold">{money(p.price)}</span>
              <button
                type="button"
                onClick={() => (p.sizes ? openProduct(id) : addToBag(id))}
                className="rounded-full bg-ink px-3 py-1.5 text-body-sm font-medium text-white transition hover:bg-umber"
              >
                {p.sizes ? 'Options' : 'Add'}
              </button>
            </div>
            <HeartButton id={id} className="absolute right-2 top-2" />
          </div>
        );
      })}
    </div>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  const { openProduct } = useShop();
  return (
    <ul className="space-y-3 pt-1">
      {orders.map((o) => {
        const count = o.items.reduce((s, i) => s + i.qty, 0);
        return (
          <li key={o.id} className="rounded-img border border-hairline p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body font-semibold">Order {o.id}</p>
                <p className="mt-0.5 text-body-sm text-muted">
                  {new Date(o.placedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {count}{' '}
                  {count === 1 ? 'item' : 'items'} · {money(o.total)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-canvas px-3 py-1 text-body-sm">Processing</span>
            </div>
            <div className="mt-3 flex gap-0.5">
              {o.items.slice(0, 5).map((i) => {
                const p = PRODUCTS_BY_ID[i.id];
                return p ? (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => openProduct(p.id)}
                    aria-label={p.name}
                    className="h-12 w-12 overflow-hidden rounded-chip bg-canvas"
                  >
                    <Img src={px(p.image, 120)} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : null;
              })}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1">
              {STEPS.map((s, idx) => (
                <span key={s} className={cn('h-1 rounded-full', idx === 0 ? 'bg-ink' : 'bg-canvas')} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1 text-caption text-muted">
              {STEPS.map((s, idx) => (
                <span
                  key={s}
                  className={cn(idx === 0 && 'text-ink', (idx === 1 || idx === 2) && 'text-center', idx === 3 && 'text-right')}
                >
                  {s}
                </span>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
