import { Reveal } from "../lib/motion";
import { cn } from "../utils/cn";

const WORDMARK_STYLES = [
  { name: "Apple Watch", cls: "font-display font-semibold tracking-tightest" },
  { name: "Oura Ring", cls: "font-display font-medium tracking-[0.18em] uppercase" },
  { name: "WHOOP", cls: "font-display font-bold tracking-[0.22em] uppercase" },
  { name: "Garmin", cls: "font-display font-semibold tracking-[0.02em] italic" },
  { name: "Withings", cls: "font-sans font-medium tracking-tightest lowercase" },
  { name: "Polar", cls: "font-display font-bold tracking-[0.3em] uppercase" },
  { name: "Fitbit", cls: "font-display font-semibold tracking-[-0.05em] lowercase" },
  { name: "Suunto", cls: "font-sans font-semibold tracking-[0.12em] uppercase" },
];

const LEAVES = [
  { x: 20.5, y: 8.5, r: -38 },
  { x: 14.5, y: 15, r: -16 },
  { x: 11.5, y: 23, r: 3 },
  { x: 12.5, y: 31, r: 22 },
  { x: 17, y: 38.5, r: 44 },
];

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 48"
      className={cn("h-10 w-7 text-mute-soft", flip && "-scale-x-100")}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 5 C 12 13, 8 32, 20 43"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {LEAVES.map((l, i) => (
        <ellipse
          key={i}
          cx={l.x}
          cy={l.y}
          rx="4.4"
          ry="1.8"
          fill="currentColor"
          opacity={0.3 + i * 0.11}
          transform={`rotate(${l.r} ${l.x} ${l.y})`}
        />
      ))}
    </svg>
  );
}

function Award({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <Laurel />
      <div className="text-center">
        <p className="text-[15px] font-semibold leading-tight text-ink">{title}</p>
        <p className="text-cap leading-cap font-medium text-mute">{sub}</p>
      </div>
      <Laurel flip />
    </div>
  );
}

export function Partners() {
  return (
    <section id="devices" className="relative bg-paper px-4 py-20 sm:py-24">
      <Reveal className="mx-auto max-w-[1240px]">
        <h2 className="display mx-auto max-w-[620px] text-center text-[clamp(20px,2.6vw,24px)] leading-label tracking-label text-ink">
          Reads from the wearables you already own — and the iPhone in your pocket.
        </h2>
      </Reveal>

      <Reveal delay={80} className="edge-fade mt-8 overflow-hidden">
        <div className="group flex w-max animate-marquee items-center gap-6 hover:[animation-play-state:paused]">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-6 pr-6" aria-hidden={dup === 1}>
              {WORDMARK_STYLES.map((w) => (
                <span
                  key={w.name + dup}
                  className={cn(
                    "shrink-0 select-none whitespace-nowrap text-[19px] text-charcoal/85 transition-all duration-300 hover:text-charcoal sm:text-[21px]",
                    w.cls,
                  )}
                >
                  {w.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={140} className="mx-auto mt-16 flex max-w-[760px] flex-col items-center gap-4 sm:mt-20">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Award title="Apple Design Award" sub="Nominee · 2025" />
          <Award title="Best Health App" sub="App Store Editors · 2025" />
        </div>

        <h2 className="display mt-6 text-center text-[clamp(34px,6.6vw,64px)] leading-[0.95] text-ink">
          Less noise. <span className="text-mute/80">One clear</span>
          <br />
          read on your body.
        </h2>
        <p className="max-w-[560px] text-center text-[17px] leading-[1.4] text-mute sm:text-body">
          Ziggner keeps the raw data where it belongs — in the trends tab. What you see at 6am is a single
          sentence you can act on.
        </p>
      </Reveal>
    </section>
  );
}
