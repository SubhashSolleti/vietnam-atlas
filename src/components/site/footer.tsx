import Link from "next/link";
import { Wordmark } from "./header";

const COLS = [
  {
    title: "Discover",
    links: [
      ["Explore Vietnam", "/explore"],
      ["Destination directory", "/destinations"],
      ["Experiences", "/experiences"],
      ["Free experiences", "/experiences?tier=free"],
      ["Interactive map", "/map"],
    ],
  },
  {
    title: "Plan",
    links: [
      ["My wishlist", "/wishlist"],
      ["My trip & itinerary", "/trip"],
      ["Group planner", "/group"],
      ["Budget calculator", "/trip/budget"],
      ["Work & Connect", "/connect"],
    ],
  },
  {
    title: "Travel guide",
    links: [
      ["Visa & immigration", "/guide/visa-and-immigration"],
      ["Safety", "/guide/safety"],
      ["Transport", "/guide/transportation"],
      ["Packing checklist", "/guide/packing-checklist"],
    ],
  },
  {
    title: "About",
    links: [
      ["About Vietnam Atlas", "/about"],
      ["Data sources & accuracy", "/sources"],
      ["Contact & corrections", "/contact"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Legal information", "/legal"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-bg-alt pb-20 lg:pb-0">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Wordmark />
          <p className="mt-4 max-w-sm text-sm text-muted">
            An independent Vietnam discovery and group trip-planning companion. Information is researched from official and reputable sources and labelled with its verification status. Prices are estimates unless marked otherwise.
          </p>
          <p className="mt-4 text-xs text-muted">
            Not affiliated with the Vietnam National Authority of Tourism. Photography from Wikimedia Commons contributors under open licences, credited with each photo and in full on the <Link href="/sources#photo-credits" className="underline">Data sources</Link> page.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="md:col-span-2">
            <h2 className="mb-3 font-sans text-xs font-semibold tracking-[0.14em] text-ink uppercase">{c.title}</h2>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-muted hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-muted md:flex-row md:justify-between">
          <p>© 2026 Vietnam Atlas · Local edition</p>
          <p>Emergency in Vietnam: Police 113 · Fire 114 · Ambulance 115</p>
        </div>
      </div>
    </footer>
  );
}
