import { ArrowUpRight, Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop } from '../context/shop';
import {
  BRAND_PRODUCTS,
  PRODUCTS_BY_ID,
  brandStats,
  fmtCount,
  focusOf,
  money,
  px,
  type Brand,
  type Product,
} from '../data/catalog';
import { HeartButton, Img, Stars } from './ui';

/* ------------------------------------------------------------------ */
/* Hero floating product card                                          */
/* 28px card · 8px frame · 20px image — concentric radii               */
/* ------------------------------------------------------------------ */

export function HeroCard({ product, small }: { product: Product; small?: boolean }) {
  const { openProduct } = useShop();
  return (
    <button
      type="button"
      onClick={() => openProduct(product.id)}
      aria-label={`${product.brand} — ${product.name}`}
      className={cn(
        'group block w-full bg-white text-left shadow-card transition duration-300 ease-out hover:scale-[1.045] hover:shadow-float',
        small ? 'rounded-[22px] p-1.5' : 'rounded-card p-2',
      )}
    >
      <div className={cn('aspect-square overflow-hidden bg-canvas', small ? 'rounded-[16px]' : 'rounded-img')}>
        <Img
          src={px(product.image, 400)}
          alt={product.name}
          loading="eager"
          style={{ objectPosition: focusOf(product) }}
          className="h-full w-full object-cover"
        />
      </div>
      <div className={cn('pb-1', small ? 'px-1 pt-2' : 'px-1.5 pt-2.5')}>
        <p className={cn('truncate font-semibold', small ? 'text-body-sm' : 'text-body')}>{product.brand}</p>
        <div className="mt-1 flex items-center gap-1">
          <Stars rating={product.rating} size={small ? 8 : 9} />
          <span className="text-micro text-muted">({fmtCount(product.reviews)})</span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Product card — elevated white card, image-first                     */
/* ------------------------------------------------------------------ */

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { openProduct, addToBag } = useShop();
  const discount = product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : 0;

  return (
    <article
      className={cn(
        'group relative rounded-card bg-white p-2 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-float',
        className,
      )}
    >
      <button type="button" onClick={() => openProduct(product.id)} className="block w-full text-left">
        <div className="relative aspect-square overflow-hidden rounded-img bg-canvas">
          <Img
            src={px(product.image, 520)}
            alt={product.name}
            style={{ objectPosition: focusOf(product) }}
            className="h-full w-full object-cover duration-700 group-hover:scale-[1.04]"
          />
          {discount > 0 && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-caption font-medium shadow-pill">
              −{discount}%
            </span>
          )}
        </div>
        <div className="px-2 pb-2 pt-3">
          <p className="truncate text-body-sm text-muted">{product.brand}</p>
          <p className="mt-0.5 truncate text-body">{product.name}</p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-body font-semibold">{money(product.price)}</span>
            {product.compareAt && <s className="text-body-sm text-muted">{money(product.compareAt)}</s>}
          </p>
          <div className="mt-1.5 flex items-center gap-1">
            <Stars rating={product.rating} size={9} />
            <span className="text-caption text-muted">({fmtCount(product.reviews)})</span>
          </div>
        </div>
      </button>

      <HeartButton id={product.id} className="absolute right-4 top-4" />

      {/* Quick add — overlay box mirrors the image geometry */}
      <div className="pointer-events-none absolute inset-x-2 top-2 aspect-square">
        <button
          type="button"
          aria-label={product.sizes ? `Choose options for ${product.name}` : `Add ${product.name} to bag`}
          onClick={() => (product.sizes ? openProduct(product.id) : addToBag(product.id))}
          className="pointer-events-auto absolute bottom-2.5 right-2.5 grid h-8 w-8 translate-y-1 place-items-center rounded-full bg-white text-ink opacity-0 shadow-float transition duration-300 hover:scale-110 focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Plus size={16} strokeWidth={2.25} />
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Product image tile — category grid with frosted label chip          */
/* ------------------------------------------------------------------ */

export function ProductTile({
  label,
  product,
  onClick,
  className,
}: {
  label: string;
  product: Product;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group relative block w-full overflow-hidden rounded-img bg-canvas text-left', className)}
    >
      <Img
        src={px(product.image, 720)}
        alt={`${label} — ${product.name}`}
        style={{ objectPosition: focusOf(product) }}
        className="absolute inset-0 h-full w-full object-cover duration-700 group-hover:scale-[1.05]"
      />
      <span className="absolute bottom-3 left-3 rounded-chip bg-white/80 px-3 py-2 text-body font-semibold backdrop-blur-md transition-colors duration-300 group-hover:bg-white">
        {label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Product type hero image — the image IS the card                     */
/* ------------------------------------------------------------------ */

export function FeatureImage({
  product,
  onClick,
  className,
}: {
  product: Product;
  onClick: () => void;
  className?: string;
}) {
  const stats = brandStats(product.brand);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group relative block w-full overflow-hidden rounded-card bg-umber text-left text-white', className)}
    >
      <Img
        src={px(product.image, 1400)}
        alt={product.name}
        style={{ objectPosition: focusOf(product) }}
        className="absolute inset-0 h-full w-full object-cover duration-700 group-hover:scale-[1.03]"
      />
      {/* legibility scrim for overlay type */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-black/45 to-transparent" />

      <div className="relative p-6 md:p-8">
        <p className="text-[34px] font-semibold leading-none tracking-[-0.055em] md:text-[48px]">{product.brand}</p>
        <div className="mt-3 flex items-center gap-2 text-body">
          <Stars rating={stats.rating} size={12} tone="white" />
          <span>{stats.rating.toFixed(1)}</span>
          <span className="text-white/75">({fmtCount(stats.reviews)} reviews)</span>
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 md:inset-x-6 md:bottom-6">
        <span className="min-w-0 rounded-chip bg-white/80 px-3 py-2 text-ink backdrop-blur-md">
          <span className="block truncate text-body font-semibold">{product.name}</span>
          <span className="block text-body-sm text-muted">{money(product.price)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-4 py-2.5 text-body font-medium text-ink shadow-pill transition duration-300 group-hover:shadow-float">
          Shop brand
          <ArrowUpRight size={16} strokeWidth={2.25} className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Brand spotlight card — with mini product thumbnail strip            */
/* ------------------------------------------------------------------ */

export function BrandCard({ brand }: { brand: Brand }) {
  const { setView, openProduct, followed, toggleFollow } = useShop();
  const cover = PRODUCTS_BY_ID[brand.cover];
  const strip = (BRAND_PRODUCTS[brand.name] ?? []).filter((p) => p.id !== cover.id).slice(0, 3);
  const following = followed.includes(brand.name);
  const openBrand = () => setView({ kind: 'brand', name: brand.name });

  return (
    <article className="w-[220px] shrink-0 snap-start rounded-card bg-white p-2 shadow-card sm:w-[240px]">
      <button type="button" onClick={openBrand} className="group block w-full text-left" aria-label={`Shop ${brand.name}`}>
        <div className="aspect-square overflow-hidden rounded-img bg-canvas">
          <Img
            src={px(cover.image, 520)}
            alt={brand.name}
            style={{ objectPosition: focusOf(cover) }}
            className="h-full w-full object-cover duration-700 group-hover:scale-[1.04]"
          />
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 px-1.5 pt-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={openBrand}
            className="block max-w-full truncate text-body font-semibold hover:underline hover:underline-offset-2"
          >
            {brand.name}
          </button>
          <div className="mt-1 flex items-center gap-1 text-micro text-muted">
            <Stars rating={brand.rating} size={9} />
            <span className="text-ink">{brand.rating.toFixed(1)}</span>
            <span>({fmtCount(brand.reviews)})</span>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={following}
          onClick={() => toggleFollow(brand.name)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-body-sm font-medium transition active:scale-95',
            following ? 'bg-canvas text-ink' : 'border border-hairline bg-white text-ink shadow-pill hover:bg-canvas',
          )}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>

      <div className="mt-3 flex gap-0.5 px-0.5 pb-0.5">
        {strip.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openProduct(p.id)}
            aria-label={p.name}
            className="h-12 w-12 overflow-hidden rounded-chip bg-canvas"
          >
            <Img src={px(p.image, 160)} alt="" className="h-full w-full object-cover hover:scale-110" />
          </button>
        ))}
        <button
          type="button"
          onClick={openBrand}
          aria-label={`See all from ${brand.name}`}
          className="grid h-12 w-12 place-items-center rounded-chip bg-canvas text-ink transition hover:bg-hairline"
        >
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </button>
      </div>
    </article>
  );
}
