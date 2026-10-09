import { useEffect, useState } from "react";
import { Moon, Heart, BatteryCharging, Footprints, Sunrise, ArrowUpRight } from "lucide-react";
import { ActivityRings, Bars, PulseTrace, Ring, TONE_HEX } from "./viz";
import { cn } from "../utils/cn";

/** Heart rate that quietly drifts, like a real sensor feed. */
function useLiveHeartRate(base = 49) {
  const [bpm, setBpm] = useState(base);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setBpm((b) => {
        const next = b + (Math.random() * 4 - 2);
        return Math.round(Math.max(base - 3, Math.min(base + 8, next)));
      });
    }, 2100);
    return () => clearInterval(id);
  }, [base]);
  return bpm;
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 pt-3 text-[10px] font-semibold num",
        dark ? "text-white/85" : "text-ink/70",
      )}
    >
      <span>9:41</span>
      <div className="flex items-center gap-[3px]">
        {[3, 5, 7, 9].map((h, i) => (
          <span
            key={i}
            style={{ height: h, width: 2.5 }}
            className={cn("rounded-[1px]", dark ? "bg-white/80" : "bg-ink/70")}
          />
        ))}
        <span
          className={cn(
            "ml-1 h-[7px] w-[15px] rounded-[2px] p-[1.5px]",
            dark ? "border border-white/60" : "border border-ink/45",
          )}
        >
          <span className={cn("block h-full w-[60%] rounded-[1px]", dark ? "bg-white/85" : "bg-ink/70")} />
        </span>
      </div>
    </div>
  );
}

export function PhoneScreen({ active = true }: { active?: boolean }) {
  const bpm = useLiveHeartRate();
  const rows = [
    { icon: Moon, label: "Sleep", value: "7h 54m", sub: "91", tone: "#b9a6ff" as const },
    { icon: Heart, label: "HRV", value: `${bpm + 12} ms`, sub: "+9", tone: "#ffab94" as const },
    { icon: BatteryCharging, label: "Body battery", value: "74%", sub: "+12", tone: "#31ce01" as const },
    { icon: Footprints, label: "Steps", value: "1,284", sub: "early", tone: "#415eee" as const },
  ] as const;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left">
      <div
        className="absolute inset-x-0 top-0 h-[230px]"
        style={{ background: "linear-gradient(180deg,#d2e5ff 0%,#eef4ff 55%,rgba(255,255,255,0) 100%)" }}
      />
      <div className="relative">
        <StatusBar />
        <div className="px-5 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
            Tue 6 Mar · Morning brief
          </p>
          <h3 className="display mt-1 text-[24px] leading-[0.95] text-ink">Good morning, Maya</h3>
        </div>

        {/* readiness hero inside the device */}
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-[22px] bg-white/80 p-3 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_30px_-18px_rgba(31,32,37,0.45)] ring-1 ring-white">
          <div className="relative">
            <Ring progress={0.87} size={78} stroke={8} color={TONE_HEX.recovery} active={active} />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="num text-[21px] font-semibold leading-none text-ink">87</p>
                <p className="text-[7px] font-medium uppercase tracking-[0.16em] text-mute">ready</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Sunrise className="h-3 w-3 text-metric" />
              <p className="text-[10px] font-semibold text-ink">Easy day suggested</p>
            </div>
            <p className="mt-1 text-[10px] leading-[1.35] text-mute">
              Zone 2 for 40 min. Leg load is high from Tuesday.
            </p>
            <PulseTrace className="mt-2 h-4 w-full" color={TONE_HEX.coral} />
          </div>
        </div>

        {/* metric rows */}
        <div className="mt-3 space-y-[7px] px-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-2.5 rounded-[16px] bg-cloud px-3 py-2 transition-colors duration-300 hover:bg-[#e2e9f7]"
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[9px]"
                style={{ background: `${r.tone}22`, color: r.tone }}
              >
                <r.icon className="h-3 w-3" strokeWidth={2.4} />
              </span>
              <p className="flex-1 text-[11px] font-medium text-ink">{r.label}</p>
              <p className="num text-[11px] font-semibold text-ink">{r.value}</p>
              <span className="num text-[9px] font-semibold" style={{ color: r.tone }}>
                {r.sub}
              </span>
            </div>
          ))}
        </div>

        {/* weekly bars */}
        <div className="mx-3 mt-3 rounded-[18px] bg-cloud p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold text-ink">Training load</p>
            <p className="num text-[9px] text-mute">7 days</p>
          </div>
          <Bars
            values={[42, 58, 35, 74, 51, 66, 48]}
            active={active}
            color="#222326"
            highlight={3}
            className="mt-2 h-[34px]"
          />
          <div className="mt-1.5 flex justify-between text-[8px] text-mute-soft num">
            {["F", "S", "S", "M", "T", "W", "T"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-around border-t border-cloud-line px-4 py-2.5">
        {["Today", "Journal", "Trends", "You"].map((t, i) => (
          <span key={t} className={cn("text-[9px] font-semibold", i === 0 ? "text-ink" : "text-mute-soft")}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WatchScreen({ active = true }: { active?: boolean }) {
  const bpm = useLiveHeartRate(52);
  const [s, setS] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setS((v) => (v + 1) % 60), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#08090d] px-2 text-center">
      <div
        className="pointer-events-none absolute inset-0 animate-breathe"
        style={{ background: "radial-gradient(circle at 50% 30%, rgba(65,94,238,0.35), transparent 62%)" }}
      />
      <div className="relative flex w-full items-center justify-between px-3 pt-2">
        <span className="num text-[8px] font-semibold text-white/70">06:12</span>
        <span className="h-1 w-1 rounded-full bg-recovery" style={{ opacity: 0.5 + Math.abs(Math.sin((s / 60) * Math.PI)) * 0.5 }} />
      </div>
      <div className="relative my-1">
        <ActivityRings
          values={{ move: 0.42, sleep: 0.94, heart: 0.71 }}
          size={92}
          gap={3}
          active={active}
          glow
        />
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <p className="num text-[17px] font-semibold leading-none text-white">{bpm}</p>
            <p className="text-[6px] font-semibold uppercase tracking-[0.2em] text-white/50">bpm</p>
          </div>
        </div>
      </div>
      <div className="relative flex w-full items-center justify-between px-3 pb-2 text-white/85">
        <span className="num text-[8px]">87 RDY</span>
        <span className="num text-[8px] text-lilac">61 HRV</span>
      </div>
    </div>
  );
}

/** Overlapping iPhone + Apple Watch render, built as real layered surfaces. */
export function DeviceStack({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 260);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={cn("relative mx-auto w-full max-w-[560px]", className)}>
      {/* soft ground light */}
      <div
        className="absolute inset-x-6 bottom-2 h-24 rounded-[50%] blur-2xl"
        style={{ background: "radial-gradient(ellipse,rgba(31,32,37,0.22),transparent 68%)" }}
      />

      {/* iPhone */}
      <div className="relative mx-auto w-[266px] animate-float-slow sm:w-[292px]">
        <div className="rounded-[54px] bg-charcoal p-[9px] shadow-device">
          <div className="relative aspect-[266/566] w-full overflow-hidden rounded-[46px] bg-white">
            <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-charcoal" />
            <PhoneScreen active={mounted} />
          </div>
        </div>
        {/* glass sheen */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[54px]">
          <div
            className="absolute -inset-y-6 -left-1/3 w-1/3 rotate-12 animate-sheen"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)" }}
          />
        </div>
      </div>

      {/* Apple Watch */}
      <div className="absolute -bottom-4 right-0 w-[130px] animate-float sm:right-2 sm:w-[146px]">
        <div className="absolute -top-9 left-1/2 h-12 w-[86px] -translate-x-1/2 rounded-t-[26px] bg-[#2a2b31]" />
        <div className="absolute -bottom-9 left-1/2 h-12 w-[86px] -translate-x-1/2 rounded-b-[26px] bg-[#2a2b31]" />
        <div className="relative rounded-[38px] bg-[linear-gradient(160deg,#4a4b53,#1f2025_58%)] p-[7px] shadow-device">
          <div className="relative aspect-[130/150] w-full overflow-hidden rounded-[32px] bg-[#08090d]">
            <WatchScreen active={mounted} />
          </div>
          <div className="absolute right-[-5px] top-[30%] h-8 w-[5px] rounded-full bg-[#5a5b64]" />
          <div className="absolute right-[-4px] top-[52%] h-5 w-[4px] rounded-full bg-[#4a4b53]" />
        </div>
      </div>

      {/* floating app captures */}
      <div className="absolute -left-2 top-16 hidden w-[168px] rotate-[-6deg] rounded-[20px] bg-white p-3 shadow-lift transition-transform duration-500 hover:-translate-y-1 sm:block lg:-left-16">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-ink">Sleep score</p>
          <ArrowUpRight className="h-3 w-3 text-mute-soft" />
        </div>
        <div className="mt-1 flex items-end gap-2">
          <p className="num text-[30px] font-semibold leading-none text-ink">91</p>
          <p className="num mb-1 text-[10px] text-recovery">+3 vs avg</p>
        </div>
        <Bars values={[62, 70, 58, 74, 81, 76, 91]} active={mounted} color="#b9a6ff" className="mt-2 h-7" />
      </div>

      <div className="absolute -right-2 top-2 hidden w-[150px] rotate-[5deg] rounded-[20px] bg-white/95 p-3 shadow-lift backdrop-blur transition-transform duration-500 hover:-translate-y-1 lg:block lg:-right-14">
        <div className="flex items-center gap-2">
          <Ring progress={0.74} size={38} stroke={5} color={TONE_HEX.recovery} active={mounted} />
          <div>
            <p className="text-[10px] font-semibold leading-tight text-ink">Recovery</p>
            <p className="num text-[9px] text-mute">74% · rising</p>
          </div>
        </div>
        <PulseTrace className="mt-2 h-4 w-full" color={TONE_HEX.recovery} />
      </div>
    </div>
  );
}
