import { ZiggnerMark } from "./Icons";

const groups = [
  { title: "Product", links: ["Features", "Science", "Membership", "Devices"] },
  { title: "Company", links: ["About", "Careers", "Press", "Journal"] },
  { title: "Support", links: ["Help Center", "Contact", "Privacy", "Terms"] },
  { title: "Connect", links: ["Instagram", "YouTube", "TikTok", "X"] },
];

export default function Footer() {
  return (
    <footer className="bg-paper-white px-6 py-20">
      <div className="mx-auto max-w-[1080px]">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <a href="#top" className="flex items-center gap-2.5 text-[18px] font-medium leading-[25.2px] tracking-[0.16px] text-ink">
              <ZiggnerMark className="h-7 w-7" />
              Ziggner
            </a>
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[16px] font-medium leading-[22.4px] text-body-gray">{group.title}</h3>
              <ul className="mt-4 flex flex-col gap-4">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="text-[18px] font-medium leading-[25.2px] text-ink transition-colors hover:text-body-gray"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-cloud-card pt-8 text-[12px] text-body-gray sm:flex-row">
          <p>© 2026 Ziggner Ltd. All rights reserved.</p>
          <p>Made for mornings.</p>
        </div>
      </div>
    </footer>
  );
}
