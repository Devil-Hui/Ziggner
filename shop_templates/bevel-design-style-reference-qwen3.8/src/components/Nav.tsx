import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ApplePill } from "./ApplePill";
import { useScrollProgress } from "../lib/motion";
import { cn } from "../utils/cn";

const LINKS = [
  { label: "Readiness", href: "#board" },
  { label: "Features", href: "#features" },
  { label: "Journal", href: "#stories" },
  { label: "Devices", href: "#devices" },
  { label: "Download", href: "#download" },
];

export function Nav() {
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);
  const progress = useScrollProgress();

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:pt-4">
      <div className="mx-auto max-w-[1240px]">
        <nav
          className={cn(
            "relative overflow-hidden rounded-4xl bg-paper/85 backdrop-blur-xl transition-all duration-500",
            lifted ? "shadow-[0_2px_20px_-6px_rgba(31,32,37,0.22)]" : "shadow-none",
          )}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5 sm:py-3">
            <a href="#top" className="flex items-center gap-2">
              <span className="relative grid h-7 w-7 place-items-center rounded-[9px] bg-charcoal">
                <span className="absolute h-[13px] w-[13px] rounded-[4px] border-[2.5px] border-cloud" />
                <span className="absolute h-[13px] w-[13px] rounded-[4px] border-[2.5px] border-recovery left-[9px] top-[9px]" />
              </span>
              <span className="text-brand font-medium tracking-brand text-ink">Ziggner</span>
            </a>

            <div className="hidden items-center gap-7 lg:flex">
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="link-underline text-nav font-medium text-mute transition-colors duration-300 hover:text-ink"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#download"
                className="hidden text-nav font-medium text-mute transition-colors hover:text-ink sm:block"
              >
                Sign in
              </a>
              <ApplePill className="hidden sm:inline-flex" />
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full bg-cloud text-ink transition-transform duration-300 active:scale-95 lg:hidden"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* live scroll progress — the device charge line */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-transparent">
            <div
              className="h-full origin-left"
              style={{
                transform: `scaleX(${progress})`,
                background: "linear-gradient(90deg,#415eee,#31ce01 55%,#ffab94)",
                transition: "transform .18s linear",
              }}
            />
          </div>
        </nav>

        <div
          className={cn(
            "mt-2 overflow-hidden rounded-4xl bg-paper/95 backdrop-blur-xl transition-all duration-500 lg:hidden",
            open ? "max-h-[420px] opacity-100 shadow-raise" : "max-h-0 opacity-0",
          )}
        >
          <div className="grid gap-1 p-4">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-nav font-medium text-ink transition-colors hover:bg-cloud"
              >
                {l.label}
                <span className="num text-cap text-mute-soft">↗</span>
              </a>
            ))}
            <div className="pt-2">
              <ApplePill full />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
