import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop } from '../context/shop';
import {
  BRANDS,
  MIXED,
  POPULAR_SEARCHES,
  PRODUCTS,
  PRODUCTS_BY_ID,
  TRENDING,
  brandStats,
  filterView,
  fmtCount,
  sortProducts,
  viewTitle,
  type CategoryId,
  type Product,
  type SortKey,
} from '../data/catalog';
import { BrandCard, FeatureImage, ProductCard, ProductTile } from './cards';
import { Chip, EmptyState, PillButton, Rail, SectionHeader, Stars } from './ui';

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  onTitle,
  meta,
  children,
}: {
  id?: string;
  title: string;
  onTitle?: () => void;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionHeader title={title} onClick={onTitle} meta={meta} />
      {children}
    </section>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

const RAIL_ITEM = 'w-[188px] shrink-0 snap-start sm:w-[216px]';

type Split = { category: CategoryId; feature: string; tiles: [string, string][]; mirror?: boolean };

const SPLITS: Record<'women' | 'beauty' | 'baby' | 'accessories', Split> = {
  women: {
    category: 'women',
    feature: 'w2',
    tiles: [
      ['Sets', 'w1'],
      ['Bags', 'w4'],
      ['Jewelry', 'w7'],
      ['Tops', 'w3'],
    ],
  },
  beauty: {
    category: 'beauty',
    feature: 'b5',
    tiles: [
      ['Skincare', 'b1'],
      ['Body', 'b2'],
      ['Fragrance', 'b4'],
      ['Bath', 'b6'],
    ],
    mirror: true,
  },
  baby: {
    category: 'baby',
    feature: 'k4',
    tiles: [
      ['Clothing', 'k2'],
      ['Gifts', 'k3'],
      ['Toys', 'k1'],
      ['Ride-ons', 'k7'],
    ],
  },
  accessories: {
    category: 'accessories',
    feature: 'a2',
    tiles: [
      ['Audio', 'a1'],
      ['Watches', 'a3'],
      ['Sunglasses', 'a4'],
      ['Bags', 'a7'],
    ],
    mirror: true,
  },
};

const MEN_TILES: [string, string][] = [
  ['Jackets', 'm1'],
  ['Outerwear', 'm2'],
  ['Knitwear', 'm3'],
  ['Sneakers', 'm9'],
];

/** Two-column composition: hero image (~60%) + 2×2 product-type tiles. */
function FeatureSplit({ category, feature, tiles, mirror }: Split) {
  const { setView } = useShop();
  const f = PRODUCTS_BY_ID[feature];
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <FeatureImage
        product={f}
        onClick={() => setView({ kind: 'brand', name: f.brand })}
        className={cn(
          'aspect-[4/5] sm:aspect-[16/10] lg:col-span-3 lg:aspect-auto lg:h-full lg:min-h-[400px]',
          mirror && 'lg:order-2',
        )}
      />
      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        {tiles.map(([label, id]) => (
          <ProductTile
            key={label}
            label={label}
            product={PRODUCTS_BY_ID[id]}
            className="aspect-[4/5]"
            onClick={() => setView({ kind: 'category', id: category, type: label })}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

export function Feed() {
  const { setView, followed } = useShop();
  const browse = (id: CategoryId) => () => setView({ kind: 'category', id });
  const home = useMemo(() => PRODUCTS.filter((p) => p.category === 'home'), []);

  return (
    <>
      <Section
        title="Brands you'll love"
        meta={<span className="text-body-sm text-muted">Following {followed.length}</span>}
      >
        <Rail label="Featured brands">
          {BRANDS.map((b) => (
            <BrandCard key={b.name} brand={b} />
          ))}
        </Rail>
      </Section>

      <Section id="section-women" title="Women" onTitle={browse('women')}>
        <FeatureSplit {...SPLITS.women} />
      </Section>

      <Section title="Trending now" meta={<span className="text-body-sm text-muted">Updated hourly</span>}>
        <Rail label="Trending products">
          {TRENDING.map((p) => (
            <ProductCard key={p.id} product={p} className={RAIL_ITEM} />
          ))}
        </Rail>
      </Section>

      <Section id="section-men" title="Men" onTitle={browse('men')}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {MEN_TILES.map(([label, id]) => (
            <ProductTile
              key={label}
              label={label}
              product={PRODUCTS_BY_ID[id]}
              className="aspect-[3/4]"
              onClick={() => setView({ kind: 'category', id: 'men', type: label })}
            />
          ))}
        </div>
      </Section>

      <Section id="section-beauty" title="Beauty" onTitle={browse('beauty')}>
        <FeatureSplit {...SPLITS.beauty} />
      </Section>

      <Section id="section-home" title="Home" onTitle={browse('home')}>
        <Rail label="Home products">
          {home.map((p) => (
            <ProductCard key={p.id} product={p} className={RAIL_ITEM} />
          ))}
        </Rail>
      </Section>

      <Section id="section-baby" title="Baby & toddler" onTitle={browse('baby')}>
        <FeatureSplit {...SPLITS.baby} />
      </Section>

      <Section id="section-accessories" title="Tech & accessories" onTitle={browse('accessories')}>
        <FeatureSplit {...SPLITS.accessories} />
      </Section>

      <PickedForYou />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Picked for you                                                      */
/* ------------------------------------------------------------------ */

const FILTERS: { key: string; label: string; test: (p: Product) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'under-50', label: 'Under $50', test: (p) => p.price < 50 },
  { key: 'top', label: 'Top rated', test: (p) => p.rating >= 4.8 },
  { key: 'sale', label: 'On sale', test: (p) => p.compareAt !== undefined },
];

function PickedForYou() {
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(10);

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return MIXED.filter(f.test);
  }, [filter]);

  return (
    <section id="picked" className="scroll-mt-24">
      <SectionHeader title="Picked for you" meta={<span className="text-body-sm text-muted">{list.length} items</span>} />
      <div className="no-scrollbar -mx-4 -mt-3 mb-5 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            active={filter === f.key}
            onClick={() => {
              setFilter(f.key);
              setLimit(10);
            }}
          >
            {f.label}
          </Chip>
        ))}
      </div>
      <ProductGrid products={list.slice(0, limit)} />
      {limit < list.length && (
        <div className="mt-10 flex justify-center">
          <PillButton onClick={() => setLimit((l) => l + 10)} className="px-6 py-3 text-body-lg">
            Show more
          </PillButton>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Results — search, category, brand, sale views                       */
/* ------------------------------------------------------------------ */

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'rating', label: 'Top rated' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
];

export function Results() {
  const { view, setView, followed, toggleFollow } = useShop();
  const [sort, setSort] = useState<SortKey>('featured');
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!view) return;
    setSort('featured');
    const t = window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    return () => window.clearTimeout(t);
  }, [view]);

  const list = useMemo(() => (view ? sortProducts(filterView(view), sort) : []), [view, sort]);

  if (!view) return null;

  const stats = view.kind === 'brand' ? brandStats(view.name) : null;
  const eyebrow = view.kind === 'brand' ? 'Brand' : view.kind === 'query' ? 'Search' : 'Browse';

  return (
    <section ref={ref} aria-live="polite" className="scroll-mt-24 animate-fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm text-muted">
            {eyebrow} · {list.length} {list.length === 1 ? 'item' : 'items'}
          </p>
          <h2 className="mt-1 text-[28px] font-semibold leading-[1.1] tracking-[-0.045em] md:text-[34px]">
            {viewTitle(view)}
          </h2>
          {stats && (
            <div className="mt-2 flex items-center gap-2 text-body text-muted">
              <Stars rating={stats.rating} size={12} />
              <span className="text-ink">{stats.rating.toFixed(1)}</span>
              <span>· {fmtCount(stats.reviews)} reviews</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view.kind === 'brand' && (
            <button
              type="button"
              aria-pressed={followed.includes(view.name)}
              onClick={() => toggleFollow(view.name)}
              className={cn(
                'rounded-full px-4 py-2 text-body transition active:scale-[0.98]',
                followed.includes(view.name) ? 'bg-canvas text-ink' : 'bg-ink text-white hover:bg-umber',
              )}
            >
              {followed.includes(view.name) ? 'Following' : 'Follow'}
            </button>
          )}
          <PillButton onClick={() => setView(null)}>
            <X size={14} strokeWidth={2.25} />
            Clear
          </PillButton>
        </div>
      </div>

      {list.length > 0 ? (
        <>
          <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
            {SORTS.map((s) => (
              <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
          <ProductGrid products={list} />
        </>
      ) : (
        <div className="rounded-card border border-hairline">
          <EmptyState
            icon={<Search size={22} />}
            title="Nothing matched"
            body="Try a broader search, or start with something popular."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_SEARCHES.slice(0, 5).map((s) => (
                  <PillButton key={s} onClick={() => setView({ kind: 'query', q: s })}>
                    {s}
                  </PillButton>
                ))}
              </div>
            }
          />
        </div>
      )}
      <div className="mt-16 h-px bg-hairline lg:mt-20" />
    </section>
  );
}
