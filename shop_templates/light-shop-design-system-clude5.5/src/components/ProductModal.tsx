import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, ShieldCheck, Truck, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop } from '../context/shop';
import { BRAND_PRODUCTS, PRODUCTS_BY_ID, describe, fmtCount, focusOf, money, px } from '../data/catalog';
import { HeartButton, Img, Stars } from './ui';

export function ProductModal() {
  const { activeProduct, closeProduct, openProduct, addToBag, setView, closeDrawer } = useShop();
  const product = activeProduct ? PRODUCTS_BY_ID[activeProduct] : null;
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSize(null);
    setQty(1);
    setSizeError(false);
    panelRef.current?.scrollTo({ top: 0 });
  }, [activeProduct]);

  useEffect(() => {
    if (!activeProduct) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProduct();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeProduct, closeProduct]);

  if (!product) return null;

  const more = (BRAND_PRODUCTS[product.brand] ?? []).filter((p) => p.id !== product.id).slice(0, 5);

  const add = () => {
    if (product.sizes && !size) {
      setSizeError(true);
      return;
    }
    addToBag(product.id, size ?? undefined, qty);
    closeProduct();
  };

  const openBrand = () => {
    closeProduct();
    closeDrawer();
    setView({ kind: 'brand', name: product.brand });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={closeProduct} />

      <div
        ref={panelRef}
        className="relative max-h-[92dvh] w-full max-w-[960px] overflow-y-auto rounded-t-card bg-white p-2 shadow-float animate-modal-in sm:rounded-card"
      >
        <div className="grid gap-2 md:grid-cols-[1.05fr_1fr]">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-img bg-canvas md:aspect-auto md:min-h-[560px]">
            <Img
              key={product.id}
              src={px(product.image, 1100)}
              alt={product.name}
              loading="eager"
              style={{ objectPosition: focusOf(product) }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {product.compareAt && (
              <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-body-sm font-medium shadow-pill">
                Save {money(product.compareAt - product.price)}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-10">
              <button type="button" onClick={openBrand} className="group flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-body-sm font-semibold">
                  {product.brand.charAt(0)}
                </span>
                <span className="text-body font-semibold group-hover:underline group-hover:underline-offset-2">
                  {product.brand}
                </span>
              </button>
              <span className="flex items-center gap-1.5 text-body-sm text-muted">
                <Stars rating={product.rating} size={11} />
                <span className="text-ink">{product.rating.toFixed(1)}</span>({fmtCount(product.reviews)})
              </span>
            </div>

            <h2 className="mt-4 text-[26px] font-semibold leading-[1.1] tracking-[-0.045em] sm:text-[30px]">
              {product.name}
            </h2>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-title font-semibold">{money(product.price)}</span>
              {product.compareAt && <s className="text-body text-muted">{money(product.compareAt)}</s>}
            </p>
            <p className="mt-4 text-body text-muted">{describe(product)}</p>

            {product.sizes && (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm font-medium">Size</p>
                  {sizeError && (
                    <p role="alert" className="text-body-sm text-ink">
                      Select a size to continue
                    </p>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={size === s}
                      onClick={() => {
                        setSize(s);
                        setSizeError(false);
                      }}
                      className={cn(
                        'h-10 min-w-12 rounded-full px-4 text-body transition active:scale-95',
                        size === s
                          ? 'bg-ink text-white'
                          : cn('border bg-white shadow-pill hover:bg-canvas', sizeError ? 'border-ink/40' : 'border-hairline'),
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <div className="flex h-12 shrink-0 items-center rounded-full border border-hairline bg-white px-1 shadow-pill">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-canvas"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-body-lg tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(9, q + 1))}
                  className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-canvas"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={add}
                className="h-12 min-w-0 flex-1 truncate rounded-full bg-ink px-5 text-body-lg font-medium text-white transition hover:bg-umber active:scale-[0.98]"
              >
                Add to bag · {money(product.price * qty)}
              </button>
              <HeartButton id={product.id} size="lg" />
            </div>

            <ul className="mt-6 space-y-3 border-t border-hairline pt-5 text-body">
              <li className="flex items-center gap-3">
                <Truck size={18} strokeWidth={1.75} className="shrink-0" />
                Free shipping on orders over $75
              </li>
              <li className="flex items-center gap-3">
                <RotateCcw size={18} strokeWidth={1.75} className="shrink-0" />
                Free 30-day returns
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0" />
                Purchase protection on every order
              </li>
            </ul>

            {more.length > 0 && (
              <div className="mt-6">
                <p className="text-body-sm font-medium">More from {product.brand}</p>
                <div className="mt-2 flex gap-0.5">
                  {more.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => openProduct(m.id)}
                      aria-label={m.name}
                      className="h-12 w-12 overflow-hidden rounded-chip bg-canvas"
                    >
                      <Img src={px(m.image, 120)} alt="" className="h-full w-full object-cover hover:scale-110" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={closeProduct}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white shadow-float transition hover:scale-105"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
