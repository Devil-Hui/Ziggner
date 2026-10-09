import { AppleLogo, RingStack, Star } from "./Icons";

function Chip({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-white px-3 py-1.5">
      <span className="flex items-center gap-1.5 text-[11px] text-body-gray">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-[11px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function Iphone() {
  return (
    <div className="relative w-[272px] rounded-[52px] bg-gradient-to-b from-[#3a3b41] to-[#17181c] p-[10px] shadow-[0_50px_80px_-30px_rgba(31,32,37,0.55)]">
      {/* side button */}
      <span className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l bg-[#2a2b30]" />
      <span className="absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-[#2a2b30]" />
      <span className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#2a2b30]" />

      <div className="relative h-[580px] overflow-hidden rounded-[42px] bg-white">
        {/* status bar */}
        <div className="flex items-center justify-between px-7 pt-3 text-[12px] font-semibold text-ink">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-[24px] w-[84px] -translate-x-1/2 rounded-full bg-black" />
          <span className="text-[10px]">●●● 100%</span>
        </div>

        <div className="px-5 pt-9">
          <p className="text-[12px] text-body-gray">Tuesday, June 10</p>
          <h3 className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.78px] text-ink">
            Good morning, Maya
          </h3>
        </div>

        {/* readiness */}
        <div className="mx-4 mt-5 flex items-center gap-4 rounded-[24px] bg-cloud-card p-4">
          <div className="relative shrink-0">
            <RingStack
              size={104}
              stroke={11}
              gap={5}
              rings={[
                { value: 0.86, color: "#31ce01" },
                { value: 0.7, color: "#415eee" },
              ]}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-semibold leading-none tracking-[-0.8px] text-ink">86</span>
              <span className="mt-1 text-[10px] text-body-gray">Readiness</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Chip color="#31ce01" label="HRV" value="62 ms" />
            <Chip color="#b9a6ff" label="Sleep" value="7h 42m" />
            <Chip color="#415eee" label="Strain" value="9.4" />
          </div>
        </div>

        {/* recovery curve */}
        <div className="mx-4 mt-4 rounded-[24px] bg-cloud-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-ink">Recovery curve</span>
            <span className="text-[11px] text-body-gray">Today</span>
          </div>
          <svg viewBox="0 0 240 90" className="mt-3 h-[90px] w-full" aria-hidden="true">
            <defs>
              <linearGradient id="hero-wash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffab94" stopOpacity="0.6" />
                <stop offset="1" stopColor="#ffab94" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 60 C 30 50, 50 30, 80 40 S 130 70, 160 45 S 210 15, 240 25 L240 90 L0 90Z"
              fill="url(#hero-wash)"
            />
            <path
              d="M0 60 C 30 50, 50 30, 80 40 S 130 70, 160 45 S 210 15, 240 25"
              fill="none"
              stroke="#415eee"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* focus */}
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-[20px] bg-charcoal p-4 text-cloud-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-gold text-[14px] text-ink">
            ▲
          </span>
          <div>
            <p className="text-[11px] text-cloud-card/70">Today&apos;s focus</p>
            <p className="text-[14px] font-medium">Zone 2 · 40 min easy run</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Watch() {
  return (
    <div className="relative w-[168px] rounded-[48px] bg-gradient-to-b from-[#3a3b41] to-[#17181c] p-[9px] shadow-[0_40px_60px_-24px_rgba(31,32,37,0.6)]">
      {/* straps */}
      <div className="absolute -top-14 left-1/2 h-16 w-[110px] -translate-x-1/2 rounded-t-[28px] bg-[#2a2b30]" />
      <div className="absolute -bottom-14 left-1/2 h-16 w-[110px] -translate-x-1/2 rounded-b-[28px] bg-[#2a2b30]" />

      <div className="relative flex h-[200px] flex-col items-center justify-center overflow-hidden rounded-[40px] bg-[#0f1013]">
        <RingStack
          size={136}
          stroke={13}
          gap={5}
          track="#23242a"
          rings={[
            { value: 0.82, color: "#ffab94" },
            { value: 0.64, color: "#31ce01" },
            { value: 0.45, color: "#415eee" },
          ]}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-semibold leading-none tracking-[-0.6px] text-cloud-card">9.4</span>
          <span className="mt-1 text-[10px] text-cloud-card/60">Load</span>
        </div>
      </div>
    </div>
  );
}

function DeviceComposition() {
  return (
    <div className="relative mx-auto h-[620px] w-full max-w-[600px] origin-top scale-90 sm:scale-100">
      <div className="absolute left-1/2 top-[80px] h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(65,94,238,0.22),transparent_65%)] blur-2xl" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <Iphone />
      </div>
      <div className="absolute bottom-[70px] left-[calc(50%+60px)] z-10 -rotate-6">
        <Watch />
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-[40px] bg-[linear-gradient(#d2e5ff,#fff9ee)] px-6 pb-16 pt-36 text-center sm:px-10">
        <h1 className="mx-auto max-w-[900px] text-[48px] font-semibold leading-[1] tracking-[-1.9px] text-ink sm:text-[64px] sm:tracking-[-1.92px] lg:text-[80px] lg:tracking-[-2.4px]">
          Morning metrics,
          <br className="hidden sm:block" /> in cloudlight.
        </h1>

        <p className="mx-auto mt-8 max-w-[640px] text-[20px] leading-[1.3] text-body-gray sm:text-[24px]">
          Ziggner reads your heart rate, sleep, and recovery each morning and turns them into one calm plan for the day.
        </p>

        <div className="mt-10 flex justify-center">
          <a
            href="#download"
            className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-[16px] font-medium leading-[22.4px] text-cloud-card transition-colors hover:bg-ink"
          >
            <AppleLogo className="h-5 w-5" />
            Download on the App Store
          </a>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 text-[12px] text-body-gray">
          <div className="flex gap-0.5 text-signal-gold">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-3.5 w-3.5" />
            ))}
          </div>
          <span>4.9 rating · 48K App Store reviews</span>
        </div>

        <div className="mt-12">
          <DeviceComposition />
        </div>
      </div>
    </section>
  );
}
