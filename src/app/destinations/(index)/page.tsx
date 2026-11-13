import { LayoutGrid, Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DestinationCard } from "@/components/catalog/cards";
import { ActiveChips, FilterSidebar, MobileFilters, SearchWithin, SortSelect, type FilterGroup } from "@/components/catalog/filter-panel";
import { DestinationsMap } from "@/components/map/destinations-map";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KIND_LABELS, MONTHS } from "@/content/taxonomy";
import { normalise } from "@/lib/activity-filters";
import { cn } from "@/lib/utils";
import { getCatalog, type DestinationCardData } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Vietnam destinations: cities, islands, bays and national parks",
  description: "Every destination in Vietnam Atlas: filter by region, season, budget and adventure level, and switch between list and map.",
  alternates: { canonical: "/destinations" },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").filter(Boolean);

function apply(all: DestinationCardData[], sp: SP, skip?: string) {
  const q = normalise(one(sp.q));
  const regions = skip === "region" ? [] : list(sp.region);
  const kinds = skip === "kind" ? [] : list(sp.kind);
  const rawMonth = Math.trunc(Number(one(sp.month)));
  const month = skip === "month" || !(rawMonth >= 1 && rawMonth <= 12) ? 0 : rawMonth;
  const budget = skip === "budget" ? [] : list(sp.budget).map(Number);
  const adventure = skip === "adventure" ? [] : list(sp.adventure).map(Number);
  return all.filter(
    (d) =>
      (!q || normalise(`${d.name} ${d.province} ${d.formerProvince ?? ""} ${d.tagline} ${d.highlights.join(" ")}`).includes(q)) &&
      (!regions.length || regions.includes(d.regionSlug)) &&
      (!kinds.length || kinds.includes(d.kind)) &&
      (!month || Number(d.months[month - 1]) >= 2) &&
      (!budget.length || budget.includes(d.spendingLevel)) &&
      (!adventure.length || adventure.includes(d.adventureLevel)),
  );
}

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { destinations, regions } = await getCatalog();
  const view = one(sp.view) === "map" ? "map" : "list";
  const sort = one(sp.sort) || "popular";
  let items = apply(destinations, sp);
  items = [...items].sort((a, b) =>
    sort === "alpha" ? a.name.localeCompare(b.name) : sort === "activities" ? b.activityCount - a.activityCount : sort === "december" ? Number(b.months[11]) - Number(a.months[11]) || b.popularity - a.popularity : b.popularity - a.popularity,
  );
  const count = (key: string, pred: (d: DestinationCardData) => boolean) => apply(destinations, sp, key).filter(pred).length;
  const groups: FilterGroup[] = [
    { key: "region", label: "Region", type: "multi", options: regions.map((r) => ({ value: r.slug, label: r.name, count: count("region", (d) => d.regionSlug === r.slug) })) },
    {
      key: "kind",
      label: "Type of place",
      type: "multi",
      options: Object.entries(KIND_LABELS)
        .map(([value, label]) => ({ value, label, count: count("kind", (d) => d.kind === value) }))
        .filter((o) => destinations.some((d) => d.kind === o.value)),
    },
    { key: "month", label: "Good to visit in", type: "single", options: MONTHS.map((m, i) => ({ value: String(i + 1), label: m, count: count("month", (d) => Number(d.months[i]) >= 2) })) },
    {
      key: "budget",
      label: "Budget level",
      type: "multi",
      options: [
        ["1", "₹ Very affordable"],
        ["2", "₹₹ Affordable"],
        ["3", "₹₹₹ Mid-range"],
        ["4", "₹₹₹₹ Pricier"],
      ].map(([value, label]) => ({ value: value!, label: label!, count: count("budget", (d) => d.spendingLevel === Number(value)) })),
    },
    {
      key: "adventure",
      label: "Adventure level",
      type: "multi",
      options: [
        ["1", "Gentle"],
        ["2", "Active"],
        ["3", "Adventurous"],
        ["4", "Extreme"],
      ].map(([value, label]) => ({ value: value!, label: label!, count: count("adventure", (d) => d.adventureLevel === Number(value)) })),
    },
  ];
  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
    for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k));
    return `/destinations${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="container-x pt-10">
      <header className="mb-8 max-w-3xl">
        <p className="eyebrow mb-2">Destination directory</p>
        <h1 className="text-4xl md:text-5xl">Where to go in Vietnam</h1>
        <p className="mt-3 text-muted">Cities, islands, bays, national parks and rural regions; each with a full guide, experience catalogue, seasonality and practical logistics.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <FilterSidebar groups={groups} total={items.length} />
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchWithin placeholder="Search destinations or provinces…" />
            <div className="flex flex-wrap items-center gap-2">
              <MobileFilters groups={groups} total={items.length} />
              <SortSelect
                options={[
                  { value: "popular", label: "Most popular" },
                  { value: "december", label: "Best in December" },
                  { value: "activities", label: "Most experiences" },
                  { value: "alpha", label: "A–Z" },
                ]}
              />
              <div className="inline-flex rounded-md border border-line bg-surface-2 p-0.5" role="group" aria-label="View">
                <Link href={href({ view: null })} aria-current={view === "list" ? "true" : undefined} className={cn("flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm", view === "list" ? "bg-surface shadow-sm" : "text-muted")}>
                  <LayoutGrid className="size-4" /> List
                </Link>
                <Link href={href({ view: "map" })} aria-current={view === "map" ? "true" : undefined} className={cn("flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm", view === "map" ? "bg-surface shadow-sm" : "text-muted")}>
                  <MapIcon className="size-4" /> Map
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <strong className="text-ink">{items.length}</strong> destinations
            </p>
            <ActiveChips groups={groups} />
          </div>
          {!items.length ? (
            <EmptyState className="mt-8" title="No destinations match" action={<ButtonLink href="/destinations" variant="outline">Clear filters</ButtonLink>} />
          ) : view === "map" ? (
            <div className="mt-6 h-[70vh] min-h-[420px]">
              <DestinationsMap items={items.map((d) => ({ id: d.id, slug: d.slug, name: d.name, lat: d.lat, lng: d.lng, tagline: d.tagline, image: d.image?.src ?? null, activityCount: d.activityCount }))} />
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <h2 className="sr-only">Results</h2>
              {items.map((d, i) => (
                <DestinationCard key={d.slug} d={d} priority={i < 3} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
