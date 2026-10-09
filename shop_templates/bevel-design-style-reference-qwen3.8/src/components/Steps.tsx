import { useState } from "react";
import { Watch, BedDouble, Sunrise } from "lucide-react";
import { Reveal } from "../lib/motion";
import { cn } from "../utils/cn";

const STEPS = [
  {
    n: "01",
    icon: Watch,
    title: "Pair once, on the wrist",
    copy:
      "Bevel reads the sensors Apple already trusts: optical HR, wrist temp, blood-oxygen spot checks and motion. No account, no cloud sign-up, no wearable to buy.",
    meta: "2 min",
  },
  {
    n: "02",
    icon: BedDouble,
    title: "Sleep in it for fourteen nights",
    copy:
      "Two weeks builds a personal HRV and temperature band. Until then Bevel shows the raw series and says plainly that it is still learning you.",
    meta: "14 nights",
  },
  {
    n: "03",
    icon: Sunrise,
    title: "Wake to one sentence",
    copy:
      "From day fifteen, the watch taps once at 06:00 with a readiness score, the reason behind it, and the session you should actually do.",
    meta: "Daily 06:00",
  },
];

export function Steps() {
  const [active, setActive] = useState(0);
  return (
    <section className="bg-paper px-4 py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-cap font-semibold uppercase tracking-[0.2em] text-mute">How it starts</p>
          <h2 className="display mt-4 text-[clamp(32px,5vw,56px)]">
            Three nights
            <br />
            <span className="text-mute/80">before it's honest.</span>
          </h2>
          <p className="mt-5 max-w-[380px] text-[17px] leading-[1.45] text-mute">
            Most health apps guess for a month. Bevel refuses to score you until it has a baseline you earned —
            and it tells you exactly how far away that is.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-pill bg-cloud py-2 pl-2 pr-5">
            <span className="num grid h-9 w-9 place-items-center rounded-full bg-charcoal text-[11px] font-semibold text-cloud">
              14
            </span>
            <p className="text-[13px] font-medium text-ink">nights to a personal baseline</p>
          </div>
        </Reveal>

        <div className="space-y-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className={cn(
                  "flex w-full items-start gap-5 rounded-3xl p-6 text-left transition-all duration-500",
                  active === i ? "bg-cloud" : "bg-cloud-soft/60 hover:bg-cloud-soft",
                )}
              >
                <span
                  className={cn(
                    "num mt-0.5 text-[13px] font-semibold transition-colors duration-500",
                    active === i ? "text-metric" : "text-mute-soft",
                  )}
                >
                  {s.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <s.icon
                      className={cn(
                        "h-4 w-4 transition-colors duration-500",
                        active === i ? "text-ink" : "text-mute",
                      )}
                      strokeWidth={2}
                    />
                    <span className="display text-[clamp(22px,2.4vw,28px)] leading-tight">{s.title}</span>
                  </span>
                  <span className="mt-3 block text-[15px] leading-[1.5] text-mute sm:text-[16px]">{s.copy}</span>
                </span>
                <span className="num hidden shrink-0 rounded-full bg-paper px-3 py-1 text-[11px] font-medium text-mute sm:block">
                  {s.meta}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
