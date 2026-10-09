import { Star, QrCode as QrIcon } from "lucide-react";
import { ApplePill, RatingStrip } from "./ApplePill";
import { QrCode } from "./viz";
import { Reveal } from "../lib/motion";

const PERKS = [
  "Free 14-day trial, no card",
  "watchOS 10+ and iOS 18+",
  "HealthKit only — nothing leaves the device",
];

export function Download() {
  return (
    <section id="download" className="bg-paper px-3 pb-6 pt-4 sm:px-4">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] sm:rounded-[40px]"
        style={{ background: "linear-gradient(150deg,#d2e5ff 0%,#eef3fc 40%,#fff9ee 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0 grain opacity-60" />
        <div
          className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 animate-drift rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(65,94,238,0.20),transparent 70%)" }}
        />

        <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:px-16 lg:py-20">
          <Reveal>
            <p className="text-cap font-semibold uppercase tracking-[0.2em] text-mute">Get Bevel</p>
            <h2 className="display mt-4 text-[clamp(34px,6vw,64px)] leading-[0.95]">
              Tonight's sleep is
              <br />
              <span className="text-mute/80">tomorrow's answer.</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-[17px] leading-[1.4] text-mute sm:text-body sm:leading-body">
              Install on iPhone, pair the watch, and wear it to bed. Your first real readiness score lands in
              fourteen mornings — before that, Bevel shows its working.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ApplePill className="px-5 py-2.5 text-[17px]" label="Download for iPhone" />
              <span className="num text-cap text-mute">v4.2 · 82 MB</span>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-[13px] font-medium text-mute">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  {p}
                </li>
              ))}
            </ul>
            <RatingStrip className="mt-7 justify-start" />
          </Reveal>

          <Reveal delay={140} className="flex justify-center lg:justify-end">
            <div className="w-[280px] rounded-2xl bg-charcoal p-5 shadow-raise transition-transform duration-500 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-cap font-semibold uppercase tracking-[0.16em] text-cloud/70">
                  <QrIcon className="h-3 w-3" />
                  Scan to install
                </p>
                <span className="h-1.5 w-1.5 animate-tick rounded-full bg-recovery" />
              </div>
              <div className="mt-4 rounded-[14px] bg-white p-3">
                <QrCode size={212} className="h-auto w-full" />
              </div>
              <p className="num mt-4 text-center text-[13px] font-medium text-cloud">bevel.app/get</p>
              <p className="mt-1 text-center text-cap leading-[1.4] text-cloud/55">
                Opens the App Store on your iPhone and hands the watch the pairing sheet.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
