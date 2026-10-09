import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop } from '../context/shop';
import { POPULAR_SEARCHES, matchBrands, money, px, searchProducts } from '../data/catalog';
import { Img } from './ui';

export function SearchBar({
  size = 'lg',
  prefix,
  inputId,
  className,
}: {
  size?: 'lg' | 'sm';
  prefix?: ReactNode;
  inputId?: string;
  className?: string;
}) {
  const { view, setView, openProduct } = useShop();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Reflect the submitted query in every search instance
  useEffect(() => {
    if (view?.kind === 'query') setQ(view.q);
  }, [view]);

  const products = useMemo(() => searchProducts(q).slice(0, 5), [q]);
  const brands = useMemo(() => matchBrands(q).slice(0, 3), [q]);
  const hasQuery = q.trim().length > 0;

  useEffect(() => setActive(-1), [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const submit = (value = q) => {
    const v = value.trim();
    if (!v) {
      inputRef.current?.focus();
      return;
    }
    setQ(v);
    setView({ kind: 'query', q: v });
    setOpen(false);
    inputRef.current?.blur();
  };

  const pick = (id: string) => {
    openProduct(id);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, products.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && active >= 0 && products[active]) {
      e.preventDefault();
      pick(products[active].id);
    }
  };

  const lg = size === 'lg';

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn('relative w-full text-left', className)}
    >
      <div
        className={cn(
          'flex items-center rounded-full bg-white transition-shadow duration-300',
          lg
            ? 'h-14 border border-black/10 pl-5 pr-1 shadow-pill focus-within:shadow-float'
            : 'h-12 pl-4 pr-1.5 shadow-float',
        )}
      >
        {prefix}
        <input
          ref={inputRef}
          id={inputId}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="What are you shopping for today?"
          aria-label="Search products and brands"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-none placeholder:text-muted"
        />
        {hasQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className={cn(
            'grid shrink-0 place-items-center rounded-full bg-shop text-white shadow-violet transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-shop-wash active:scale-95',
            lg ? 'h-12 w-12' : 'h-9 w-9',
          )}
        >
          <ArrowRight size={lg ? 20 : 18} strokeWidth={2.25} />
        </button>
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-card bg-white p-2 shadow-float animate-fade-up"
        >
          {!hasQuery ? (
            <div className="p-3">
              <p className="px-1 text-body-sm text-muted">Popular right now</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-body shadow-pill transition hover:bg-canvas"
                  >
                    <Search size={13} strokeWidth={2.25} className="text-muted" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : products.length === 0 && brands.length === 0 ? (
            <p className="px-4 py-5 text-body text-muted">
              No matches for “{q.trim()}”. Try “candle”, “linen”, or “gold”.
            </p>
          ) : (
            <>
              {brands.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-2">
                  <span className="text-body-sm text-muted">Brands</span>
                  {brands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setView({ kind: 'brand', name: b });
                        setOpen(false);
                      }}
                      className="rounded-full bg-canvas px-3 py-1.5 text-body transition hover:bg-hairline"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
              <ul className="mt-1">
                {products.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(p.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[16px] p-2 text-left transition-colors',
                        i === active && 'bg-canvas',
                      )}
                    >
                      <Img src={px(p.image, 96)} alt="" className="h-11 w-11 shrink-0 rounded-chip bg-canvas object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body">{p.name}</span>
                        <span className="block truncate text-body-sm text-muted">{p.brand}</span>
                      </span>
                      <span className="shrink-0 pr-1 text-body font-medium">{money(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                className="mt-1 flex w-full items-center justify-between rounded-[16px] px-3 py-3 text-body transition hover:bg-canvas"
              >
                <span className="truncate">See all results for “{q.trim()}”</span>
                <ArrowRight size={16} className="shrink-0" />
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
