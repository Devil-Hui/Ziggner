import { useEffect, useRef, useState } from "react";
import {
  CreditCard, Landmark, Wallet, CalendarClock, ArrowUpRight, ArrowRight, Check,
  QrCode, Repeat, ReceiptText, Globe2, Banknote, Sparkles, ShoppingBag, Zap,
} from "lucide-react";
import { IMAGES } from "../data";

const METHODS = [
  { icon: CreditCard, name: "Cards", fee: "1.5% + €0.25", desc: "Visa, Mastercard, Amex with 3-D Secure and network tokens.", settle: "Next day" },
  { icon: Landmark, name: "iDEAL", fee: "€0.29 flat", desc: "The Dutch favourite. Bank-direct, instant confirmation.", settle: "Same day" },
  { icon: Wallet, name: "Apple Pay", fee: "1.5% + €0.25", desc: "Face-ID checkout in one sheet. Built for mobile.", settle: "Next day" },
  { icon: CalendarClock, name: "Klarna", fee: "2.99% + €0.25", desc: "Pay now, later, or sliced. We carry the risk.", settle: "Next day" },
  { icon: Banknote, name: "SEPA DD", fee: "€0.35 flat", desc: "Recurring Euro debits with smart retry logic.", settle: "2–3 days" },
  { icon: Globe2, name: "Bancontact", fee: "1.5% + €0.25", desc: "Belgium's everyday card, online and on terminal.", settle: "Next day" },
  { icon: QrCode, name: "Pay by link", fee: "1.5% + €0.25", desc: "QR codes and links that settle like checkout.", settle: "Next day" },
  { icon: Repeat, name: "Subscriptions", fee: "Included", desc: "Plans, trials, proration — dunning included.", settle: "Auto" },
  { icon: ReceiptText, name: "Invoicing", fee: "Included", desc: "Branded invoices with a pay button inside.", settle: "On pay" },
  { icon: ShoppingBag, name: "Terminals", fee: "1.5% + €0.05", desc: "Countertop and portable. Tap, chip, and PIN.", settle: "Next day" },
];

function useRevealRoot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.08 }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Capabilities({ onStart }: { onStart: () => void }) {
  const [active, setActive] = useState(0);
  const [enabled, setEnabled] = useState<Set<number>>(new Set([0, 1, 2, 5]));
  const [checkoutTab, setCheckoutTab] = useState(0);
  const [autoOn, setAutoOn] = useState([true, true, false]);
  const root = useRevealRoot();
  const m = METHODS[active];

  const toggle = (i: number) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const cartTotals = [184.0, 96.0, 210.4];
  const fees = [2.99, 1.69, 6.53];

  return (
    <div ref={root}>
      <section id="products" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 md:px-8">
        <div className="reveal flex flex-wrap items-end justify-between gap-4 pb-7">
          <div>
            <p className="eyebrow text-ink">Payment methods</p>
            <h2 className="font-display mt-3 max-w-[640px] text-[clamp(32px,4.4vw,56px)] leading-[1.05] tracking-[-1.4px]">
              Every way your customers want to pay.
            </h2>
          </div>
          <p className="max-w-[340px] text-[15px] leading-[1.4] tracking-[-0.3px] text-quiet-graphite">
            Switch methods on with one toggle. Pricing stays flat and honest — no tiers, no surprises, no phone calls.
          </p>
        </div>

        {/* Capability grid */}
        <div className="reveal overflow-hidden rounded-2xl border border-oat-line">
          <div className="grid grid-cols-2 bg-oat-line sm:grid-cols-3 lg:grid-cols-5" style={{ gap: 1 }}>
            {METHODS.map((it, i) => (
              <button
                key={it.name}
                onClick={() => setActive(i)}
                className={`group bg-paper p-[22px] text-left transition-colors ${active === i ? "bg-oat-surface" : "hover:bg-oat-surface/60"}`}
              >
                <span className="flex items-center justify-between">
                  <it.icon size={20} strokeWidth={1.6} className="text-ink" />
                  <span
                    role="switch"
                    aria-checked={enabled.has(i)}
                    onClick={(e) => { e.stopPropagation(); toggle(i); }}
                    className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors ${enabled.has(i) ? "bg-active-green-surface" : "bg-[#e4ddd5]"}`}
                  >
                    <span className={`absolute top-[3px] h-[16px] w-[16px] rounded-full bg-paper transition-all ${enabled.has(i) ? "left-[19px]" : "left-[3px]"}`} />
                  </span>
                </span>
                <span className="mt-4 block text-[15px] font-medium tracking-[-0.3px]">{it.name}</span>
                <span className="mt-0.5 block text-[12px] tracking-[-0.1px] text-quiet-graphite">{it.fee}</span>
              </button>
            ))}
          </div>
          {/* detail bar */}
          <div className="flex flex-col gap-3 border-t border-oat-line bg-paper px-6 py-4 sm:flex-row sm:items-center">
            <span className="media-label text-quiet-graphite">SELECTED — {m.name.toUpperCase()}</span>
            <p className="flex-1 text-[14px] tracking-[-0.2px] text-near-black">{m.desc}</p>
            <span className="media-label text-quiet-graphite">SETTLES {m.settle.toUpperCase()}</span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-active-green">
              <span className="h-2 w-2 rounded-full bg-active-green-surface" /> {enabled.has(active) ? "Live on your checkout" : "Off — tap toggle to enable"}
            </span>
          </div>
        </div>

        {/* Paired cream cards */}
        <div className="grid grid-cols-1 gap-3 pt-3 lg:grid-cols-2">
          {/* Card 1 — checkout */}
          <div className="reveal overflow-hidden rounded-2xl bg-oat-surface">
            <div className="px-8 pt-10 md:px-10">
              <p className="eyebrow text-ink">Checkout</p>
              <h3 className="font-display mt-3 text-[clamp(28px,3.2vw,36px)] leading-[1.08] tracking-[-0.9px]">
                A checkout that converts like a local.
              </h3>
              <a href="#demo" className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium tracking-[-0.3px] text-copper-link hover:text-copper-hover">
                Explore checkout <ArrowUpRight size={16} />
              </a>
              <div className="mt-6 flex gap-2">
                {["Amsterdam · iDEAL", "Berlin · Klarna", "Paris · Card"].map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setCheckoutTab(i)}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium tracking-[-0.2px] transition-colors ${checkoutTab === i ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-white"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 pt-6 md:p-5">
              <div className="overflow-hidden rounded-2xl bg-paper p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <span className="media-label text-quiet-graphite">ATELIER NORD — ORDER #4821</span>
                  <span className="media-label text-soft-gray">SECURE · 3DS</span>
                </div>
                <div className="mt-4 flex items-center gap-4 rounded-xl bg-oat-surface p-3">
                  <img src={IMAGES.pack2} alt="Order" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="text-[14px] font-medium tracking-[-0.25px]">Linen overshirt · Sand</p>
                    <p className="text-[12px] text-quiet-graphite">Qty 1 · Ships tomorrow</p>
                  </div>
                  <p className="font-display text-[19px]">€{cartTotals[checkoutTab].toFixed(2)}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[Landmark, CreditCard, Wallet].map((Icon, i) => (
                    <div key={i} className={`flex items-center justify-center gap-2 rounded-xl border py-3 ${i === checkoutTab ? "border-ink bg-ink text-paper" : "border-oat-line text-ink"}`}>
                      <Icon size={17} strokeWidth={1.8} />
                      <span className="text-[12px] font-medium">{["iDEAL", "Card", "Wallet"][i]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[13px] text-quiet-graphite">
                  <span>Fee · you keep €{(cartTotals[checkoutTab] - fees[checkoutTab]).toFixed(2)}</span>
                  <span className="flex items-center gap-1 font-medium text-active-green"><Zap size={13} /> 1.8s median pay time</span>
                </div>
                <button onClick={onStart} className="btn-ledger mt-4 flex w-full items-center justify-center gap-2 !py-3.5 text-[15px]">
                  Pay €{cartTotals[checkoutTab].toFixed(2)} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2 — back office */}
          <div className="reveal relative overflow-hidden rounded-2xl bg-oat-surface" style={{ transitionDelay: "100ms" }}>
            <div className="pointer-events-none absolute -right-24 -top-24 h-[280px] w-[280px] rounded-full bg-terracotta-disc/90" />
            <div className="relative px-8 pt-10 md:px-10">
              <p className="eyebrow text-ink">Back office</p>
              <h3 className="font-display mt-3 max-w-[380px] text-[clamp(28px,3.2vw,36px)] leading-[1.08] tracking-[-0.9px]">
                Grow without the grunt work.
              </h3>
              <a href="#demo" className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium tracking-[-0.3px] text-copper-link hover:text-copper-hover">
                Tour the dashboard <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="relative p-4 pt-6 md:p-5">
              <div className="rounded-2xl bg-paper p-5 md:p-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-copper-link" />
                  <span className="media-label text-quiet-graphite">AUTOPILOT — THIS WEEK</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    ["Smart retries recovered", "€1,284.00", "42 failed Klarna pays retried"],
                    ["Payouts reconciled", "€18,402.11", "312 orders matched to ledger"],
                    ["Fraud held for review", "3 orders", "Manual approve in dashboard"],
                  ].map(([t, v, d], i) => (
                    <div key={t as string} className="flex items-center gap-3 rounded-xl border border-oat-line p-3.5">
                      <button
                        onClick={() => setAutoOn((p) => p.map((x, j) => (j === i ? !x : x)))}
                        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${autoOn[i] ? "bg-active-green-surface" : "bg-[#e4ddd5]"}`}
                        aria-label={`Toggle ${t}`}
                      >
                        <span className={`absolute top-[3px] h-[16px] w-[16px] rounded-full bg-paper transition-all ${autoOn[i] ? "left-[19px]" : "left-[3px]"}`} />
                      </button>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium tracking-[-0.25px]">{t}</p>
                        <p className="text-[12px] text-quiet-graphite">{d}</p>
                      </div>
                      <p className="text-[14px] font-semibold tracking-[-0.2px]">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-espresso-panel p-4">
                  <img src={IMAGES.paydesk} alt="Counter" className="h-12 w-16 rounded-lg object-cover" />
                  <p className="flex-1 text-[13px] leading-snug text-paper/80">
                    <span className="font-medium text-paper">Tuesday payout sent.</span> €18,402.11 lands tomorrow, 09:00.
                  </p>
                  <Check size={18} className="shrink-0 text-paper" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
