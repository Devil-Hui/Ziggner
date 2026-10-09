import { useState } from "react";
import { ArrowUpRight, Droplets, Thermometer, Timer, ShieldCheck, FileDown } from "lucide-react";
import { FEATURES } from "../lib/data";
import { Reveal, useInView } from "../lib/motion";
import { Ring, TONE_HEX } from "./viz";
import { cn } from "../utils/cn";

function ReadinessViz() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const [part, setPart] = useState(0);
  const parts = [
    { label: "HRV", value: "61 ms", w: 0.86, color: "#31ce01" },
    { label: "Sleep need", value: "0 h 06 m", w: 0.95, color: "#b9a6ff" },
    { label: "Skin temp", value: "-0.2 °C", w: 0.78, color: "#ffab94" },
    { label: "Prior load", value: "620 TSB", w: 0.52, color: "#415eee" },
  ];
  return (
    <div ref={ref} className="rounded-[20px] bg-paper p-4 transition-shadow duration-500 hover:shadow-lift">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Ring progress={0.87} size={92} stroke={9} color={TONE_HEX.recovery} active={inView} />
          <div className="absolute inset-0 grid place-items-center">
            <p className="num text-[24px] font-semibold leading-none text-ink">87</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-ink">
            {parts[part].label} is your biggest lever
          </p>
          <p className="mt-1 h-[26px] overflow-hidden text-[12px] leading-[1.35] text-mute">
            {part === 0
              ? "Nine ms above your five-week mean — that carries the day."
              : part === 1
                ? "You are even with your sleep need. No debt to repay."
                : part === 2
                  ? "Temperature dipped overnight. No illness signal detected."
                  : "Yesterday's load was heavy, but you absorbed 78% of it."}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {parts.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onMouseEnter={() => setPart(i)}
            onFocus={() => setPart(i)}
            onClick={() => setPart(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[12px] px-2 py-1.5 text-left transition-colors duration-300",
              part === i ? "bg-cloud" : "hover:bg-cloud-soft",
            )}
          >
            <span className="w-[74px] shrink-0 text-[12px] font-medium text-ink">{p.label}</span>
            <span className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-cloud">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: inView ? `${p.w * 100}%` : "0%",
                  background: p.color,
                  transition: `width 1.2s cubic-bezier(.22,1,.36,1) ${i * 110}ms`,
                }}
              />
            </span>
            <span className="num w-[64px] shrink-0 text-right text-[11px] text-mute">{p.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SleepViz() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const stages = [
    { k: "Deep", h: 1.4, c: "#7f63e8" },
    { k: "REM", h: 1.2, c: "#b9a6ff" },
    { k: "Core", h: 4.1, c: "#415eee" },
    { k: "Awake", h: 0.3, c: "#dde5f4" },
  ];
  const night = [0, 0, 1, 1, 1, 2, 2, 0, 1, 1, 2, 3, 2, 1, 1, 0, 0, 2, 2, 1];
  return (
    <div ref={ref} className="rounded-[20px] bg-paper p-4 transition-shadow duration-500 hover:shadow-lift">
      <div className="flex items-end justify-between">
        <div>
          <p className="num text-[34px] font-semibold leading-none text-ink">7:54</p>
          <p className="mt-1 text-[12px] text-mute">asleep · 22:41 → 06:12</p>
        </div>
        <div className="flex items-center gap-1.5">
          {stages.map((s) => (
            <span key={s.k} className="flex items-center gap-1 text-[10px] text-mute">
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
              {s.k}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-9 gap-[2px] overflow-hidden rounded-[10px]">
        {night.map((s, i) => (
          <span
            key={i}
            className="flex-1 origin-bottom"
            style={{
              background: stages[s].c,
              opacity: inView ? (s === 3 ? 0.6 : 0.35 + s * 0.02 + 0.45) : 0,
              transform: `scaleY(${inView ? 0.5 + ((i % 5) + 1) * 0.12 : 0.1})`,
              transition: `opacity .6s ease ${i * 26}ms, transform .8s cubic-bezier(.22,1,.36,1) ${i * 26}ms`,
            }}
          />
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {stages.map((s, i) => (
          <div key={s.k} className="flex items-center gap-3">
            <span className="w-[52px] text-[12px] font-medium text-ink">{s.k}</span>
            <span className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-cloud">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: inView ? `${(s.h / 4.4) * 100}%` : "0%",
                  background: s.c,
                  transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${i * 100}ms`,
                }}
              />
            </span>
            <span className="num w-[46px] text-right text-[11px] text-mute">{s.h.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrainViz() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const load = [22, 41, 18, 62, 35, 74, 48, 29, 58, 81, 44, 66, 39, 71];
  return (
    <div ref={ref} className="rounded-[20px] bg-paper p-4 transition-shadow duration-500 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-ink">14-day load vs recovery</p>
        <p className="num text-[11px] text-mute">peak W2</p>
      </div>
      <div className="mt-3 flex h-[86px] items-end gap-[5px]">
        {load.map((v, i) => (
          <div key={i} className="group/bar relative flex-1">
            <span
              className="block w-full rounded-[3px]"
              style={{
                height: inView ? `${v}%` : "4%",
                background: v > 65 ? "#ffab94" : v > 45 ? "#222326" : "rgba(34,35,38,0.2)",
                transition: `height .9s cubic-bezier(.22,1,.36,1) ${i * 45}ms`,
              }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-charcoal px-1.5 py-[2px] text-[9px] text-cloud opacity-0 transition-opacity duration-300 group-hover/bar:opacity-100">
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { l: "Strain", v: "14.2", c: "#ffab94" },
          { l: "Recovery", v: "82%", c: "#31ce01" },
          { l: "Balance", v: "1:3", c: "#415eee" },
        ].map((m) => (
          <div key={m.l} className="rounded-[12px] bg-cloud px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-mute">{m.l}</p>
            <p className="num mt-0.5 text-[17px] font-semibold" style={{ color: m.c }}>
              {m.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const VIZ = [ReadinessViz, SleepViz, StrainViz];

const EXTRAS = [
  { icon: Thermometer, title: "Illness signal", copy: "Temp and RHR drifts flagged 31 hours on average." },
  { icon: Timer, title: "Caffeine window", copy: "A cut-off time that moves with your sleep debt." },
  { icon: Droplets, title: "Hydration nudge", copy: "Weight swing from the overnight fast, in litres." },
  { icon: ShieldCheck, title: "On-device first", copy: "HealthKit only. No ad SDK has ever touched a Bevel row." },
];

export function Features() {
  return (
    <section id="features" className="relative bg-paper px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <p className="text-cap font-semibold uppercase tracking-[0.2em] text-mute">Three surfaces, one read</p>
          <h2 className="display mt-4 text-[clamp(32px,5.2vw,56px)]">
            The metrics that decide
            <br />
            <span className="text-mute/80">the next fourteen hours.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Viz = VIZ[i];
            return (
              <Reveal key={f.title} delay={i * 110} className="h-full">
                <article className="group flex h-full flex-col rounded-3xl bg-cloud p-6 transition-all duration-500 hover:-translate-y-[3px] sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="display text-[clamp(30px,3.4vw,40px)] leading-card tracking-card">{f.title}</h3>
                    <span className="num shrink-0 rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink">
                      {f.stat}
                      <span className="ml-1 text-mute">{f.unit}</span>
                    </span>
                  </div>
                  <p className="mt-4 text-[17px] leading-[1.3] text-mute sm:text-[19px] xl:text-body xl:leading-body">
                    {f.copy}
                  </p>
                  <div className="mt-6 flex-1">
                    <Viz />
                  </div>
                  <a
                    href="#download"
                    className="mt-6 inline-flex items-center gap-1.5 text-nav font-medium text-ink transition-colors hover:text-metric"
                  >
                    <span className="link-underline">How it's calculated</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXTRAS.map((e, i) => (
            <Reveal key={e.title} delay={i * 80} className="h-full">
              <div className="flex h-full flex-col rounded-3xl bg-cloud-soft p-6 transition-colors duration-500 hover:bg-cloud">
                <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-paper text-ink">
                  <e.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <p className="mt-4 text-[17px] font-semibold leading-tight text-ink">{e.title}</p>
                <p className="mt-2 text-[14px] leading-[1.45] text-mute">{e.copy}</p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={320} className="sm:col-span-2 lg:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cloud-line px-6 py-5">
              <p className="max-w-[620px] text-[15px] leading-[1.5] text-mute">
                Every number on this page is real device output from Bevel's sample profile — HRV band, sleep
                stages and training load included. Export the whole dataset as CSV whenever you like.
              </p>
              <a
                href="#download"
                className="inline-flex items-center gap-2 rounded-pill bg-paper px-4 py-2 text-nav font-medium text-ink shadow-lift transition-transform duration-300 hover:-translate-y-[1px]"
              >
                <FileDown className="h-4 w-4" />
                Sample export
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
