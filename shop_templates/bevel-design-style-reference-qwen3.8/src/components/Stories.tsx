import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { STORIES, type Story } from "../lib/data";
import { Reveal, useInView } from "../lib/motion";
import { Bars, Ring, TONE_HEX } from "./viz";
import { cn } from "../utils/cn";

function Capture({ story }: { story: Story }) {
  const { tone, metric, metricLabel, caption } = story;
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  return (
    <div ref={ref} className="flex h-full flex-col justify-between bg-paper p-5">
      <div className="flex items-center justify-between">
        <p className="text-cap font-semibold uppercase tracking-[0.16em] text-mute">{story.handle}</p>
        <p className="num text-cap text-mute-soft">06:12</p>
      </div>
      <div className="my-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <Ring progress={0.82} size={84} stroke={9} color={TONE_HEX[tone]} active={inView} />
          <div className="absolute inset-0 grid place-items-center">
            <p className="num whitespace-nowrap text-[13px] font-semibold leading-none text-ink">{metric}</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">{metricLabel}</p>
          <p className="mt-1 text-[15px] font-semibold leading-[1.2] text-ink">
            {tone === "lilac" ? "Best week in 5 months" : "Trending up steadily"}
          </p>
          <Bars
            values={[38, 52, 47, 61, 55, 72, 82]}
            active={inView}
            color="rgba(34,35,38,0.22)"
            highlight={6}
            className="mt-3 h-8"
          />
        </div>
      </div>
      <div className="rounded-[14px] bg-cloud p-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_HEX[tone] }} />
          <p className="text-[11px] font-semibold text-ink">Sleep window shifted 31 min earlier</p>
        </div>
        <p className="mt-1.5 text-[12px] leading-[1.4] text-mute">
          Deep-sleep share climbed from 17% to 23% across the last three nights.
        </p>
      </div>
      <p className="mt-3 line-clamp-3 text-[13px] leading-[1.45] text-mute">{caption}</p>
      <p className="mt-3 flex items-center justify-between border-t border-cloud-line pt-3 text-[12px]">
        <span className="font-semibold text-ink">{story.name}</span>
        <span className="num text-mute-soft">posted {2 + (metric.length % 7)}h ago</span>
      </p>
    </div>
  );
}

function Photo({ story }: { story: Story }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-full w-full overflow-hidden bg-cloud">
      {story.image && (
        <img
          src={story.image}
          alt={`${story.name} — ${story.caption}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-all duration-[1.4s] ease-out group-hover:scale-[1.045]",
            loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-md",
          )}
        />
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: "linear-gradient(180deg,rgba(31,32,37,0) 0%,rgba(31,32,37,0.72) 62%,rgba(31,32,37,0.9) 100%)" }}
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="num inline-flex items-center gap-1.5 rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_HEX[story.tone] }} />
          {story.metric} <span className="font-normal text-white/70">{story.metricLabel}</span>
        </p>
        <p className="line-clamp-1 text-[16px] font-semibold leading-[1.2] text-white">{story.name}</p>
        <p className="mt-1 line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
          {story.handle}
        </p>
        <p className="mt-2 line-clamp-3 text-[12px] leading-[1.4] text-white/70">{story.caption}</p>
      </div>
    </div>
  );
}

export function Stories() {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0 });

  const step = useCallback((dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>("[data-tile]");
    const w = tile ? tile.offsetWidth + 16 : 320;
    const maxScroll = el.scrollWidth - el.clientWidth;
    let next = el.scrollLeft + dir * w;
    if (next > maxScroll - 4) next = dir === 1 ? 0 : maxScroll;
    if (next < 0) next = maxScroll;
    el.scrollTo({ left: next, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => step(1), 4600);
    return () => clearInterval(id);
  }, [paused, step]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const tile = el.querySelector<HTMLElement>("[data-tile]");
      if (!tile) return;
      setIndex(Math.round(el.scrollLeft / (tile.offsetWidth + 16)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const onPointerDown = (e: RPointerEvent) => {
    const el = scroller.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: RPointerEvent) => {
    const el = scroller.current;
    if (!el || !drag.current.active) return;
    el.scrollLeft = drag.current.startLeft - (e.clientX - drag.current.startX);
  };
  const endDrag = (e: RPointerEvent) => {
    const el = scroller.current;
    if (!el) return;
    drag.current.active = false;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    el.scrollTo({ left: Math.round(el.scrollLeft / (el.clientWidth * 0.36)) * (el.clientWidth * 0.36), behavior: "smooth" });
  };

  return (
    <section id="stories" className="relative overflow-hidden bg-paper py-20 sm:py-24">
      <div className="mx-auto max-w-[1240px] px-4">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[620px]">
            <p className="text-cap font-semibold uppercase tracking-[0.2em] text-mute">From the community</p>
            <h2 className="display mt-4 text-[clamp(32px,5.2vw,56px)]">
              Eighty thousand mornings, <span className="text-mute/80">posted out loud.</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              aria-label="Previous stories"
              onClick={() => step(-1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-cloud text-ink transition-all duration-300 hover:bg-charcoal hover:text-cloud active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next stories"
              onClick={() => step(1)}
              className="grid h-11 w-11 place-items-center rounded-full bg-cloud text-ink transition-all duration-300 hover:bg-charcoal hover:text-cloud active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>
      </div>

      <div
        className="edge-fade mt-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={scroller}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="no-bar flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 active:cursor-grabbing sm:px-8"
          style={{ scrollPaddingLeft: "2rem" }}
        >
          {STORIES.map((s, i) => (
            <article
              key={s.name + i}
              data-tile
              className={cn(
                "group relative aspect-[4/5] w-[74vw] shrink-0 snap-center overflow-hidden rounded-2xl shadow-lift transition-all duration-500 sm:w-[300px] lg:w-[322px]",
                index === i ? "ring-1 ring-cloud-line" : "",
              )}
              style={{ background: s.kind === "capture" ? "#ffffff" : "#ebf0f8" }}
            >
              {s.kind === "capture" ? (
                <Capture story={s} />
              ) : (
                <Photo story={s} />
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-1.5">
          {STORIES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === index ? "w-6 bg-charcoal" : "w-1.5 bg-cloud-line",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-cloud px-5 py-4">
          <Quote className="h-4 w-4 shrink-0 text-mute-soft" />
          <p className="max-w-[420px] text-[15px] leading-[1.45] text-mute">
            “I've tried four of these. Ziggner is the first that told me to{" "}
            <span className="font-semibold text-ink">go back to bed</span> — and was right.”
          </p>
          <p className="hidden text-cap font-medium text-mute-soft sm:block">— @runmayarun</p>
        </div>
      </div>
    </section>
  );
}
