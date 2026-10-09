import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Nfc, Smartphone, Globe, Store, Link2 } from "lucide-react";
import { IMAGES } from "../data";

const SLIDES = [
  {
    id: "counter",
    tab: "In-store",
    icon: Store,
    image: IMAGES.heroTerminal,
    label: "LIVE — COUNTER / TERMINAL 04",
    caption: "Café Maan · Amsterdam · €24.50 paid in 1.8s",
    toasts: [
      { amount: "€24.50", method: "Apple Pay · ···· 4812" },
      { amount: "€9.80", method: "Visa · Tap to pay" },
      { amount: "€41.20", method: "Mastercard · ···· 9021" },
    ],
  },
  {
    id: "online",
    tab: "Online",
    icon: Globe,
    image: IMAGES.heroRetail,
    label: "LIVE — CHECKOUT / WEB",
    caption: "Atelier Nord · Copenhagen · 1-click repeat buy",
    toasts: [
      { amount: "€184.00", method: "iDEAL · ING" },
      { amount: "€96.00", method: "Klarna · Pay later" },
      { amount: "€210.40", method: "Visa · ···· 3310" },
    ],
  },
  {
    id: "app",
    tab: "In-app",
    icon: Smartphone,
    image: IMAGES.heroPhone,
    label: "LIVE — MOBILE SDK / IOS",
    caption: "Bloom & Stem · Brussels · Apple Pay sheet",
    toasts: [
      { amount: "€68.20", method: "Apple Pay · Face ID" },
      { amount: "€32.00", method: "Google Pay" },
      { amount: "€54.90", method: "Bancontact · App" },
    ],
  },
  {
    id: "links",
    tab: "Links",
    icon: Link2,
    image: IMAGES.heroCounter,
    label: "LIVE — PAYMENT LINK / QR",
    caption: "Harbour Books · London · Link paid in 40s",
    toasts: [
      { amount: "£96.00", method: "Payment link · Visa" },
      { amount: "£18.50", method: "QR · Mastercard" },
      { amount: "£42.00", method: "Link · PayPal" },
    ],
  },
];

const LOGOS = ["HARBOUR & CO.", "LOOM", "Atelier Nord", "FREDDY'S", "Café Maan", "BLOOM", "De Kas", "NORDWIND"];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.1 }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Hero({ onStart }: { onStart: () => void }) {
  const [slide, setSlide] = useState(0);
  const [toastIdx, setToastIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrapRef = useReveal();

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setToastIdx((i) => i + 1), 3200);
    return () => clearInterval(t);
  }, [paused, slide]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!paused) setSlide((s) => (s + 1) % SLIDES.length);
    }, 9000);
    return () => clearInterval(t);
  }, [paused]);

  const current = SLIDES[slide];
  const toast = current.toasts[toastIdx % current.toasts.length];

  return (
    <div ref={wrapRef}>
      <section id="top" className="mx-auto max-w-[1320px] px-5 pt-[54px] md:px-8">
        <div className="pb-10 pt-12 md:pb-14 md:pt-[72px]">
          <p className="eyebrow reveal text-ink">Payments for growing businesses</p>

          <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
            <h1 className="font-display reveal text-ink lg:col-span-8" style={{ fontSize: "clamp(46px, 7.4vw, 82px)" }}>
              Easy payments for
              <br />
              the good kind
              <br />
              of growth.
            </h1>
            <div className="reveal flex flex-col justify-end lg:col-span-4" style={{ transitionDelay: "120ms" }}>
              <p className="max-w-[360px] text-[16px] font-normal leading-[1.3] tracking-[-0.4px] text-quiet-graphite">
                Checkout, terminals, links, and payouts in one calm dashboard. Live in minutes, loved on every
                counter — from first sale to fiftieth store.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={onStart} className="btn-ledger">
                  Start selling
                </button>
                <a href="#demo" className="btn-oat">
                  See it live
                </a>
              </div>
              <p className="media-label mt-5 text-soft-gray">No setup fees · Live in minutes · Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* Media selector */}
        <div className="reveal flex flex-wrap items-center gap-2 pb-4">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSlide(i); setToastIdx(0); }}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium tracking-[-0.2px] transition-all ${
                i === slide ? "bg-ink text-paper" : "bg-oat-surface text-ink hover:bg-[#efe9e3]"
              }`}
            >
              <s.icon size={15} strokeWidth={2} />
              {s.tab}
              {i === slide && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-active-green-surface" style={{ background: "#4ade80" }} />}
            </button>
          ))}
          <span className="media-label ml-auto hidden text-soft-gray md:block">FIG. 01 — EVERY CHANNEL, ONE LEDGER</span>
        </div>

        {/* Hero media frame */}
        <div
          className="reveal relative overflow-hidden rounded-2xl bg-ink"
          style={{ transitionDelay: "100ms" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]">
            {SLIDES.map((s, i) => (
              <img
                key={s.id}
                src={s.image}
                alt={s.caption}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === slide ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />

            {/* top labels */}
            <div className="absolute left-4 top-4 flex items-center gap-2 md:left-6 md:top-6">
              <span key={slide} className="media-label animate-toast-in rounded-full bg-black/55 px-3 py-2 text-paper backdrop-blur-md">
                {current.label}
              </span>
              <span className="media-label hidden items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-paper backdrop-blur-md sm:flex">
                <Nfc size={13} /> TERMINAL 04 · ONLINE
              </span>
            </div>
            <div className="absolute right-4 top-4 md:right-6 md:top-6">
              <span className="media-label rounded-full bg-paper px-3 py-2 text-ink">99.99% UPTIME</span>
            </div>

            {/* Approval toast */}
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
              <div key={`${slide}-${toastIdx}`} className="animate-toast-in flex items-center gap-3 rounded-2xl bg-[#211006]/95 py-3 pl-3 pr-5 backdrop-blur-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/25">
                  <Check size={17} strokeWidth={2.4} className="text-paper" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold tracking-[-0.2px] text-paper">
                    {toast.amount} <span className="font-normal text-paper/60">approved</span>
                  </span>
                  <span className="media-label block pt-1 text-paper/55">{toast.method}</span>
                </span>
              </div>
              <p className="media-label mt-2.5 hidden pl-1 text-paper/80 md:block">{current.caption}</p>
            </div>

            {/* controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 md:bottom-6 md:right-6">
              <div className="mr-2 hidden items-center gap-1.5 sm:flex">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => { setSlide(i); setToastIdx(0); }}
                    className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-paper" : "w-1.5 bg-paper/40 hover:bg-paper/70"}`}
                  />
                ))}
              </div>
              <button
                onClick={() => { setSlide((slide - 1 + SLIDES.length) % SLIDES.length); setToastIdx(0); }}
                aria-label="Previous"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink transition-transform hover:scale-105 active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => { setSlide((slide + 1) % SLIDES.length); setToastIdx(0); }}
                aria-label="Next"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-ledger-brown text-paper shadow-[rgba(255,255,255,0.08)_0px_1px_0px_0px_inset] transition-transform hover:scale-105 active:scale-95"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="reveal grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-oat-line bg-oat-line md:grid-cols-4" style={{ marginTop: 12 }}>
          {[
            ["250k+", "businesses get paid"],
            ["30+", "payment methods live"],
            ["€214B", "processed, and counting"],
            ["4.9 / 5", "from 12,400 reviews"],
          ].map(([v, l]) => (
            <div key={l} className="bg-paper px-6 py-5">
              <p className="font-display text-[28px] tracking-[-0.8px] md:text-[32px]">{v}</p>
              <p className="media-label mt-1.5 text-quiet-graphite">{l}</p>
            </div>
          ))}
        </div>

        {/* Logo strip */}
        <div className="reveal py-12 md:py-16">
          <p className="eyebrow text-center text-soft-gray">Trusted by teams that sell everywhere</p>
          <div className="relative mt-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-14 pr-14">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <span key={i} className="whitespace-nowrap text-[19px] font-semibold tracking-[-0.4px] text-ink/35">
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
