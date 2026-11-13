import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Columns3 } from "lucide-react";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getActivityBySlug, getCatalog } from "@/services/catalog";
import { AtlasImage } from "@/components/catalog/atlas-image";
import { DecemberBadge, IntensityMeter, bestMonths } from "@/components/catalog/meta";
import { Price } from "@/components/catalog/price";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { CompareRemove, ClearCompare } from "@/components/wishlist/compare-controls";
import { AddToTripButton } from "@/components/catalog/actions";
import { DIFFICULTY_LABELS, SUITABILITY_LABELS } from "@/content/taxonomy";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Compare activities", robots: { index: false } };

const DIFF_RANK: Record<string, number> = { easy: 1, moderate: 2, challenging: 3, extreme: 4 };
const DEC_RANK: Record<string, number> = { good: 4, variable: 3, unknown: 2, poor: 1, closed: 0 };

export default async function ComparePage() {
  const user = await getCurrentUser();
  const ids = user ? db.select().from(t.comparisons).where(eq(t.comparisons.userId, user.id)).orderBy(asc(t.comparisons.createdAt)).all().map((c) => c.activityId) : [];
  const cat = getCatalog();
  const items = ids
    .map((id) => cat.activities.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((card) => ({ card, detail: getActivityBySlug(card.slug)! }));
  if (items.length < 2)
    return (
      <div className="container-x max-w-2xl pt-16">
        <EmptyState as="h1" icon={<Columns3 />} title={items.length ? "Add one more to compare" : "Nothing to compare yet"} action={<ButtonLink href="/experiences">Browse experiences</ButtonLink>}>
          Use the “Compare” button on experiences (up to 4) to see prices, duration, difficulty, seasonality and safety side by side.
          {items.length === 1 && <> Currently selected: <strong>{items[0]!.card.title}</strong>.</>}
        </EmptyState>
      </div>
    );

  const priceOf = (x: (typeof items)[number]) => (x.card.priceTier === "free" ? 0 : x.card.price?.minVnd ?? 0);
  const minPrice = Math.min(...items.map(priceOf));
  const minDur = Math.min(...items.map((x) => x.card.durationHours));
  const minDiff = Math.min(...items.map((x) => DIFF_RANK[x.card.difficulty] ?? 9));
  const maxDec = Math.max(...items.map((x) => DEC_RANK[x.card.decemberStatus] ?? 0));
  const differs = (vals: string[]) => new Set(vals).size > 1;

  type Row = { label: string; values: React.ReactNode[]; raw: string[]; best?: boolean[] };
  const rows: Row[] = [
    { label: "Destination", values: items.map((x) => <Link key={x.card.id} href={`/destinations/${x.card.destinationSlug}`} className="hover:underline">{x.card.destinationName}</Link>), raw: items.map((x) => x.card.destinationName) },
    { label: "Estimated price", values: items.map((x) => <Price key={x.card.id} tier={x.card.priceTier} price={x.card.price} size="sm" />), raw: items.map((x) => String(priceOf(x))), best: items.map((x) => priceOf(x) === minPrice) },
    { label: "Duration", values: items.map((x) => x.card.durationText), raw: items.map((x) => x.card.durationText), best: items.map((x) => x.card.durationHours === minDur) },
    { label: "Difficulty", values: items.map((x) => <span key={x.card.id} className="flex flex-col gap-1">{DIFFICULTY_LABELS[x.card.difficulty as keyof typeof DIFFICULTY_LABELS]}<IntensityMeter value={x.card.intensity} /></span>), raw: items.map((x) => x.card.difficulty), best: items.map((x) => DIFF_RANK[x.card.difficulty] === minDiff) },
    { label: "Season suitability", values: items.map((x) => <span key={x.card.id} className="flex flex-col gap-1"><DecemberBadge status={x.card.decemberStatus} /><span className="text-xs text-muted">Best: {bestMonths(x.card.months)}</span></span>), raw: items.map((x) => x.card.decemberStatus), best: items.map((x) => DEC_RANK[x.card.decemberStatus] === maxDec) },
    { label: "Safety considerations", values: items.map((x) => <ul key={x.card.id} className="list-disc space-y-0.5 pl-4 text-xs">{x.detail.activity.safety.slice(0, 4).map((s) => <li key={s}>{s}</li>)}</ul>), raw: items.map((x) => x.detail.activity.safety.join("|")) },
    { label: "Group suitability", values: items.map((x) => x.card.suitability.map((s) => SUITABILITY_LABELS[s as keyof typeof SUITABILITY_LABELS] ?? s).join(", ")), raw: items.map((x) => x.card.suitability.join()) },
    { label: "Included services", values: items.map((x) => x.detail.price?.includes.length ? <ul key={x.card.id} className="list-disc space-y-0.5 pl-4 text-xs">{x.detail.price.includes.map((s) => <li key={s}>{s}</li>)}</ul> : <span key={x.card.id} className="text-muted">Not specified</span>), raw: items.map((x) => x.detail.price?.includes.join("|") ?? "") },
    { label: "Free alternative", values: items.map((x) => x.detail.freeAlternatives[0] ? <Link key={x.card.id} href={`/experiences/${x.detail.freeAlternatives[0].slug}`} className="text-accent hover:underline">{x.detail.freeAlternatives[0].title}</Link> : <span key={x.card.id} className="text-muted"></span>), raw: items.map((x) => x.detail.freeAlternatives[0]?.slug ?? "") },
    { label: "Travel time required", values: items.map((x) => <span key={x.card.id} className="text-xs">{x.detail.activity.transport}</span>), raw: items.map((x) => x.detail.activity.transport) },
  ];

  return (
    <div className="container-x pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Compare</p>
          <h1 className="text-4xl">Side by side</h1>
          <p className="mt-2 text-sm text-muted">Rows where options differ are highlighted; the best value in each row is marked. Prices are estimates.</p>
        </div>
        <ClearCompare />
      </div>
      <div className="mt-6 relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <colgroup><col className="w-44" />{items.map((x) => <col key={x.card.id} />)}</colgroup>
          <thead>
            <tr className="align-top">
              <th className="bg-surface-2 p-3 text-left text-xs font-semibold text-muted">Activity</th>
              {items.map((x) => (
                <th key={x.card.id} className="bg-surface p-3 text-left font-normal">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-sm bg-surface-2"><AtlasImage image={x.card.image} fallbackLabel={x.card.title} sizes="25vw" credit="none" /></div>
                  <Link href={`/experiences/${x.card.slug}`} className="mt-2 block font-semibold hover:text-accent">{x.card.title}</Link>
                  <div className="mt-2 flex flex-wrap gap-1.5"><AddToTripButton activityId={x.card.id} title={x.card.title} size="xs" variant="outline" /><CompareRemove activityId={x.card.id} /></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const diff = differs(r.raw);
              return (
                <tr key={r.label} className="align-top">
                  <th scope="row" className="bg-surface-2 p-3 text-left text-xs font-semibold">
                    {r.label}
                    {diff && <span className="mt-0.5 block font-normal text-accent">Differs</span>}
                  </th>
                  {r.values.map((v, i) => (
                    <td key={i} className={cn("bg-surface p-3", diff && "bg-highlight-soft/40", diff && r.best?.[i] && "bg-good-soft")}>
                      {v}
                      {diff && r.best?.[i] && <span className="mt-1 block text-[0.68rem] font-semibold text-good">Best in row</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
