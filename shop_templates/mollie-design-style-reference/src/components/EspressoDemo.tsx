import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Download, ArrowUpRight, Plus } from "lucide-react";
import { INITIAL_TXS, LIVE_FEED_POOL, type Tx, type TxStatus } from "../data";

const FILTERS: { id: TxStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "expired", label: "Expired" },
];

function statusStyle(s: TxStatus) {
  if (s === "paid") return { dot: "#4ade80", text: "#86efac", label: "Paid" };
  if (s === "pending") return { dot: "#eab308", text: "#fde68a", label: "Pending" };
  return { dot: "#f87171", text: "#fca5a5", label: "Expired" };
}

const CHART = [42, 58, 44, 70, 62, 88, 74, 96, 82, 104, 92, 118];

export default function EspressoDemo() {
  const [txs, setTxs] = useState<Tx[]>(INITIAL_TXS);
  const [filter, setFilter] = useState<TxStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const poolIdx = useRef(0);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const p = LIVE_FEED_POOL[poolIdx.current % LIVE_FEED_POOL.length];
      poolIdx.current += 1;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const status: TxStatus = Math.random() > 0.82 ? "pending" : "paid";
      setTxs((prev) =>
        [
          {
            id: `tr_${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            customer: p.customer,
            email: `${p.customer.toLowerCase().replace(/[^a-z]/g, "")}@mail.co`,
            method: p.method,
            amount: p.amount,
            currency: "€",
            status,
            time,
          },
          ...prev,
        ].slice(0, 9)
      );
    }, 4200);
    return () => clearInterval(t);
  }, [live]);

  const filtered = useMemo(
    () =>
      txs.filter(
        (t) =>
          (filter === "all" || t.status === filter) &&
          (t.customer.toLowerCase().includes(query.toLowerCase()) || t.method.toLowerCase().includes(query.toLowerCase()))
      ),
    [txs, filter, query]
  );

  const paidTotal = txs.filter((t) => t.status === "paid").reduce((a, t) => a + t.amount, 0);
  const pendingTotal = txs.filter((t) => t.status === "pending").reduce((a, t) => a + t.amount, 0);

  const max = Math.max(...CHART);
  const points = CHART.map((v, i) => `${(i / (CHART.length - 1)) * 100},${100 - (v / max) * 88}`).join(" ");

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

  return (
    <div ref={ref}>
      <section id="demo" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 pt-16 md:px-8 md:pt-24">
        <div className="reveal flex flex-wrap items-end justify-between gap-4 pb-7">
          <div>
            <p className="eyebrow text-ink">Live dashboard</p>
            <h2 className="font-display mt-3 max-w-[620px] text-[clamp(32px,4.4vw,56px)] leading-[1.05] tracking-[-1.4px]">
              One ledger for every euro in.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive(!live)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium ${live ? "bg-ink text-paper" : "bg-oat-surface text-ink"}`}
            >
              <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse-dot bg-[#4ade80]" : "bg-soft-gray"}`} />
              {live ? "Live feed on" : "Live feed off"}
            </button>
          </div>
        </div>

        <div className="reveal overflow-hidden rounded-2xl bg-espresso-panel">
          {/* chrome */}
          <div className="flex flex-wrap items-center gap-3 border-b border-paper/10 px-6 py-4 md:px-8">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-paper/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper/20" />
            </div>
            <span className="media-label text-paper/50">MOLLIE DASHBOARD — ACC_2481 · EUR</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-paper/8 px-4 py-2 sm:flex" style={{ background: "rgba(255,255,255,0.08)" }}>
                <Search size={14} className="text-paper/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search payments…"
                  className="w-36 bg-transparent text-[13px] text-paper placeholder:text-paper/40 focus:outline-none"
                />
              </div>
              <button className="flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-[13px] font-medium text-ink">
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px bg-paper/10 lg:grid-cols-12">
            {/* left — balances + chart */}
            <div className="bg-espresso-panel p-6 md:p-8 lg:col-span-5">
              <p className="media-label text-paper/50">TODAY — TUESDAY 7 OCT</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <p className="media-label text-paper/50">AVAILABLE</p>
                  <p className="font-display mt-2 text-[30px] text-paper">€{paidTotal.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium" style={{ color: "#86efac" }}>
                    <ArrowUpRight size={13} /> +18.2% vs Mon
                  </p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <p className="media-label text-paper/50">PENDING</p>
                  <p className="font-display mt-2 text-[30px] text-paper">€{pendingTotal.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="mt-1.5 text-[12px] font-medium" style={{ color: "#fde68a" }}>Settles tomorrow</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <p className="media-label text-paper/50">REVENUE — LAST 12 HOURS</p>
                  <p className="media-label" style={{ color: "#86efac" }}>
                    {hoverIdx !== null ? `€${(CHART[hoverIdx] * 142).toLocaleString()}` : "€14,203"}
                  </p>
                </div>
                <div className="relative mt-3">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[130px] w-full">
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e07122" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#e07122" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[25, 50, 75].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
                    ))}
                    <polygon points={`0,100 ${points} 100,100`} fill="url(#revFill)" />
                    <polyline points={points} fill="none" stroke="#e07122" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    {CHART.map((v, i) => (
                      <circle
                        key={i}
                        cx={(i / (CHART.length - 1)) * 100}
                        cy={100 - (v / max) * 88}
                        r={hoverIdx === i ? 2.4 : 0}
                        fill="#fff"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex">
                    {CHART.map((_, i) => (
                      <div key={i} className="h-full flex-1 cursor-crosshair" onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="media-label text-paper/35">08:00</span>
                  <span className="media-label text-paper/35">12:00</span>
                  <span className="media-label text-paper/35">16:00</span>
                  <span className="media-label text-paper/35">20:00</span>
                </div>
              </div>

              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-paper/20 py-3 text-[14px] font-medium text-paper transition-colors hover:bg-paper/5">
                <Plus size={16} /> Create payment link
              </button>
            </div>

            {/* right — transactions */}
            <div className="bg-espresso-panel p-6 md:p-8 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                      filter === f.id ? "bg-paper text-ink" : "text-paper/60 hover:text-paper"
                    }`}
                    style={filter !== f.id ? { background: "rgba(255,255,255,0.08)" } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
                <span className="media-label ml-auto text-paper/40">{filtered.length} PAYMENTS</span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="hidden grid-cols-12 gap-2 border-b border-paper/10 px-5 py-3 sm:grid">
                  <span className="media-label col-span-5 text-paper/40">CUSTOMER</span>
                  <span className="media-label col-span-3 text-paper/40">METHOD</span>
                  <span className="media-label col-span-2 text-right text-paper/40">AMOUNT</span>
                  <span className="media-label col-span-2 text-right text-paper/40">STATUS</span>
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  {filtered.map((t) => {
                    const s = statusStyle(t.status);
                    return (
                      <div key={t.id} className="grid animate-ticker grid-cols-12 items-center gap-2 border-b border-paper/5 px-5 py-3.5 last:border-0 hover:bg-paper/5">
                        <div className="col-span-7 sm:col-span-5">
                          <p className="truncate text-[14px] font-medium tracking-[-0.2px] text-paper">{t.customer}</p>
                          <p className="truncate text-[11px] text-paper/40">{t.id} · {t.time}</p>
                        </div>
                        <div className="col-span-5 text-right sm:col-span-3 sm:text-left">
                          <span className="inline-block rounded-full px-2.5 py-1 text-[12px] text-paper/80" style={{ background: "rgba(255,255,255,0.08)" }}>
                            {t.method}
                          </span>
                        </div>
                        <p className="col-span-6 text-[14px] font-semibold tracking-[-0.2px] text-paper sm:col-span-2 sm:text-right">
                          {t.currency}{t.amount.toFixed(2)}
                        </p>
                        <p className="col-span-6 flex items-center justify-end gap-1.5 text-[12px] font-medium sm:col-span-2" style={{ color: s.text }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} /> {s.label}
                        </p>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="px-5 py-10 text-center text-[14px] text-paper/50">No payments match “{query}”. Try another search.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="media-label text-paper/40">AUTO-RECONCILED · XERO / EXACT SYNCED 2 MIN AGO</span>
                <a href="#pricing" className="flex items-center gap-1 text-[13px] font-medium text-paper">
                  Full reporting <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
