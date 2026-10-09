import type { ReactElement } from "react";
import { AppleLogo } from "./Icons";

const GRID = 25;

/** Decorative, deterministic QR-style pattern with finder squares. */
function QRCode() {
  let seed = 20260610;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const finders: [number, number][] = [
    [0, 0],
    [0, GRID - 7],
    [GRID - 7, 0],
  ];

  const cellValue = (r: number, c: number): boolean => {
    for (const [or, oc] of finders) {
      if (r >= or - 1 && r <= or + 7 && c >= oc - 1 && c <= oc + 7) {
        if (r < or || r > or + 6 || c < oc || c > oc + 6) return false; // separator
        const dr = r - or;
        const dc = c - oc;
        const onEdge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        return onEdge || inCenter;
      }
    }
    return rand() > 0.52;
  };

  const rects: ReactElement[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (cellValue(r, c)) {
        rects.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} />);
      }
    }
  }

  return (
    <svg viewBox={`-1 -1 ${GRID + 2} ${GRID + 2}`} className="h-full w-full fill-charcoal" shapeRendering="crispEdges" aria-label="Scan to download Bevel">
      {rects}
    </svg>
  );
}

export default function Download() {
  return (
    <section id="download" className="px-4 py-20">
      <div className="mx-auto max-w-[1080px] rounded-[40px] bg-cloud-card px-6 py-20 text-center sm:px-12">
        <p className="text-[24px] font-semibold leading-[0.9] tracking-[-0.24px] text-ink">Membership</p>
        <h2 className="mx-auto mt-6 max-w-[760px] text-[48px] font-semibold leading-[1] tracking-[-1.9px] text-ink sm:text-[64px] sm:tracking-[-1.92px]">
          Start your first morning in cloudlight.
        </h2>
        <p className="mx-auto mt-6 max-w-[600px] text-[24px] leading-[1.3] text-body-gray">
          Free for 14 days. Connect your wearable in under two minutes.
        </p>

        <div className="mt-10 flex justify-center">
          <a
            href="#top"
            className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-[16px] font-medium leading-[22.4px] text-cloud-card transition-colors hover:bg-ink"
          >
            <AppleLogo className="h-5 w-5" />
            Download on the App Store
          </a>
        </div>

        <div className="mx-auto mt-14 flex max-w-[460px] items-center gap-6 rounded-2xl bg-charcoal p-6 text-left shadow-[0_2px_16px_0_rgba(0,0,0,0.15)]">
          <div className="h-28 w-28 shrink-0 rounded-xl bg-paper-white p-2">
            <QRCode />
          </div>
          <div>
            <p className="text-[24px] font-semibold leading-[1.1] tracking-[-0.24px] text-cloud-card">
              Scan with your iPhone
            </p>
            <p className="mt-2 text-[14px] leading-[1.4] text-cloud-card/70">
              Opens the App Store page for Bevel. Works with Apple Health, Garmin, Oura, and more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
