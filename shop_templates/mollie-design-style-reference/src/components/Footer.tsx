import { ArrowUpRight, Check } from "lucide-react";
import { IMAGES } from "../data";

const COLS: [string, string[]][] = [
  ["Products", ["Checkout", "Terminals", "Payment links", "Subscriptions", "Invoicing", "Tap to Pay"]],
  ["Use cases", ["E-commerce", "Retail", "Hospitality", "Marketplaces", "SaaS", "Creators"]],
  ["Developers", ["API reference", "Guides", "SDKs", "Webhooks", "Changelog", "Status"]],
  ["Company", ["About", "Customers", "Careers", "Press", "Contact", "Partners"]],
  ["Resources", ["Pricing", "Help centre", "Blog", "Payment methods", "Security", "Legal"]],
];

export default function Footer({ onStart }: { onStart: () => void }) {
  return (
    <footer className="mx-auto max-w-[1320px] px-5 pt-16 md:px-8 md:pt-24">
      {/* CTA */}
      <div id="stories" className="relative overflow-hidden rounded-2xl bg-oat-surface">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 md:p-12 lg:p-14">
            <p className="eyebrow text-ink">Get started</p>
            <h2 className="font-display mt-4 text-[clamp(38px,5vw,64px)] leading-[1.02] tracking-[-1.8px]">
              Start selling in minutes.
            </h2>
            <p className="mt-4 max-w-[380px] text-[16px] leading-[1.4] tracking-[-0.35px] text-quiet-graphite">
              Open your ledger today. First payout lands tomorrow — we'll even migrate your customers for free.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={onStart} className="btn-ledger">Create free account</button>
              <a href="#demo" className="rounded-full bg-paper px-6 py-4 text-[16px] font-medium tracking-[-0.2px] hover:bg-white">
                Talk to sales
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              {["No setup fee", "No monthly minimum", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] font-medium text-quiet-graphite">
                  <Check size={14} className="text-active-green-surface" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative min-h-[300px] p-4 lg:p-5">
            <img src={IMAGES.barista} alt="Counter" className="absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)] rounded-2xl object-cover lg:inset-5 lg:h-[calc(100%-40px)] lg:w-[calc(100%-40px)]" />
            <div className="absolute bottom-8 left-8 flex items-center gap-3 rounded-2xl bg-[#211006]/95 py-3 pl-3 pr-5 backdrop-blur-md lg:bottom-10 lg:left-10">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/25">
                <Check size={17} strokeWidth={2.4} className="text-paper" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold tracking-[-0.2px] text-paper">€1,284.00 <span className="font-normal text-paper/60">paid out</span></span>
                <span className="media-label block pt-1 text-paper/55">TUESDAY 09:00 · ING ···· 4418</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dense links */}
      <div className="grid grid-cols-2 gap-8 py-14 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-ledger-brown">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M7 23V9l5 9.5L17 9l5 9.5L27 9v14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-display text-[20px] font-medium tracking-[-0.5px]">Ziggner</span>
          </span>
          <p className="mt-3 max-w-[220px] text-[13px] leading-relaxed text-quiet-graphite">
            Cashmere counter, dark ledger. Payments for the good kind of growth.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-oat-surface px-3.5 py-2.5" style={{ width: "fit-content" }}>
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-active-green-surface" />
            <span className="text-[12px] font-medium">All systems operational</span>
          </div>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <p className="media-label text-soft-gray">{title.toUpperCase()}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map((l) => (
                <li key={l}>
                  <a href="#top" className="group flex items-center gap-1 text-[14px] tracking-[-0.2px] text-near-black hover:text-quiet-graphite">
                    {l}
                    <ArrowUpRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-oat-line py-6 sm:flex-row">
        <p className="text-[12px] text-soft-gray">© 2026 Ziggner. All rights reserved.</p>
        <div className="flex items-center gap-5">
          {["Privacy", "Terms", "Cookies", "EN ⌄"].map((l) => (
            <a key={l} href="#top" className="text-[12px] font-medium text-quiet-graphite hover:text-ink">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
