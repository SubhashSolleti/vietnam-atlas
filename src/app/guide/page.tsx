import type { Metadata } from "next";
import Link from "next/link";
import { guideSections } from "@/services/guide";
import { GuideIcon } from "@/components/guide/icon";
import { FxConverter } from "@/components/guide/fx-converter";

export const metadata: Metadata = {
  title: "Vietnam travel guide A–Z: visas, money, transport, safety",
  description: "Practical, sourced travel information for Vietnam: e-visas for Indian passports, currency, SIM cards, transport, accommodation, food, safety, etiquette and checklists.",
  alternates: { canonical: "/guide" },
};

export default function GuideIndex() {
  const sections = guideSections();
  return (
    <div className="container-x pt-10">
      <div className="grid gap-10 lg:grid-cols-12">
        <header className="lg:col-span-7">
          <p className="eyebrow mb-2">Travel guide</p>
          <h1 className="text-4xl md:text-6xl">Vietnam, A to Z</h1>
          <p className="mt-4 text-lg text-muted">Everything practical: from the e-visa to emergency numbers. Legal requirements are marked separately from travel advice and linked to official sources.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-good-soft px-3 py-1 font-semibold text-good">Official requirement</span>
            <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent">Travel advice</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold text-muted">Mixed: clearly separated</span>
          </div>
        </header>
        <div className="lg:col-span-5"><FxConverter /></div>
      </div>
      {sections.length ? (
        <ol className="mt-12 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <li key={s.id} className="bg-surface">
              <Link href={`/guide/${s.slug}`} className="group flex h-full gap-4 p-6 hover:bg-surface-2">
                <span className="font-serif text-4xl leading-none text-muted group-hover:text-accent">{s.letter}</span>
                <span>
                  <span className="flex items-center gap-2 font-semibold"><GuideIcon name={s.icon} className="size-4 text-brand-2" />{s.title}</span>
                  <span className="mt-1 block text-sm text-muted">{s.summary}</span>
                  <span className="mt-2 block text-xs text-muted">{s.articleCount} article{s.articleCount === 1 ? "" : "s"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-12 text-muted">Guide content hasn't been seeded. Run <code>npm run db:reset</code>.</p>
      )}
    </div>
  );
}
