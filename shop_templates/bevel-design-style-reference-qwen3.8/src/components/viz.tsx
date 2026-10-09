import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

export type Tone = "recovery" | "metric" | "lilac" | "coral" | "gold";

export const TONE_HEX: Record<Tone, string> = {
  recovery: "#31ce01",
  metric: "#415eee",
  lilac: "#b9a6ff",
  coral: "#ffab94",
  gold: "#ffca00",
};

export const TONE_TEXT: Record<Tone, string> = {
  recovery: "text-recovery",
  metric: "text-metric",
  lilac: "text-[#7f63e8]",
  coral: "text-[#e0704d]",
  gold: "text-gold",
};

/** Single circular progress arc. Draws itself in when `active`. */
export function Ring({
  progress,
  size = 120,
  stroke = 10,
  color = "#31ce01",
  track = "rgba(31,32,37,0.10)",
  active = true,
  delay = 0,
  cap = "round",
  className,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  active?: boolean;
  delay?: number;
  cap?: "round" | "butt";
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(1.15, progress));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0 -rotate-90", className)}
      aria-hidden="true"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap={cap}
        strokeDasharray={c}
        strokeDashoffset={active ? c * (1 - value) : c}
        style={{
          transition: `stroke-dashoffset 1.5s cubic-bezier(.22,1,.36,1) ${delay}ms`,
          filter: `drop-shadow(0 0 ${stroke / 1.5}px ${color}55)`,
        }}
      />
    </svg>
  );
}

/** Watch-style triple rings, colours reserved for data categories only. */
export function ActivityRings({
  values,
  size = 132,
  gap = 4,
  active = true,
  glow = false,
}: {
  values: { move: number; sleep: number; heart: number };
  size?: number;
  gap?: number;
  active?: boolean;
  glow?: boolean;
}) {
  const ringStroke = Math.max(6, Math.round(size * 0.085));
  const order: { key: keyof typeof values; tone: Tone }[] = [
    { key: "move", tone: "recovery" },
    { key: "sleep", tone: "lilac" },
    { key: "heart", tone: "coral" },
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {order.map((ring, i) => {
        const inset = i * (ringStroke + gap);
        const d = size - inset * 2;
        const r = (d - ringStroke) / 2;
        const c = 2 * Math.PI * r;
        const v = Math.max(0, Math.min(1, values[ring.key]));
        const color = TONE_HEX[ring.tone];
        return (
          <g key={ring.key}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeOpacity={glow ? 0.28 : 0.14}
              strokeWidth={ringStroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={active ? c * (1 - v) : c}
              style={{
                transition: `stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1) ${i * 140}ms`,
                filter: glow
                  ? `drop-shadow(0 0 6px ${color}aa)`
                  : `drop-shadow(0 2px 6px ${color}44)`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Small bar cluster (steps, load, sleep hours). */
export function Bars({
  values,
  max,
  active,
  color = "#222326",
  highlight,
  className,
  rounded = 3,
}: {
  values: number[];
  max?: number;
  active: boolean;
  color?: string;
  highlight?: number;
  className?: string;
  rounded?: number;
}) {
  const peak = max ?? Math.max(...values, 1);
  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1"
          style={{
            height: `${active ? Math.max(6, (v / peak) * 100) : 6}%`,
            background: highlight === i ? TONE_HEX.metric : color,
            opacity: highlight === undefined || highlight === i ? 1 : 0.22,
            borderRadius: rounded,
            transition: `height .9s cubic-bezier(.22,1,.36,1) ${i * 55}ms, opacity .4s ease`,
          }}
        />
      ))}
    </div>
  );
}

export function Delta({ value, unit }: { value: number; unit?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-medium",
        up ? "bg-recovery/12 text-recovery" : "bg-coral/25 text-[#d3623f]",
      )}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={up ? "" : "rotate-180"}>
        <path d="M4 1l3 5H1l3-5z" fill="currentColor" />
      </svg>
      {up ? "+" : ""}
      {value}
      {unit}
    </span>
  );
}

/** Deterministic decorative QR block for the download card. */
export function QrCode({ size = 132, className }: { size?: number; className?: string }) {
  const n = 25;
  const cells: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  let seed = 20250306;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) cells[y][x] = rnd() > 0.52;

  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[oy + y][ox + x] = edge || core;
      }
    for (let y = -1; y < 8; y++)
      for (let x = -1; x < 8; x++) {
        const yy = oy + y;
        const xx = ox + x;
        if (yy < 0 || xx < 0 || yy >= n || xx >= n) continue;
        if (x === -1 || y === -1 || x === 7 || y === 7) cells[yy][xx] = false;
      }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  // quiet centre for the logo
  for (let y = 9; y < 16; y++) for (let x = 9; x < 16; x++) cells[y][x] = false;

  const unit = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label="Download QR code">
      <rect width={size} height={size} fill="#ffffff" rx={unit} />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect key={`${x}-${y}`} x={x * unit} y={y * unit} width={unit} height={unit} fill="#1f2025" />
          ) : null,
        ),
      )}
      <rect
        x={unit * 9.6}
        y={unit * 9.6}
        width={unit * 5.8}
        height={unit * 5.8}
        rx={unit * 1.4}
        fill="#ffffff"
      />
      <rect
        x={unit * 10.6}
        y={unit * 10.6}
        width={unit * 3.8}
        height={unit * 3.8}
        rx={unit}
        fill="#1f2025"
      />
    </svg>
  );
}

/** Heart-rate pulse trace, quietly alive. */
export function PulseTrace({ color = "#31ce01", className }: { color?: string; className?: string }) {
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSeed((s) => (s + 1) % 6), 1100);
    return () => clearInterval(id);
  }, []);
  const pts = Array.from({ length: 46 }, (_, i) => {
    const spike = (i + seed * 3) % 15;
    const y =
      spike === 6 ? 4 : spike === 7 ? 19 : spike === 5 || spike === 8 ? 12 : 12 + Math.sin(i / 2) * 1.6;
    return `${(i / 45) * 120},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 120 24" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
