import { Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityCard } from "@/components/catalog/cards";
import { ActiveChips, FilterSidebar, MobileFilters, SearchWithin, SortSelect, type FilterGroup } from "@/components/catalog/filter-panel";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AVAILABILITY_LABELS,
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  DURATION_LABELS,
  PRICE_BUCKETS,
  SUITABILITY_LABELS,
  THEME_LABELS,
  TIER_LABELS,
  MONTHS,
} from "@/content/taxonomy";
import { filterActivities, parseActivityFilters, type ActivityFilters } from "@/lib/activity-filters";
import { cn } from "@/lib/utils";
import { getCatalog } from "@/services/catalog";
import { getFx } from "@/services/settings";

export const metadata: Metadata = {
  title: "Experiences in Vietnam: activities, tours & free things to do",
  description: "Browse hundreds of Vietnam experiences with estimated prices in INR and VND, seasonality, difficulty and duration. Filter by destination, category, budget and more.",
  alternates: { canonical: "/experiences" },
};

const PAGE_SIZE = 24;

export default async function ExperiencesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseActivityFilters(sp);
  const { activities, destinations, regions } = await getCatalog();
  const fx = await getFx();
  const results = filterActivities(activities, filters, fx.inrToVnd);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  // Out-of-range page numbers show the last page rather than an empty list under a full count.
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(sp.page)) || 1));
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /** Facet count for an option = results when every *other* group's filter is applied. */
  const facet = (key: keyof ActivityFilters, value: string) => {
    const f = { ...filters, [key]: [value] } as ActivityFilters;
    return filterActivities(activities, f, fx.inrToVnd).length;
  };
  const opts = (key: keyof ActivityFilters, labels: Record<string, string>) =>
    Object.entries(labels).map(([value, label]) => ({ value, label, count: facet(key, value) }));

  const groups: FilterGroup[] = [
    { key: "region", label: "Region", type: "multi", options: regions.map((r) => ({ value: r.slug, label: r.name, count: facet("region", r.slug) })) },
    {
      key: "destination",
      label: "Destination",
      type: "multi",
      collapsed: true,
      options: [...destinations].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ value: d.slug, label: d.name, count: facet("destination", d.slug) })),
    },
    { key: "category", label: "Category", type: "multi", options: opts("category", CATEGORY_LABELS) },
    { key: "theme", label: "Theme", type: "multi", collapsed: true, options: opts("theme", THEME_LABELS) },
    { key: "tier", label: "Free or paid", type: "multi", options: opts("tier", TIER_LABELS) },
    { key: "price", label: "Price per person (INR)", type: "multi", options: PRICE_BUCKETS.map((b) => ({ value: b.slug, label: b.label, count: facet("price", b.slug) })) },
    { key: "duration", label: "Duration", type: "multi", options: opts("duration", DURATION_LABELS) },
    { key: "difficulty", label: "Difficulty", type: "multi", options: opts("difficulty", DIFFICULTY_LABELS) },
    { key: "availability", label: "Availability", type: "multi", collapsed: true, options: opts("availability", AVAILABILITY_LABELS) },
    { key: "suitability", label: "Travel suitability", type: "multi", collapsed: true, options: opts("suitability", SUITABILITY_LABELS) },
    {
      key: "month",
      label: "Good to do in",
      type: "single",
      collapsed: !filters.month,
      options: MONTHS.map((m, i) => ({ value: String(i + 1), label: m, count: filterActivities(activities, { ...filters, month: i + 1 }, fx.inrToVnd).length })),
    },
  ];

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    return `/experiences${q.size ? `?${q}` : ""}`;
  };
  const mapHref = `/map?${new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "page"))}`;

  return (
    <div className="container-x pt-10">
      <header className="mb-8 max-w-3xl">
        <p className="eyebrow mb-2">Experience catalogue</p>
        <h1 className="text-4xl md:text-5xl">Experiences across Vietnam</h1>
        <p className="mt-3 text-muted">
          {activities.length} individually researched activities across {destinations.length} destinations. Prices are planning estimates shown in INR (converted at the reference rate) and VND. Never live quotes.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <FilterSidebar groups={groups} total={results.length} />
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchWithin placeholder="Search experiences, places, categories…" />
            <div className="flex flex-wrap items-center gap-2">
              <MobileFilters groups={groups} total={results.length} />
              <SortSelect
                options={[
                  { value: "recommended", label: "Recommended" },
                  { value: "season", label: "Best season first" },
                  { value: "price_asc", label: "Price: low to high" },
                  { value: "price_desc", label: "Price: high to low" },
                  { value: "duration", label: "Shortest first" },
                  { value: "alpha", label: "A–Z" },
                ]}
              />
              <ButtonLink href={mapHref} variant="outline" size="sm" className="h-10">
                <MapIcon className="size-4" />
                <span className="hidden sm:inline">Map</span>
              </ButtonLink>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <strong className="text-ink tabular-nums">{results.length}</strong> experience{results.length === 1 ? "" : "s"}
              {filters.q && (
                <>
                  {" "}
                  matching “{filters.q}”
                </>
              )}
            </p>
            <ActiveChips groups={groups} />
          </div>

          <h2 className="sr-only">Results</h2>
          {shown.length ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((a, i) => (
                <ActivityCard key={a.id} a={a} priority={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState className="mt-8" title="No experiences match" action={<ButtonLink href="/experiences" variant="outline">Clear all filters</ButtonLink>}>
              Try removing a filter: price buckets and months narrow results quickly. Free alternatives are always available under “Free or paid”.
            </EmptyState>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="h-9 rounded-sm border border-line px-3 text-sm leading-9 hover:border-ink">
                  Previous
                </Link>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={cn("grid h-9 min-w-9 place-items-center rounded-sm border px-2 text-sm tabular-nums", p === page ? "border-brand bg-brand text-brand-ink" : "border-line hover:border-ink")}
                >
                  {p}
                </Link>
              ))}
              {page < pages && (
                <Link href={pageHref(page + 1)} className="h-9 rounded-sm border border-line px-3 text-sm leading-9 hover:border-ink">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
