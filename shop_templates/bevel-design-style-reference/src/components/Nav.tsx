import { AppleLogo, ZiggnerMark } from "./Icons";

const links = [
  { label: "Features", href: "#features" },
  { label: "Science", href: "#science" },
  { label: "Community", href: "#community" },
  { label: "Membership", href: "#download" },
];

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between rounded-[32px] bg-white/80 px-5 shadow-[0_2px_16px_0_rgba(0,0,0,0.06)] backdrop-blur-xl sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 text-[18px] font-medium leading-[25.2px] tracking-[0.16px] text-ink">
          <ZiggnerMark className="h-7 w-7" />
          Ziggner
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[16px] font-medium leading-[22.4px] text-body-gray transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#download"
          className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-[16px] font-medium leading-[22.4px] text-cloud-card transition-colors hover:bg-ink"
        >
          <AppleLogo className="h-4 w-4" />
          Download
        </a>
      </nav>
    </header>
  );
}
