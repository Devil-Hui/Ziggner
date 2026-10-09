import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { Activity } from "lucide-react";
import { BOARD, RANGES, type RangeKey } from "../lib/data";
import { Reveal, useInView } from "../lib/motion";
import { ActivityRings, Delta } from "./viz";
import { cn } from "../utils/cn";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip);

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const GRID = "rgba(255,255,255,0.07)";
const TICK = "rgba(255,255,255,0.45)";

function baseOptions(yTitle?: string): ChartOptions<"line" | "bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: "easeOutCubic" },
    interaction: { mode: "index" as const, intersect: false },
    layout: { padding: { top: 6, bottom: 0, left: 2, right: 2 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(255,255,255,0.96)",
        titleColor: "#222326",
        bodyColor: "#747679",
        borderColor: "rgba(31,32,37,0.08)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 12,
        displayColors: true,
        boxWidth: 6,
        boxHeight: 6,
        usePointStyle: true,
        titleFont: { family: MONO, size: 11 },
        bodyFont: { family: MONO, size: 11 },
      },
    },
    scales: {
      x: {
        grid: { color: GRID, drawTicks: false },
        border: { display: false },
        ticks: { color: TICK, font: { family: MONO, size: 10 }, padding: 6 },
      },
      y: {
        grid: { color: GRID, drawTicks: false },
        border: { display: false },
        ticks: {
          color: TICK,
          font: { family: MONO, size: 10 },
          maxTicksLimit: 4,
          callback: (v) => (yTitle ? `${v}` : v),
        },
      },
    },
  } as ChartOptions<"line" | "bar">;
}

function Tile({
  label,
  value,
  unit,
  delta,
  tone,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  tone: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/tile rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 transition-all duration-500 hover:border-white/15 hover:bg-white/[0.07]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
        <p className="text-cap font-medium uppercase tracking-[0.14em] text-white/45">{label}</p>
      </div>
      <p className="num mt-3 text-[30px] font-semibold leading-none text-white sm:text-[34px]">
        {value}
        {unit && <span className="ml-1 text-[13px] font-medium text-white/45">{unit}</span>}
      </p>
      {delta !== undefined && (
        <div className="mt-2">
          <Delta value={delta} />
        </div>
      )}
    </div>
  );
}

export function Board() {
  const [range, setRange] = useState<RangeKey>("day");
  const board = BOARD[range];
  const { ref, inView } = useInView<HTMLDivElement>(0.2);

  const hrvLine = useMemo<ChartData<"line">>(
    () => ({
      labels: board.labels,
      datasets: [
        {
          label: "HRV (ms)",
          data: board.hrv,
          borderColor: "#31ce01",
          borderWidth: 2,
          tension: 0.42,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#31ce01",
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const area = chart.chartArea;
            if (!area) return "rgba(49,206,1,0.16)";
            const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, "rgba(49,206,1,0.34)");
            g.addColorStop(1, "rgba(49,206,1,0)");
            return g;
          },
        },
        {
          label: "Resting HR",
          data: board.rhr,
          borderColor: "#ffab94",
          borderWidth: 1.6,
          borderDash: [4, 4],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
        },
      ],
    }),
    [board],
  );

  const sleepBars = useMemo<ChartData<"bar">>(() => {
    const mk = (label: string, data: number[], color: string) => ({
      label,
      data,
      backgroundColor: color,
      borderRadius: 5,
      borderSkipped: false as const,
      barPercentage: 0.62,
      categoryPercentage: 0.72,
    });
    return {
      labels: board.labels,
      datasets: [
        mk("Awake", board.sleep.awake, "rgba(255,255,255,0.22)"),
        mk("Core", board.sleep.core, "#415eee"),
        mk("REM", board.sleep.rem, "#b9a6ff"),
        mk("Deep", board.sleep.deep, "#7f63e8"),
      ],
    };
  }, [board]);

  return (
    <section id="board" className="relative bg-paper px-3 pb-20 pt-4 sm:px-4 sm:pb-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-cap font-semibold uppercase tracking-[0.2em] text-mute">
              <Activity className="h-3.5 w-3.5 text-metric" strokeWidth={2.4} />
              The morning board
            </p>
            <h2 className="display mt-4 max-w-[620px] text-[clamp(32px,5.2vw,56px)]">
              A dashboard that glows, not shouts.
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-pill bg-cloud p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={cn(
                  "rounded-pill px-4 py-2 text-nav font-medium transition-all duration-300",
                  range === r.key
                    ? "bg-charcoal text-cloud shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]"
                    : "text-mute hover:text-ink",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div ref={ref} className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* glowing device panel */}
          <Reveal className="lg:col-span-8">
            <div
              className="relative h-full overflow-hidden rounded-4xl border border-white/10 p-5 sm:p-6"
              style={{ background: "linear-gradient(160deg,#24262d 0%,#191a1f 46%,#131418 100%)" }}
            >
              <div
                className="pointer-events-none absolute -left-10 -top-24 h-64 w-72 animate-breathe rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle,rgba(49,206,1,0.32),transparent 68%)" }}
              />
              <div
                className="pointer-events-none absolute -bottom-32 right-0 h-72 w-96 animate-breathe rounded-full blur-3xl [animation-delay:-3s]"
                style={{ background: "radial-gradient(circle,rgba(65,94,238,0.34),transparent 70%)" }}
              />

              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-recovery/70" />
                    <span className="relative h-2 w-2 rounded-full bg-recovery" />
                  </span>
                  <p className="num text-[12px] text-white/70">{RANGES.find((r) => r.key === range)?.note}</p>
                </div>
                <p className="text-cap font-semibold uppercase tracking-[0.2em] text-white/40">
                  Ziggner OS · watch relay
                </p>
              </div>

              <div className="relative mt-5 grid grid-cols-1 items-center gap-5 sm:grid-cols-[168px_1fr]">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <ActivityRings
                      values={{ move: board.rings.move, sleep: board.rings.sleep, heart: board.rings.heart }}
                      size={148}
                      gap={5}
                      active={inView}
                      glow
                    />
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <p className="num text-[36px] font-semibold leading-none text-white">
                          {board.scores.readiness}
                        </p>
                        <p className="text-cap font-medium uppercase tracking-[0.18em] text-white/45">
                          readiness
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="text-[13px] font-medium leading-[1.35] text-white/80">
                      {range === "day"
                        ? "Ready for an easy day."
                        : range === "week"
                          ? "Trend is climbing."
                          : "Five-week high."}
                    </p>
                    <div className="mt-2">
                      <Delta value={board.deltas.readiness} />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.07] bg-black/25 p-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-cap font-semibold uppercase tracking-[0.16em] text-white/45">
                      HRV vs resting HR
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-cap text-white/55">
                        <i className="h-[2px] w-3 rounded bg-recovery" /> HRV
                      </span>
                      <span className="flex items-center gap-1.5 text-cap text-white/55">
                        <i className="h-[2px] w-3 rounded bg-coral" /> RHR
                      </span>
                    </div>
                  </div>
                  <div className="h-[132px] sm:h-[150px]">
                    <Line data={hrvLine} options={baseOptions() as ChartOptions<"line">} />
                  </div>
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-4 lg:grid-cols-[1.15fr_1fr]">
                <div className="rounded-3xl border border-white/[0.07] bg-black/25 p-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-cap font-semibold uppercase tracking-[0.16em] text-white/45">
                      Sleep architecture
                    </p>
                    <p className="num text-cap text-white/45">hours</p>
                  </div>
                  <div className="h-[128px] sm:h-[140px]">
                    <Bar data={sleepBars} options={baseOptions() as ChartOptions<"bar">} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Tile
                    label="Body battery"
                    value={`${board.scores.battery}`}
                    unit="%"
                    delta={board.deltas.sleepScore}
                    tone="#31ce01"
                  />
                  <Tile
                    label="HRV avg"
                    value={`${board.scores.hrv}`}
                    unit="ms"
                    delta={board.deltas.hrv}
                    tone="#b9a6ff"
                  />
                  <Tile
                    label="Resting HR"
                    value={`${board.scores.rhr}`}
                    unit="bpm"
                    delta={board.deltas.rhr}
                    tone="#ffab94"
                  />
                  <Tile
                    label="Respiration"
                    value={board.scores.breathe.toFixed(1)}
                    unit="/min"
                    tone="#415eee"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* journal column */}
          <Reveal delay={120} className="lg:col-span-4">
            <div className="flex h-full flex-col rounded-4xl bg-cloud p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="display text-[24px] leading-none tracking-label text-ink">Today's log</h3>
                <p className="num text-cap text-mute">5 entries</p>
              </div>
              <ol className="mt-5 flex-1 space-y-4">
                {board.journal.map((j, i) => (
                  <li
                    key={j.title + range}
                    className="reveal is-in group relative pl-6"
                    style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
                  >
                    <span
                      className="absolute left-0 top-[6px] h-2.5 w-2.5 rounded-full ring-4 ring-cloud transition-transform duration-300 group-hover:scale-125"
                      style={{
                        background:
                          j.tone === "recovery"
                            ? "#31ce01"
                            : j.tone === "metric"
                              ? "#415eee"
                              : j.tone === "lilac"
                                ? "#b9a6ff"
                                : "#ffab94",
                      }}
                    />
                    {i < board.journal.length - 1 && (
                      <span className="absolute left-[4px] top-[24px] h-[calc(100%-6px)] w-px bg-cloud-line" />
                    )}
                    <div className="flex items-center gap-2">
                      <p className="num text-cap font-medium text-mute-soft">{j.time}</p>
                      <p className="text-cap font-semibold uppercase tracking-[0.14em] text-mute">{j.tag}</p>
                    </div>
                    <p className="mt-1 text-[15px] font-semibold leading-tight text-ink">{j.title}</p>
                    <p className="mt-1 text-[13px] leading-[1.45] text-mute">{j.body}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-3xl bg-paper p-4 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
                <p className="text-[13px] leading-[1.45] text-ink">
                  <span className="font-semibold">Ziggner's note:</span>{" "}
                  {range === "day"
                    ? "Sleep debt is cleared. Protect tonight's bedtime and the readiness curve holds."
                    : range === "week"
                      ? "Two hard sessions, two restorative nights. Keep the ratio at 1:3 through the weekend."
                      : "Four straight weeks above your baseline. Time to raise the ceiling with a new block."}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
