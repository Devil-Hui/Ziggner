import { Laurel } from "./Icons";

const partners = [
  { name: "Apple Health", className: "font-semibold tracking-[-0.24px]" },
  { name: "Garmin", className: "font-bold uppercase tracking-[0.12em] text-[20px]" },
  { name: "Oura", className: "font-medium tracking-[0.02em]" },
  { name: "Polar", className: "font-semibold italic" },
  { name: "Withings", className: "font-medium tracking-[-0.02em]" },
  { name: "Strava", className: "font-bold tracking-[-0.03em]" },
  { name: "Google Fit", className: "font-medium" },
];

const awards = [
  { title: "Editors' Choice", sub: "App Store · 2025" },
  { title: "Best Wellness App", sub: "Health Innovation Awards" },
];

export default function Proof() {
  return (
    <section id="science" className="px-6 py-20 text-center">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-[24px] font-semibold leading-[0.9] tracking-[-0.24px] text-ink">
          Works with the wearables you already wear
        </h2>

        <ul className="mx-auto mt-10 flex max-w-[960px] flex-wrap items-center justify-center gap-x-6 gap-y-6">
          {partners.map((p) => (
            <li key={p.name} className={`text-[24px] leading-none text-charcoal ${p.className}`}>
              {p.name}
            </li>
          ))}
        </ul>

        <div className="mt-20 flex flex-wrap items-center justify-center gap-4">
          {awards.map((award) => (
            <div key={award.title} className="flex items-center gap-4 text-body-gray">
              <Laurel className="h-14 w-7" />
              <div className="text-center">
                <p className="text-[16px] font-medium leading-[22.4px]">{award.title}</p>
                <p className="text-[12px] leading-[1.1]">{award.sub}</p>
              </div>
              <Laurel className="h-14 w-7" flip />
            </div>
          ))}
        </div>

        <h2 className="mx-auto mt-16 max-w-[900px] text-[48px] font-semibold leading-[1] tracking-[-1.9px] text-ink sm:text-[64px] sm:tracking-[-1.92px]">
          Your body keeps score. We make it readable by breakfast.
        </h2>
      </div>
    </section>
  );
}
