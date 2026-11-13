import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/utils";
import { checklistDone, checklistItems, guideSection, guideSections } from "@/services/guide";
import { resolveActiveTrip } from "@/services/trips";
import { RichText } from "@/components/guide/rich-text";
import { GuideIcon } from "@/components/guide/icon";
import { FxConverter } from "@/components/guide/fx-converter";
import { Checklist } from "@/components/guide/checklist";
import { DataStatusBadge } from "@/components/catalog/meta";
import { SourceList } from "@/components/catalog/source-list";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const s = guideSection(section);
  return s ? { title: `${s.section.title}Vietnam travel guide`, description: s.section.summary, alternates: { canonical: `/guide/${section}` } } : { title: "Guide" };
}

const KIND = { official_requirement: { label: "Official requirement", tone: "good" as const }, travel_advice: { label: "Travel advice", tone: "accent" as const }, mixed: { label: "Official + advice", tone: "neutral" as const } };

export default async function GuideSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params;
  const data = guideSection(slug);
  if (!data) notFound();
  const { section, articles } = data;
  const all = guideSections();
  const user = await getCurrentUser();
  const isPacking = slug.includes("packing");
  const isPrep = slug.includes("preparation");
  const active = await resolveActiveTrip(user?.id);
  const list = isPacking ? checklistItems("packing") : isPrep ? checklistItems("preparation") : [];
  return (
    <div className="container-x pt-10">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Guide sections" className="hidden lg:block">
          <ol className="sticky top-24 space-y-0.5 text-sm">
            {all.map((s) => (
              <li key={s.id}>
                <Link href={`/guide/${s.slug}`} aria-current={s.slug === slug ? "page" : undefined} className={`flex gap-2 rounded-sm px-2 py-1.5 ${s.slug === slug ? "bg-surface-2 font-semibold" : "text-muted hover:text-ink"}`}>
                  <span className="w-4 font-serif">{s.letter}</span>{s.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 max-w-3xl">
          <Link href="/guide" className="text-xs text-muted hover:text-ink">← Travel guide</Link>
          <p className="mt-4 flex items-center gap-2 eyebrow"><GuideIcon name={section.icon} className="size-4" />Section {section.letter}</p>
          <h1 className="mt-1 text-4xl md:text-5xl">{section.title}</h1>
          <p className="mt-3 text-lg text-muted">{section.summary}</p>
          {articles.length > 1 && (
            <ul className="mt-6 flex flex-wrap gap-1.5">
              {articles.map((a) => <li key={a.id}><a href={`#${a.slug}`} className="inline-block rounded-full border border-line px-3 py-1 text-sm hover:border-ink">{a.title}</a></li>)}
            </ul>
          )}
          {slug.includes("currency") && <div className="mt-8"><FxConverter /></div>}
          {list.length > 0 && (
            <section className="mt-10" aria-label="Checklist">
              <h2 className="mb-4 text-2xl">{isPacking ? "Your packing checklist" : "Your preparation checklist"}</h2>
              <Checklist items={list.map((i) => ({ id: i.id, group: i.group, label: i.label, detail: i.detail, dueDaysBefore: i.dueDaysBefore }))} done={checklistDone(user?.id)} departure={active ? active.trip.startDate : undefined} />
            </section>
          )}
          {articles.map((a) => (
            <article key={a.id} id={a.slug} className="mt-12 scroll-mt-24 border-t border-line pt-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={KIND[a.kind as keyof typeof KIND]?.tone ?? "neutral"}>{KIND[a.kind as keyof typeof KIND]?.label ?? a.kind}</Badge>
                <span className="text-xs text-muted">Last checked {formatLongDate(a.lastVerified)}</span>
              </div>
              <h2 className="mt-2 text-3xl">{a.title}</h2>
              <p className="mt-2 font-serif text-lg text-muted">{a.summary}</p>
              {a.keyFacts.length > 0 && (
                <dl className="mt-6 divide-y divide-line rounded-md border border-line bg-surface">
                  {a.keyFacts.map((k) => (
                    <div key={k.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-start sm:gap-4">
                      <dt className="text-sm font-semibold">{k.label}</dt>
                      <dd className="text-sm">{k.value}</dd>
                      <dd><DataStatusBadge status={k.status} /></dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-6"><RichText body={a.body} /></div>
              {a.warnings.length > 0 && (
                <div className="mt-6 rounded-md border border-highlight/60 bg-highlight-soft p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4 text-warn" />Common mistakes</p>
                  <ul className="prose-atlas text-sm">{a.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </div>
              )}
              <div className="mt-6"><SourceList sources={a.sources} title="Sources" /></div>
            </article>
          ))}
          <p className="mt-12 text-xs text-muted">This guide is general information, not legal advice. Regulations change: always confirm entry requirements on the official government portals linked above before travelling.</p>
        </div>
      </div>
    </div>
  );
}
