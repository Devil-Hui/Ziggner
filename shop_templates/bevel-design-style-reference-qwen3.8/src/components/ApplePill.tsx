import { cn } from "../utils/cn";

/** Charcoal download pill — Cloud Card label, 128px radius, 8px × 16px padding. */
export function ApplePill({
  className,
  full = false,
  label = "Download Bevel",
}: {
  className?: string;
  full?: boolean;
  label?: string;
}) {
  return (
    <a
      href="#download"
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-pill bg-charcoal px-4 py-2 text-nav font-medium text-cloud transition-transform duration-300 hover:-translate-y-[1px] active:translate-y-0",
        full && "w-full",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 rotate-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-sheen"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)" }}
      />
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-cloud" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.98 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-3.02.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.47zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.224-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.46z" />
      </svg>
      <span className="relative">{label}</span>
    </a>
  );
}

/** Compact App Store proof strip — Signal Gold stars, subordinate gray metadata. */
export function RatingStrip({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-2", className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} viewBox="0 0 24 24" className="h-3 w-3 fill-gold" aria-hidden="true">
            <path d="M12 2l2.9 6.26 6.85.83-5.05 4.72 1.32 6.77L12 17.27l-6.02 3.31 1.32-6.77L2.25 9.09l6.85-.83L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-cap leading-cap font-medium text-mute">4.9 · 12,480 ratings</p>
      <span className="h-3 w-px bg-cloud-line" />
      <p className="text-cap leading-cap font-medium text-mute">Editors' Choice 2025</p>
    </div>
  );
}
