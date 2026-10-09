import { Play, Sparkles } from "lucide-react";
import { DeviceStack } from "./Devices";
import { ApplePill, RatingStrip } from "./ApplePill";
import { Reveal, useCountUp, useInView } from "../lib/motion";

function HeroStat({
  value,
  suffix,
  label,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const n = useCountUp(value, inView, 1600);
  return (
    <div ref={ref} className="text-center">
      <p className="num text-[22px] font-semibold leading-none text-ink sm:text-[26px]">
        {n.toFixed(decimals)}
        <span className="text-mute">{suffix}</span>
      </p>
      <p className="mt-1 text-cap leading-cap font-medium tracking-[0.02em] text-mute">{label}</p>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative px-3 pt-[86px] sm:px-4 sm:pt-[96px]">
      <div
        className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] sm:rounded-[40px]"
        style={{ background: "linear-gradient(180deg,#d2e5ff 0%,#e9f0fd 42%,#fff9ee 100%)" }}
      >
        {/* atmosphere */}
        <div className="pointer-events-none absolute inset-0 grain opacity-70" />
        <div
          className="pointer-events-none absolute -left-24 -top-32 h-[420px] w-[620px] animate-drift rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(255,255,255,0.85),transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-40 h-[360px] w-[520px] animate-drift rounded-full blur-3xl [animation-delay:-8s]"
          style={{ background: "radial-gradient(circle,rgba(255,202,0,0.22),transparent 68%)" }}
        />

        <div className="relative px-5 pb-8 pt-12 sm:px-10 sm:pt-16 lg:px-16">
          <Reveal className="mx-auto flex max-w-[720px] flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/70 px-3 py-1.5 text-cap font-semibold uppercase tracking-[0.16em] text-ink/70 ring-1 ring-white backdrop-blur">
              <Sparkles className="h-3 w-3 text-metric" strokeWidth={2.4} />
              Bevel 4 · watchOS 12 companion
            </span>

            <h1 className="display mt-6 text-[clamp(40px,8.6vw,80px)] leading-[0.95]">
              Your morning,
              <br />
              <span className="text-mute/85">measured before</span>
              <br />
              you're upright.
            </h1>

            <p
              className="mt-6 max-w-[600px] text-[clamp(17px,2.1vw,24px)] leading-[1.35] text-mute"
              style={{ letterSpacing: "-0.01em" }}
            >
              Bevel reads sleep, HRV, temperature and yesterday's load the moment you lift your wrist —
              then hands you one honest number for the day.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
              <ApplePill className="px-5 py-2.5 text-[17px]" />
              <a
                href="#board"
                className="group inline-flex items-center gap-2 text-[17px] font-medium text-ink"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_16px_-8px_rgba(31,32,37,0.4)] transition-transform duration-300 group-hover:scale-105">
                  <Play className="h-3 w-3 fill-ink" />
                </span>
                <span className="link-underline">See a real morning</span>
              </a>
            </div>

            <RatingStrip className="mt-5" />
          </Reveal>

          <Reveal delay={140} className="relative mt-10 sm:mt-12">
            <DeviceStack />
          </Reveal>

          <Reveal
            delay={220}
            className="mx-auto mt-10 grid max-w-[720px] grid-cols-2 items-center gap-6 rounded-3xl bg-white/55 px-6 py-5 backdrop-blur-sm ring-1 ring-white/70 sm:mt-12 sm:grid-cols-4"
          >
            <HeroStat value={87} suffix="%" label="Avg. readiness lift" />
            <HeroStat value={2.1} decimals={1} suffix="M" label="Mornings logged" />
            <HeroStat value={14} suffix="" label="Nights to a real baseline" />
            <HeroStat value={98} suffix="%" label="Would wake up again" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
