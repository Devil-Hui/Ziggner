import { ArrowUp } from "lucide-react";
import { FOOTER_GROUPS } from "../lib/data";
import { Reveal } from "../lib/motion";

const SOCIALS = ["Instagram", "Threads", "Strava", "RSS"];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-paper px-4 pb-10 pt-20 sm:pt-28">
      {/* oversized wordmark as ambient type */}
      <div className="pointer-events-none select-none overflow-hidden">
        <p
          className="display whitespace-nowrap text-center text-[clamp(80px,22vw,300px)] leading-[0.8] text-transparent"
          style={{ WebkitTextStroke: "1px rgba(31,32,37,0.10)" }}
        >
          Bevel
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-[1240px]">
        <Reveal className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative grid h-7 w-7 place-items-center rounded-[9px] bg-charcoal">
                <span className="absolute left-[9px] top-[9px] h-[13px] w-[13px] rounded-[4px] border-[2.5px] border-recovery" />
              </span>
              <span className="text-brand font-medium tracking-brand text-ink">Bevel</span>
            </div>
            <p className="mt-4 max-w-[280px] text-[14px] leading-[1.5] text-mute">
              Morning metrics for people who wear a watch to sleep. Built in Bristol, tested on 80,000
              sunrises.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s}
                  href="#top"
                  className="rounded-pill border border-cloud-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-300 hover:border-charcoal hover:bg-charcoal hover:text-cloud"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {FOOTER_GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="text-cap font-semibold uppercase tracking-[0.18em] text-mute-soft">{g.title}</p>
              <ul className="mt-4 space-y-4">
                {g.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#top"
                      className="link-underline inline-block text-brand leading-brand font-medium text-ink transition-colors duration-300 hover:text-metric"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </Reveal>

        <div className="mt-16 flex flex-col gap-4 border-t border-cloud-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-mute">
            © 2026 Bevel Health Ltd · Not a medical device. Nothing here diagnoses anything.
          </p>
          <div className="flex items-center gap-6">
            <a href="#top" className="text-[13px] font-medium text-mute transition-colors hover:text-ink">
              Privacy
            </a>
            <a href="#top" className="text-[13px] font-medium text-mute transition-colors hover:text-ink">
              Terms
            </a>
            <a
              href="#top"
              className="inline-flex items-center gap-2 rounded-pill bg-cloud px-4 py-2 text-[13px] font-medium text-ink transition-colors duration-300 hover:bg-charcoal hover:text-cloud"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Back to morning
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
