import { useRef, type CSSProperties, type MouseEvent } from 'react';
import { CATEGORIES, PRODUCTS_BY_ID, px, type CategoryId } from '../data/catalog';
import { HeroCard } from './cards';
import { SearchBar } from './SearchBar';
import { Img, Wordmark } from './ui';

/**
 * Constellation slots. x / y are percentages of the stage, w is the card
 * width (cqw of the hero on desktop, % of the stage on smaller screens),
 * r is rotation, depth drives parallax + float speed.
 */
type Slot = { id: string; x: number; y: number; w: number; r: number; depth: number };

const DESKTOP: Slot[] = [
  { id: 'w5', x: 1, y: 4, w: 14, r: -6, depth: 1.5 },
  { id: 'b2', x: 17, y: 34, w: 12, r: 4, depth: 0.9 },
  { id: 'h4', x: 3, y: 64, w: 12, r: -3, depth: 1.2 },
  { id: 'a1', x: 25, y: 2, w: 11, r: 3, depth: 0.7 },
  { id: 'w7', x: 44.5, y: 6, w: 11, r: -2, depth: 0.5 },
  { id: 'm9', x: 64, y: 1, w: 11, r: -4, depth: 0.8 },
  { id: 'a3', x: 84, y: 5, w: 14, r: 6, depth: 1.4 },
  { id: 'k2', x: 71, y: 36, w: 12, r: -3, depth: 1.0 },
  { id: 'h2', x: 85, y: 63, w: 12, r: 4, depth: 1.3 },
];

const TABLET: Slot[] = [
  { id: 'w5', x: 0, y: 26, w: 19, r: -8, depth: 1.3 },
  { id: 'b2', x: 19.5, y: 4, w: 19, r: -3, depth: 0.8 },
  { id: 'm9', x: 40.5, y: 14, w: 19, r: 2, depth: 0.6 },
  { id: 'h4', x: 61, y: 2, w: 19, r: 5, depth: 0.9 },
  { id: 'a3', x: 81, y: 24, w: 19, r: 9, depth: 1.2 },
];

const MOBILE: Slot[] = [
  { id: 'w5', x: 1, y: 16, w: 33, r: -7, depth: 1 },
  { id: 'm9', x: 33.5, y: 0, w: 33, r: 2, depth: 0.7 },
  { id: 'h4', x: 66, y: 18, w: 33, r: 7, depth: 1 },
];

function Floating({ slot, index, unit, small }: { slot: Slot; index: number; unit: 'cqw' | 'pct'; small?: boolean }) {
  const product = PRODUCTS_BY_ID[slot.id];
  const width = unit === 'cqw' ? `max(112px, ${slot.w}cqw)` : `${slot.w}%`;

  return (
    <div
      className="absolute z-10 animate-pop-in hover:z-[15]"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, width, animationDelay: `${140 + index * 75}ms` }}
    >
      {/* parallax layer — reads --mx / --my from the hero */}
      <div
        className="transition-transform duration-700 ease-out will-change-transform"
        style={{
          transform: `translate3d(calc(var(--mx, 0) * ${slot.depth * 14}px), calc(var(--my, 0) * ${slot.depth * 10}px), 0)`,
        }}
      >
        {/* rotation + gentle float */}
        <div
          className="animate-float"
          style={
            {
              '--r': `${slot.r}deg`,
              transform: `rotate(${slot.r}deg)`,
              animationDelay: `${-(index * 1.3)}s`,
              animationDuration: `${6 + slot.depth * 2.2}s`,
            } as CSSProperties
          }
        >
          <HeroCard product={product} small={small} />
        </div>
      </div>
    </div>
  );
}

export function CategoryPills({ onSelect }: { onSelect: (id: CategoryId) => void }) {
  return (
    <nav
      aria-label="Shop by category"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
    >
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className="flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-white py-1.5 pl-1.5 pr-4 shadow-pill transition duration-300 hover:-translate-y-0.5 hover:shadow-float active:translate-y-0"
        >
          <Img src={px(c.icon, 72)} alt="" loading="eager" className="h-7 w-7 rounded-full bg-canvas object-cover" />
          <span className="text-body-lg">{c.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Hero({ onCategory }: { onCategory: (id: CategoryId) => void }) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (((clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      el.style.setProperty('--my', (((clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty('--mx', '0');
    ref.current?.style.setProperty('--my', '0');
  };

  return (
    <section ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="@container relative z-20 pt-6 lg:pt-8">
      {/* Desktop constellation */}
      <div className="relative hidden h-[660px] lg:block">
        {DESKTOP.map((s, i) => (
          <Floating key={s.id} slot={s} index={i} unit="cqw" />
        ))}
      </div>

      {/* Tablet constellation */}
      <div className="relative mx-auto hidden aspect-[12/5] max-w-[720px] sm:block lg:hidden">
        {TABLET.map((s, i) => (
          <Floating key={s.id} slot={s} index={i} unit="pct" />
        ))}
      </div>

      {/* Mobile constellation */}
      <div className="relative mx-auto aspect-[16/9] sm:hidden">
        {MOBILE.map((s, i) => (
          <Floating key={s.id} slot={s} index={i} unit="pct" small />
        ))}
      </div>

      {/* Wordmark + search */}
      <div className="relative z-20 mt-8 flex flex-col items-center text-center lg:absolute lg:inset-x-0 lg:top-[282px] lg:mt-0">
        <h1 aria-label="Shop">
          <Wordmark className="text-[88px] sm:text-[120px] lg:text-[length:clamp(96px,13cqw,168px)]" />
        </h1>
        <p className="mt-4 max-w-[420px] text-body-lg text-muted">Discover brands you'll love — all in one place.</p>
        <div id="hero-search" className="mt-7 w-full max-w-[560px] lg:w-[min(560px,56cqw)]">
          <SearchBar size="lg" inputId="hero-search-input" />
        </div>
      </div>

      {/* Category pills */}
      <div className="relative mt-10 lg:mt-0">
        <CategoryPills onSelect={onCategory} />
      </div>
    </section>
  );
}
