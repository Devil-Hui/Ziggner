import type { ReactNode } from "react";
import { RingStack } from "./Icons";

function ReadinessViz() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <RingStack
        size={172}
        stroke={15}
        gap={6}
        rings={[
          { value: 0.86, color: "#31ce01" },
          { value: 0.7, color: "#415eee" },
          { value: 0.56, color: "#ffab94" },
        ]}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[40px] font-semibold leading-none tracking-[-1.2px] text-ink">86</span>
        <span className="mt-1 text-[12px] text-body-gray">+4 vs. avg</span>
      </div>
    </div>
  );
}

function SleepViz() {
  const bars = [40, 62, 55, 80, 70, 96, 64];
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full px-6 py-6" aria-hidden="true">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 34 + 8}
          y={150 - h - 16}
          width={20}
          height={h}
          rx={10}
          fill="#b9a6ff"
          opacity={i === 5 ? 1 : 0.4}
        />
      ))}
      <text x="8" y="146" fontSize="11" fill="#747679">Mon</text>
      <text x="200" y="146" fontSize="11" fill="#747679">Sun</text>
    </svg>
  );
}

function LoadViz() {
  return (
    <svg viewBox="0 0 240 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="load-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffab94" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffab94" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 100 C 30 80, 50 40, 90 60 S 150 120, 180 70 S 220 30, 240 46 L240 150 L0 150Z"
        fill="url(#load-wash)"
      />
      <path
        d="M0 100 C 30 80, 50 40, 90 60 S 150 120, 180 70 S 220 30, 240 46"
        fill="none"
        stroke="#415eee"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const cards: { title: string; body: string; chip: string; viz: ReactNode }[] = [
  {
    title: "Readiness",
    body: "A single morning score blending HRV, resting heart rate, and last night's sleep.",
    chip: "Ready for intensity",
    viz: <ReadinessViz />,
  },
  {
    title: "Sleep",
    body: "Stages, consistency, and debt tracked across the week so you see what actually restores you.",
    chip: "7h 42m average",
    viz: <SleepViz />,
  },
  {
    title: "Load",
    body: "Strain from every workout and walk, balanced against recovery so you train without burning out.",
    chip: "Optimal range",
    viz: <LoadViz />,
  },
];

export default function Features() {
  return (
    <section id="features" className="px-6 py-20">
      <div className="mx-auto max-w-[1080px]">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[24px] font-semibold leading-[0.9] tracking-[-0.24px] text-ink">How it reads you</p>
          <h2 className="mt-6 text-[48px] font-semibold leading-[1] tracking-[-1.9px] text-ink sm:text-[64px] sm:tracking-[-1.92px]">
            Three numbers. One honest morning.
          </h2>
          <p className="mx-auto mt-6 max-w-[640px] text-[24px] leading-[1.3] text-body-gray">
            Ziggner keeps the signal and drops the noise, so every morning opens with a clear read on your body.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="flex flex-col rounded-3xl bg-cloud-card p-8">
              <div className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-2xl bg-white">
                {card.viz}
                <span className="absolute bottom-3 left-3 rounded-full bg-cloud-card px-3 py-1.5 text-[12px] font-medium text-ink">
                  {card.chip}
                </span>
              </div>
              <h3 className="mt-8 text-[40px] font-semibold leading-[40px] tracking-[-1.2px] text-ink">
                {card.title}
              </h3>
              <p className="mt-4 text-[24px] leading-[31.2px] text-body-gray">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
