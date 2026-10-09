type IconProps = { className?: string };

export function AppleLogo({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.37 12.41c.02 2.27 1.99 3.03 2.01 3.04-.02.05-.31 1.07-1.03 2.12-.62.9-1.26 1.8-2.28 1.82-1 .02-1.32-.59-2.46-.59-1.15 0-1.5.57-2.45.61-.98.04-1.73-.97-2.36-1.87-1.28-1.860-2.27-5.25-.95-7.54.66-1.14 1.83-1.86 3.1-1.88.97-.02 1.88.65 2.46.65.59 0 1.7-.8 2.87-.68.49.02 1.86.2 2.74 1.49-.07.05-1.64.96-1.62 2.85M14.6 4.62c.52-.63.87-1.5.77-2.37-.75.03-1.66.5-2.2 1.13-.48.56-.9 1.45-.79 2.31.84.07 1.7-.43 2.22-1.07" />
    </svg>
  );
}

export function Star({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5l2.94 6.02 6.56.95-4.75 4.63 1.12 6.54L12 17.56l-5.87 3.08 1.12-6.54-4.75-4.63 6.56-.95z" />
    </svg>
  );
}

export function BevelMark({ className = "h-7 w-7" }: IconProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-charcoal ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" aria-hidden="true">
        <path d="M4.5 17a7.5 7.5 0 0 1 15 0" stroke="#ebf0f8" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="17" r="2.2" fill="#ffab94" />
      </svg>
    </span>
  );
}

type RingDatum = { value: number; color: string };

/** Concentric progress rings (Apple-style activity rings). */
export function RingStack({
  rings,
  size = 140,
  stroke = 12,
  gap = 6,
  track = "#ebf0f8",
}: {
  rings: RingDatum[];
  size?: number;
  stroke?: number;
  gap?: number;
  track?: string;
}) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      {rings.map((ring, i) => {
        const r = size / 2 - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - ring.value)}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Single olive-style laurel branch; set `flip` for the mirrored right-hand side. */
export function Laurel({ className = "h-16 w-8", flip = false }: IconProps & { flip?: boolean }) {
  const p0 = { x: 24, y: 76 };
  const p1 = { x: 2, y: 40 };
  const p2 = { x: 24, y: 4 };
  const point = (t: number) => ({
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
  });
  const tangent = (t: number) => ({
    dx: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    dy: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  });
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const t = 0.12 + i * 0.12;
    const { x, y } = point(t);
    const { dx, dy } = tangent(t);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const rot = angle + (i % 2 === 0 ? -40 : 40) - 90;
    return { x, y, rot };
  });

  return (
    <svg viewBox="0 0 30 80" fill="currentColor" className={className} aria-hidden="true">
      <g transform={flip ? "translate(30 0) scale(-1 1)" : undefined}>
        <path
          d={`M${p0.x} ${p0.y} Q${p1.x} ${p1.y} ${p2.x} ${p2.y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {leaves.map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx={2.6} ry={6} transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
        ))}
      </g>
    </svg>
  );
}
