import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Nfc, Plus } from "lucide-react";
import { FAQS, IMAGES, STORIES } from "../data";

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

export default function Stories({ onStart }: { onStart: () => void }) {
  const root = useRevealRoot();
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // pricing calculator
  const [volume, setVolume] = useState(45000);
  const [avgOrder, setAvgOrder] = useState(68);
  const [mix, setMix] = useState({ ideal: 40, cards: 45, klarna: 15 });
  const [openFaq, setOpenFaq] = useState(0);

  const scrollBy = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.querySelector("article")?.offsetWidth ?? 360;
    el.scrollBy({ left: dir * (w + 12), behavior: "smooth" });
  };

  const handleTap = () => {
    setTapped(true);
    setTapCount((c) => c + 1);
    setTimeout(() => setTapped(false), 2200);
  };

  const orders = Math.max(1, Math.round(volume / avgOrder));
  const mollieFee =
    volume * ((mix.ideal / 100) * 0.004 + (mix.cards / 100) * 0.018 + (mix.klarna / 100) * 0.032) +
    orders * 0.22;
  const legacyFee = volume * 0.029 + orders * 0.3 + 49;
  const savings = Math.max(0, legacyFee - mollieFee);

  const totalPages = Math.max(1, STORIES.length - 2);

  return (
    <div ref={root}>
      {/* Customer stories */}
      <section id="customers" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 pt-16 md:px-8 md:pt-24">
        <div className="reveal flex flex-wrap items-end justify-between gap-4 pb-7">
          <div>
            <p className="eyebrow text-ink">Customer stories</p>
            <h2 className="font-display mt-3 max-w-[620px] text-[clamp(32px,4.4vw,56px)] leading-[1.05] tracking-[-1.4px]">
              Loved on the counter and in the cart.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { scrollBy(-1); setPage(Math.max(0, page - 1)); }} aria-label="Previous stories" className="flex h-14 w-14 items-center justify-center rounded-full border border-oat-line bg-paper transition-colors hover:bg-oat-surface">
              <ArrowLeft size={19} />
            </button>
            <button onClick={() => { scrollBy(1); setPage(Math.min(totalPages, page + 1)); }} aria-label="Next stories" className="flex h-14 w-14 items-center justify-center rounded-full bg-ledger-brown text-paper shadow-[rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
              <ArrowRight size={19} />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="reveal no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {STORIES.map((s) => (
            <article key={s.brand} className="w-[86vw] max-w-[400px] shrink-0 snap-start sm:w-[380px]">
              <div className="relative overflow-hidden rounded-2xl">
                <img src={s.image} alt={s.brand} className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.03]" />
                <span className="media-label absolute left-4 top-4 rounded-full bg-paper px-3 py-2 text-ink">{s.brand}</span>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-2xl bg-[#211006]/92 px-4 py-2.5 backdrop-blur-md">
                  <span className="font-display text-[22px] text-paper">{s.stat}</span>
                  <span className="media-label max-w-[110px] leading-[1.3] text-paper/60">{s.statLabel.toUpperCase()}</span>
                </div>
              </div>
              <p className="media-label mt-5 text-center text-soft-gray">{s.brand}</p>
              <p className="quote-serif mt-2 px-2 text-center text-near-black">“{s.quote}”</p>
              <p className="mt-2 text-center text-[13px] text-quiet-graphite">{s.name}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Harbor dark section */}
      <section id="instore" className="mx-auto max-w-[1320px] px-5 pt-16 md:px-8 md:pt-24">
        <div className="reveal harbor-gradient grid grid-cols-1 overflow-hidden rounded-2xl lg:grid-cols-2">
          <div className="p-8 md:p-12 lg:p-14">
            <p className="eyebrow text-paper/70">In-person · Terminals</p>
            <h2 className="font-display mt-4 text-[clamp(32px,4vw,52px)] leading-[1.05] tracking-[-1.2px] text-paper">
              The till that never holds up the line.
            </h2>
            <p className="mt-4 max-w-[420px] text-[15px] leading-[1.5] tracking-[-0.2px] text-paper/70">
              Portable or countertop, Wi-Fi or 4G — every tap lands in the same ledger as your webshop.
              Go on, try the till.
            </p>
            <div className="mt-7 space-y-3">
              {[
                ["Tap to Pay on iPhone", "No hardware. Just your phone."],
                ["One balance, every till", "Refunds from anywhere, in one tap."],
                ["Offline mode", "Keeps selling when Wi-Fi quits."],
              ].map(([t, d]) => (
                <div key={t} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper/25">
                    <Check size={16} className="text-paper" />
                  </span>
                  <div>
                    <p className="text-[15px] font-medium tracking-[-0.25px] text-paper">{t}</p>
                    <p className="text-[13px] text-paper/55">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={onStart} className="rounded-full bg-paper px-6 py-4 text-[16px] font-medium tracking-[-0.2px] text-ink transition-transform hover:scale-[1.02] active:scale-[0.98]">
                Order a terminal
              </button>
              <a href="#pricing" className="rounded-full border border-paper/25 px-6 py-4 text-[16px] font-medium tracking-[-0.2px] text-paper hover:bg-paper/10">
                See hardware
              </a>
            </div>
          </div>
          <div className="relative min-h-[420px] p-4 md:p-5 lg:p-6">
            <img src={IMAGES.terminal} alt="Terminal" className="absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)] rounded-2xl object-cover md:inset-5 md:h-[calc(100%-40px)] md:w-[calc(100%-40px)]" />
            <div className="absolute inset-4 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-black/20 md:inset-5" />
            <span className="media-label absolute left-8 top-8 rounded-full bg-black/55 px-3 py-2 text-paper backdrop-blur-md md:left-10 md:top-10">
              TERMINAL 04 · BATTERY 96% · 4G
            </span>
            {/* Tap demo */}
            <div className="absolute bottom-8 left-1/2 w-[min(340px,80%)] -translate-x-1/2 md:bottom-10">
              {!tapped ? (
                <button
                  onClick={handleTap}
                  className="group flex w-full items-center justify-between rounded-2xl bg-paper/95 py-4 pl-5 pr-4 backdrop-blur-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-left">
                    <span className="block text-[17px] font-semibold tracking-[-0.3px]">€24.50</span>
                    <span className="media-label block pt-0.5 text-quiet-graphite">TAP PHONE TO PAY</span>
                  </span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
                    <Nfc size={20} />
                    <span className="absolute inset-0 animate-nfc rounded-full border-2 border-ink/40" />
                  </span>
                </button>
              ) : (
                <div className="animate-toast-in flex items-center gap-3 rounded-2xl bg-[#211006]/95 py-4 pl-4 pr-5 backdrop-blur-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/25">
                    <Check size={19} strokeWidth={2.4} className="text-paper" />
                  </span>
                  <span>
                    <span className="block text-[16px] font-semibold tracking-[-0.2px] text-paper">€24.50 approved</span>
                    <span className="media-label block pt-1 text-paper/55">APPLE PAY · ···· 4812 · 1.8S</span>
                  </span>
                </div>
              )}
              {tapCount > 0 && (
                <p className="media-label mt-2 text-center text-paper/70">
                  {tapCount} DEMO TAP{tapCount > 1 ? "S" : ""} · NO REAL MONEY MOVED
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing calculator */}
      <section id="pricing" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 pt-16 md:px-8 md:pt-24">
        <div className="reveal pb-7 text-center">
          <p className="eyebrow text-ink">Pricing, on paper</p>
          <h2 className="font-display mx-auto mt-3 max-w-[680px] text-[clamp(32px,4.4vw,56px)] leading-[1.05] tracking-[-1.4px]">
            Drag the sliders. Do the honest maths.
          </h2>
          <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.45] tracking-[-0.3px] text-quiet-graphite">
            No setup fee, no monthly minimum, no mystery invoice. Just pay per sale — and keep the rest.
          </p>
        </div>

        <div className="reveal grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="rounded-2xl bg-oat-surface p-8 md:p-10 lg:col-span-7">
            <div className="flex items-center justify-between">
              <span className="media-label text-quiet-graphite">MONTHLY VOLUME</span>
              <span className="font-display text-[30px] tracking-[-0.8px]">€{volume.toLocaleString()}</span>
            </div>
            <input type="range" min={5000} max={500000} step={1000} value={volume} onChange={(e) => setVolume(+e.target.value)} className="mt-4 w-full" />
            <div className="mt-8 flex items-center justify-between">
              <span className="media-label text-quiet-graphite">AVERAGE ORDER</span>
              <span className="font-display text-[30px] tracking-[-0.8px]">€{avgOrder}</span>
            </div>
            <input type="range" min={8} max={400} step={1} value={avgOrder} onChange={(e) => setAvgOrder(+e.target.value)} className="mt-4 w-full" />
            <div className="mt-8">
              <span className="media-label text-quiet-graphite">PAYMENT MIX — TAP TO NUDGE ±5%</span>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["ideal", "cards", "klarna"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setMix((p) => ({ ...p, [k]: Math.min(80, p[k] + 5), cards: k !== "cards" ? Math.max(5, p.cards - 5) : p.cards }))}
                    className="rounded-2xl bg-paper p-4 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <p className="font-display text-[24px]">{mix[k]}%</p>
                    <p className="media-label mt-1 text-quiet-graphite">{k === "ideal" ? "IDEAL · €0.29" : k === "cards" ? "CARDS · 1.5%" : "KLARNA · 2.99%"}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-quiet-graphite">≈ {orders.toLocaleString()} orders / month · mix rebalances automatically</p>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl bg-espresso-panel p-8 md:p-10 lg:col-span-5">
            <span className="media-label text-paper/50">YOUR MONTHLY LEDGER</span>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-paper">Mollie fees</span>
                  <span className="media-label rounded-full px-2.5 py-1" style={{ background: "rgba(74,222,128,0.15)", color: "#86efac" }}>YOU KEEP MORE</span>
                </div>
                <p className="font-display mt-1.5 text-[42px] tracking-[-1px] text-paper">€{mollieFee.toLocaleString("en-IE", { maximumFractionDigits: 0 })}</p>
                <p className="text-[13px] text-paper/50">{((mollieFee / volume) * 100).toFixed(2)}% effective rate · payouts included</p>
              </div>
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)" }}>
                <span className="text-[14px] font-medium text-paper/70">Legacy PSP estimate</span>
                <p className="font-display mt-1.5 text-[30px] tracking-[-0.8px] text-paper/50 line-through">€{legacyFee.toLocaleString("en-IE", { maximumFractionDigits: 0 })}</p>
                <p className="text-[13px] text-paper/40">Gateway + monthly + “enterprise” extras</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-terracotta-disc px-5 py-4">
                <span className="text-[14px] font-medium text-paper">You save</span>
                <span className="font-display text-[26px] text-paper">€{savings.toLocaleString("en-IE", { maximumFractionDigits: 0 })}<span className="text-[15px]">/mo</span></span>
              </div>
            </div>
            <button onClick={onStart} className="mt-auto rounded-full bg-paper py-4 pt-4 text-[16px] font-medium tracking-[-0.2px] text-ink transition-transform hover:scale-[1.01]" style={{ marginTop: 20 }}>
              Start saving today
            </button>
            <p className="media-label mt-3 text-center text-paper/40">NO SETUP FEE · NO MONTHLY MINIMUM</p>
          </div>
        </div>
      </section>

      {/* Developers strip + FAQ */}
      <section id="developers" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 pt-16 md:px-8 md:pt-24">
        <div className="reveal grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-ink p-8 md:p-10">
            <p className="eyebrow text-paper/60">Developers</p>
            <h3 className="font-display mt-3 text-[clamp(26px,3vw,34px)] leading-[1.1] tracking-[-0.8px] text-paper">
              Live before lunch. Honestly.
            </h3>
            <div className="mt-6 rounded-xl bg-[#0d0d0d] p-5 font-ibm-plex-mono text-[13px] leading-[1.7]">
              <p><span className="text-[#919191]">$</span> <span className="text-paper">npm i @mollie/api-client</span></p>
              <p className="mt-2"><span className="text-[#d66733]">const</span> <span className="text-paper">payment</span> <span className="text-[#919191]">=</span> <span className="text-[#919191]">await</span> <span className="text-paper">mollie.payments.create({"{"}</span></p>
              <p className="pl-4"><span className="text-[#86efac]">amount</span><span className="text-[#919191]">:</span> <span className="text-paper">{"{ value: '24.50', currency: 'EUR' }"}</span><span className="text-[#919191]">,</span></p>
              <p className="pl-4"><span className="text-[#86efac]">method</span><span className="text-[#919191]">:</span> <span className="text-[#e07122]">'ideal'</span><span className="text-[#919191]">,</span></p>
              <p className="pl-4"><span className="text-[#86efac]">redirectUrl</span><span className="text-[#919191]">:</span> <span className="text-[#e07122]">'https://shop.nl/thanks'</span></p>
              <p><span className="text-paper">{"}"});</span> <span className="text-[#919191]">// → checkoutUrl in 41ms</span></p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["REST · OpenAPI", "Node · PHP · Python", "Webhooks", "Test mode"].map((t) => (
                <span key={t} className="media-label rounded-full px-3 py-2 text-paper/70" style={{ background: "rgba(255,255,255,0.08)" }}>{t}</span>
              ))}
            </div>
          </div>

          <div id="faq" className="rounded-2xl border border-oat-line p-8 md:p-10">
            <p className="eyebrow text-ink">Questions</p>
            <h3 className="font-display mt-3 text-[clamp(26px,3vw,34px)] leading-[1.1] tracking-[-0.8px]">
              Asked at every counter.
            </h3>
            <div className="mt-6 divide-y divide-[#f5f2f0]">
              {FAQS.map((f, i) => (
                <div key={f.q}>
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
                    <span className="text-[15px] font-medium tracking-[-0.25px]">{f.q}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${openFaq === i ? "bg-ink text-paper" : "bg-oat-surface"}`}>
                      {openFaq === i ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                  </button>
                  <div className={`grid transition-all duration-300 ${openFaq === i ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden text-[14px] leading-[1.55] tracking-[-0.15px] text-quiet-graphite">{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* image band */}
        <div className="reveal grid grid-cols-2 gap-3 pt-3 md:grid-cols-4">
          {[IMAGES.cafe, IMAGES.boutique2, IMAGES.pack, IMAGES.online].map((src, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl">
              <img src={src} alt="Commerce" className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105 md:aspect-square" />
              <span className="media-label absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-paper backdrop-blur-md">
                {["COUNTER — AMS", "FLOOR — CPH", "STUDIO — RTM", "CART — WEB"][i]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
