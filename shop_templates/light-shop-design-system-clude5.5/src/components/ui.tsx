import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop } from '../context/shop';

/* ------------------------------------------------------------------ */
/* Img — lazy image that fades in once decoded                         */
/* ------------------------------------------------------------------ */

export function Img({ className, onLoad, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    setLoaded(Boolean(el && el.complete && el.naturalWidth > 0));
  }, [rest.src]);

  return (
    <img
      ref={ref}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      {...rest}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn(
        'transition-[opacity,scale] duration-500 ease-out',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stars — 5-star rating row with fractional fill                      */
/* ------------------------------------------------------------------ */

const STAR =
  'M12 2 L14.65 8.36 L21.51 8.91 L16.28 13.39 L17.88 20.09 L12 16.5 L6.12 20.09 L7.72 13.39 L2.49 8.91 L9.35 8.36 Z';

export function Stars({
  rating,
  size = 10,
  tone = 'ink',
  className,
}: {
  rating: number;
  size?: number;
  tone?: 'ink' | 'white';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  const row = (color: string) => (
    <span className={cn('flex w-max gap-px', color)}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
          <path d={STAR} fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );

  return (
    <span
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      className={cn('relative inline-flex shrink-0', className)}
    >
      {row(tone === 'white' ? 'text-white/35' : 'text-stone')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row(tone === 'white' ? 'text-white' : 'text-ink')}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Wordmark                                                            */
/* ------------------------------------------------------------------ */

export function Wordmark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      className={cn('inline-block select-none font-semibold leading-none tracking-[-0.065em] text-shop', className)}
      style={style}
    >
      shop
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function HeartButton({ id, className, size = 'md' }: { id: string; className?: string; size?: 'md' | 'lg' }) {
  const { isFavorite, toggleFavorite } = useShop();
  const on = isFavorite(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Remove from saved' : 'Save for later'}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(id);
      }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-white text-ink shadow-pill transition hover:shadow-float active:scale-90',
        size === 'lg' ? 'h-12 w-12 border border-hairline' : 'h-8 w-8',
        className,
      )}
    >
      <Heart
        size={size === 'lg' ? 20 : 16}
        strokeWidth={2}
        className={cn('transition-[scale,fill] duration-300', on ? 'scale-110 fill-ink' : 'fill-transparent')}
      />
    </button>
  );
}

export function PillButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-white px-4 py-2 text-body text-ink shadow-pill transition hover:bg-canvas active:scale-[0.98]',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-4 py-2 text-body transition active:scale-[0.98]',
        active ? 'bg-ink text-white' : 'border border-hairline bg-white text-ink shadow-pill hover:bg-canvas',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Section header — 20px semibold, -1px tracking, chevron affordance   */
/* ------------------------------------------------------------------ */

export function SectionHeader({ title, onClick, meta }: { title: string; onClick?: () => void; meta?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-title font-semibold text-ink">
        {onClick ? (
          <button type="button" onClick={onClick} className="group inline-flex items-center gap-1">
            {title}
            <ChevronRight
              size={16}
              strokeWidth={2.75}
              className="mt-0.5 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
        ) : (
          title
        )}
      </h2>
      {meta}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail — horizontal product rail with floating carousel arrows        */
/* ------------------------------------------------------------------ */

export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        className="no-scrollbar -mx-4 -my-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-10 lg:scroll-px-10 lg:px-10"
      >
        {children}
      </div>
      <RailArrow dir="left" concealed={edges.start} onClick={() => go(-1)} />
      <RailArrow dir="right" concealed={edges.end} onClick={() => go(1)} />
    </div>
  );
}

function RailArrow({ dir, concealed, onClick }: { dir: 'left' | 'right'; concealed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={concealed ? -1 : 0}
      aria-hidden={concealed}
      aria-label={dir === 'left' ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-float transition duration-300 hover:scale-110 sm:grid',
        dir === 'left' ? '-left-3' : '-right-3',
        concealed && 'pointer-events-none scale-75 opacity-0',
      )}
    >
      {dir === 'left' ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-canvas text-ink">{icon}</span>
      <p className="mt-4 text-body-lg font-medium">{title}</p>
      <p className="mt-1 max-w-[260px] text-body text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
