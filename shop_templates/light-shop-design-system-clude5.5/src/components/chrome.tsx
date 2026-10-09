import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  Globe,
  Heart,
  House,
  Package,
  Search,
  ShoppingBag,
  Smartphone,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useShop } from '../context/shop';
import { CATEGORIES, px, type CategoryId } from '../data/catalog';
import { SearchBar } from './SearchBar';
import { Wordmark } from './ui';

/* ------------------------------------------------------------------ */
/* App download banner                                                 */
/* ------------------------------------------------------------------ */

export function AppBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative flex h-12 items-center justify-center bg-black px-12 font-system text-white">
      <a href="#get-app" className="group flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-shop">
          <ShoppingBag size={13} strokeWidth={2.25} />
        </span>
        <span className="flex flex-col leading-[1.2]">
          <span className="text-[14px] font-medium tracking-[-0.023em]">Download Ziggner app</span>
          <span className="text-[10px] tracking-[-0.01em] text-white/60">Available on iOS & Android</span>
        </span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </a>
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={onClose}
        className="absolute right-3 grid h-8 w-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

type NavItem = { key: string; label: string; Icon: LucideIcon; badge?: number; active: boolean; onClick: () => void };

function useNav(): NavItem[] {
  const { favorites, bagCount, drawer, openDrawer, closeDrawer } = useShop();

  const goHome = () => {
    closeDrawer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goSearch = () => {
    closeDrawer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => document.getElementById('hero-search-input')?.focus({ preventScroll: true }), 380);
  };

  return [
    { key: 'home', label: 'Home', Icon: House, active: drawer === null, onClick: goHome },
    { key: 'search', label: 'Search', Icon: Search, active: false, onClick: goSearch },
    {
      key: 'saved',
      label: 'Saved',
      Icon: Heart,
      badge: favorites.length,
      active: drawer === 'saved',
      onClick: () => openDrawer('saved'),
    },
    { key: 'orders', label: 'Orders', Icon: Package, active: drawer === 'orders', onClick: () => openDrawer('orders') },
    {
      key: 'bag',
      label: 'Bag',
      Icon: ShoppingBag,
      badge: bagCount,
      active: drawer === 'bag',
      onClick: () => openDrawer('bag'),
    },
  ];
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-medium leading-none tracking-normal text-white ring-2 ring-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function Sidebar() {
  const items = useNav();
  const { notify, setView, closeDrawer } = useShop();

  return (
    <aside className="sticky top-0 z-30 hidden h-dvh w-16 shrink-0 flex-col items-center self-start bg-white py-5 md:flex">
      <button
        type="button"
        aria-label="Ziggner home"
        onClick={() => {
          closeDrawer();
          setView(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="mb-7 rounded-full px-1"
      >
        <Wordmark className="text-[21px]" />
      </button>

      <nav aria-label="Primary" className="flex flex-col items-center gap-1.5">
        {items.map(({ key, label, Icon, badge, active, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative grid h-12 w-12 place-items-center rounded-[20px] text-ink transition',
              active ? 'bg-canvas' : 'hover:bg-canvas/70',
            )}
          >
            <Icon size={24} strokeWidth={active ? 2 : 1.6} />
            {!!badge && <Badge count={badge} />}
            <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-body-sm text-white opacity-0 shadow-float transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              {label}
            </span>
          </button>
        ))}
      </nav>

      <div className="sticky bottom-5 mt-auto pt-6">
        <button
          type="button"
          aria-label="Your profile"
          onClick={() => notify('Signed in as Maya Reyes')}
          className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-body-sm font-semibold ring-1 ring-hairline transition hover:ring-ink/30"
        >
          M
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const items = useNav();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-full bg-white/95 px-2 py-1.5 shadow-float backdrop-blur-xl md:hidden"
    >
      {items.map(({ key, label, Icon, badge, active, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn('relative grid h-11 w-11 place-items-center rounded-full transition', active && 'bg-canvas')}
        >
          <Icon size={22} strokeWidth={active ? 2 : 1.6} />
          {!!badge && <Badge count={badge} />}
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Floating search — appears once the hero search scrolls away         */
/* ------------------------------------------------------------------ */

export function FloatingSearch() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById('hero-search');
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      inert={!show}
      className={cn(
        'fixed left-1/2 top-3 z-50 w-[min(560px,calc(100%-24px))] -translate-x-1/2 transition duration-300 ease-out md:left-[calc(50%+28px)] md:w-[min(560px,calc(100%-120px))]',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0',
      )}
    >
      <SearchBar
        size="sm"
        prefix={
          <>
            <Wordmark className="mr-3 text-[21px]" />
            <span aria-hidden="true" className="mr-3 h-5 w-px shrink-0 bg-hairline" />
          </>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export function ToastHost() {
  const { toast, dismissToast } = useShop();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[80] flex justify-center px-4 md:bottom-6">
      <div
        key={toast.id}
        role="status"
        className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink py-1.5 pl-1.5 pr-2 text-body text-white shadow-float animate-fade-up"
      >
        {toast.image ? (
          <img src={px(toast.image, 64)} alt="" className="h-8 w-8 shrink-0 rounded-full bg-white/10 object-cover" />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
            <Check size={16} />
          </span>
        )}
        <span className="truncate">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              dismissToast();
            }}
            className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-body-sm font-medium transition hover:bg-white/25"
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismissToast}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/60 transition hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cookie consent                                                      */
/* ------------------------------------------------------------------ */

function CookieButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-hairline bg-white px-4 py-1.5 text-body-sm font-semibold text-ink shadow-pill transition hover:bg-canvas active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-body font-medium">{label}</p>
        <p className="text-body-sm text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-ink' : 'bg-stone',
          disabled && 'opacity-40',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-pill transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
    </div>
  );
}

export function CookieBanner({ onClose }: { onClose: () => void }) {
  const [manage, setManage] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: true, marketing: false });

  const save = (value: { analytics: boolean; marketing: boolean }) => {
    try {
      window.localStorage.setItem('shop:cookies', JSON.stringify(value));
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-2 bottom-[76px] z-40 rounded-card bg-white p-5 shadow-float animate-fade-up md:bottom-4 md:left-[80px] md:right-auto md:w-[380px]"
    >
      <p className="font-system text-[14px] leading-[1.6] tracking-[-0.023em] text-ink">
        We use cookies to remember your bag, personalize recommendations, and understand how Shop is used. Learn more in
        our{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>

      {manage && (
        <div className="mt-4 divide-y divide-hairline rounded-img border border-hairline px-4">
          <ToggleRow label="Essential" hint="Bag, sign-in and security" checked disabled />
          <ToggleRow
            label="Analytics"
            hint="Help us improve Shop"
            checked={prefs.analytics}
            onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
          />
          <ToggleRow
            label="Marketing"
            hint="Personalized offers"
            checked={prefs.marketing}
            onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <CookieButton onClick={() => save({ analytics: true, marketing: true })}>Accept</CookieButton>
        <CookieButton onClick={() => save({ analytics: false, marketing: false })}>Decline</CookieButton>
        <CookieButton onClick={() => (manage ? save(prefs) : setManage(true))}>
          {manage ? 'Save choices' : 'Manage'}
        </CookieButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

const FOOTER_LINKS = [
  { title: 'Company', links: ['About Shop', 'Careers', 'Press', 'Brand assets'] },
  { title: 'Support', links: ['Help center', 'Track an order', 'Returns', 'Contact us'] },
  { title: 'For merchants', links: ['Sell on Shop', 'Shop Campaigns', 'Partners', 'Developers'] },
];

function StoreBadge({ top, bottom }: { top: string; bottom: string }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-3 pr-5 text-black transition hover:bg-white/90"
    >
      <Smartphone size={18} strokeWidth={1.75} />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-black/60">{top}</span>
        <span className="text-body font-medium">{bottom}</span>
      </span>
    </a>
  );
}

export function Footer({ onCategory, onCookiePrefs }: { onCategory: (id: CategoryId) => void; onCookiePrefs: () => void }) {
  const muted = (e: MouseEvent) => e.preventDefault();
  return (
    <footer id="get-app" className="mt-2 scroll-mt-4 rounded-card bg-black px-6 py-12 text-white sm:px-10 md:py-16">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Wordmark className="text-[56px] text-white" />
            <p className="mt-4 max-w-[300px] text-body text-white/60">
              Shop your favorite brands, track every order, and check out in a tap — all in the Shop app.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StoreBadge top="Download on the" bottom="App Store" />
              <StoreBadge top="Get it on" bottom="Google Play" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <p className="text-body font-medium">Shop</p>
              <ul className="mt-4 space-y-2.5">
                {CATEGORIES.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onCategory(c.id)}
                      className="text-left text-body text-white/60 transition hover:text-white"
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {FOOTER_LINKS.map((col) => (
              <div key={col.title}>
                <p className="text-body font-medium">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" onClick={muted} className="text-body text-white/60 transition hover:text-white">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-body-sm text-white/50">© 2026 Shop · A demo storefront. Product photography via Pexels.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-body-sm text-white/60">
            <a href="#" onClick={muted} className="transition hover:text-white">
              Terms of service
            </a>
            <a href="#" onClick={muted} className="transition hover:text-white">
              Privacy policy
            </a>
            <button type="button" onClick={onCookiePrefs} className="transition hover:text-white">
              Cookie preferences
            </button>
            <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5">
              <Globe size={14} /> United States · USD
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
