import { useEffect, useState } from "react";
import { ChevronDown, Menu, X, ArrowUpRight, CreditCard, Store, Link2, RefreshCw, Terminal, FileText } from "lucide-react";

const PRODUCT_MENU = [
  { icon: CreditCard, title: "Checkout", desc: "Convert more, everywhere" },
  { icon: Store, title: "In-person", desc: "Terminals & tap-to-pay" },
  { icon: Link2, title: "Payment links", desc: "Get paid by link or QR" },
  { icon: RefreshCw, title: "Subscriptions", desc: "Recurring, handled" },
  { icon: Terminal, title: "Terminal API", desc: "Unify every till" },
  { icon: FileText, title: "Invoicing", desc: "Branded bills, paid fast" },
];

export default function Navbar({ onStart }: { onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-paper transition-all duration-300 ${
        scrolled ? "shadow-[0_1px_0_0_#f5f2f0]" : ""
      }`}
    >
      <nav className="mx-auto flex h-[54px] max-w-[1320px] items-center justify-between px-5 md:px-8">
        {/* Wordmark */}
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-ledger-brown">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M7 23V9l5 9.5L17 9l5 9.5L27 9v14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-[21px] font-medium tracking-[-0.5px]">Ziggner</span>
          <span className="media-label mt-0.5 hidden rounded-full bg-oat-surface px-2 py-1 text-quiet-graphite sm:inline-block">
            EU · UK · US
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-7 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu("products")}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button className="nav-link flex items-center gap-1 text-ink transition-colors hover:text-quiet-graphite">
              Products <ChevronDown size={14} strokeWidth={2.2} className={`transition-transform ${openMenu === "products" ? "rotate-180" : ""}`} />
            </button>
            {openMenu === "products" && (
              <div className="absolute left-1/2 top-full w-[560px] -translate-x-1/2 pt-4">
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-oat-line bg-paper p-3 shadow-[rgb(245,242,240)_0px_0px_0px_1px]">
                  {PRODUCT_MENU.map((p) => (
                    <a
                      key={p.title}
                      href="#products"
                      className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-oat-surface"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-oat-surface transition-colors group-hover:bg-paper">
                        <p.icon size={16} strokeWidth={1.8} />
                      </span>
                      <span>
                        <span className="block text-[14px] font-medium tracking-[-0.2px]">{p.title}</span>
                        <span className="block text-[13px] text-quiet-graphite">{p.desc}</span>
                      </span>
                    </a>
                  ))}
                  <div className="col-span-2 mt-1 flex items-center justify-between rounded-xl bg-espresso-panel px-4 py-3">
                    <span className="media-label text-paper/70">NEW — TAP TO PAY ON IPHONE</span>
                    <span className="flex items-center gap-1 text-[13px] font-medium text-paper">
                      See what's new <ArrowUpRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {["Pricing", "Customers"].map((l) => (
            <a key={l} href={l === "Pricing" ? "#pricing" : "#customers"} className="nav-link text-ink transition-colors hover:text-quiet-graphite">
              {l}
            </a>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setOpenMenu("devs")}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button className="nav-link flex items-center gap-1 text-ink transition-colors hover:text-quiet-graphite">
              Developers <ChevronDown size={14} strokeWidth={2.2} className={`transition-transform ${openMenu === "devs" ? "rotate-180" : ""}`} />
            </button>
            {openMenu === "devs" && (
              <div className="absolute left-1/2 top-full w-[320px] -translate-x-1/2 pt-4">
                <div className="rounded-2xl border border-oat-line bg-paper p-2 shadow-[rgb(245,242,240)_0px_0px_0px_1px]">
                  {[
                    ["API reference", "REST, webhooks & SDKs"],
                    ["Guides", "Go live in an afternoon"],
                    ["Changelog", "Shipped weekly"],
                    ["Status", "99.99% uptime · 90d"],
                  ].map(([t, d]) => (
                    <a key={t} href="#developers" className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-oat-surface">
                      <span>
                        <span className="block text-[14px] font-medium tracking-[-0.2px]">{t}</span>
                        <span className="block text-[12px] text-quiet-graphite">{d}</span>
                      </span>
                      <ArrowUpRight size={15} className="text-soft-gray" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <a href="#stories" className="nav-link text-ink transition-colors hover:text-quiet-graphite">Why Ziggner</a>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3">
          <a href="#pricing" className="nav-link hidden px-2 text-ink hover:text-quiet-graphite sm:block">
            Log in
          </a>
          <button
            onClick={onStart}
            className="rounded-full bg-ledger-brown px-[18px] py-[9px] text-[14px] font-medium tracking-[-0.32px] text-paper shadow-[rgba(255,255,255,0.08)_0px_1px_0px_0px_inset] transition-colors hover:bg-ledger-brown-hover"
          >
            Sign up
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-oat-surface lg:hidden"
            onClick={() => setMobile(!mobile)}
            aria-label="Menu"
          >
            {mobile ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile */}
      {mobile && (
        <div className="border-t border-oat-line bg-paper px-5 pb-6 pt-3 lg:hidden">
          {["Products", "Pricing", "Customers", "Developers", "Why Ziggner"].map((l) => (
            <a
              key={l}
              href={l === "Pricing" ? "#pricing" : l === "Customers" ? "#customers" : "#products"}
              onClick={() => setMobile(false)}
              className="flex items-center justify-between border-b border-oat-line py-3.5 text-[16px] font-medium tracking-[-0.3px]"
            >
              {l} <ArrowUpRight size={16} className="text-soft-gray" />
            </a>
          ))}
          <button onClick={() => { setMobile(false); onStart(); }} className="btn-ledger mt-4 w-full">
            Start selling
          </button>
        </div>
      )}
    </header>
  );
}
