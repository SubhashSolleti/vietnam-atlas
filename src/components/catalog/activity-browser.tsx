"use client";

import { LayoutGrid, List } from "lucide-react";
import { useMemo, useState } from "react";
import type { ActivityCardData } from "@/lib/activity-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { ActivityCard } from "./cards";

const GROUPS: { key: string; label: string; test: (a: ActivityCardData) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "free", label: "Free", test: (a) => a.priceTier === "free" },
  { key: "low", label: "Low-cost", test: (a) => a.priceTier === "low" },
  { key: "paid", label: "Paid", test: (a) => a.priceTier === "paid" },
  { key: "adventure", label: "Adventure", test: (a) => a.categories.includes("adventure") || a.categories.includes("water_sports") },
  { key: "nature", label: "Nature", test: (a) => a.categories.includes("nature") || a.categories.includes("wildlife") },
  { key: "culture", label: "Culture", test: (a) => a.categories.includes("cultural") || a.categories.includes("historical") },
  { key: "nightlife", label: "Nightlife", test: (a) => a.categories.includes("nightlife") },
  { key: "food", label: "Food", test: (a) => a.categories.includes("food") },
  { key: "shopping", label: "Shopping", test: (a) => a.categories.includes("shopping") },
  { key: "hidden", label: "Hidden gems", test: (a) => a.themes.includes("hidden_gem") },
];

/** Grouped/filterable activity catalogue for a destination (spec §6.1-D). */
export function ActivityBrowser({ activities, initialGroup = "all", pageSize = 12, ownPhotosOnly }: { activities: ActivityCardData[]; initialGroup?: string; pageSize?: number; ownPhotosOnly?: boolean }) {
  const [group, setGroup] = useState(initialGroup);
  const [december, setDecember] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [limit, setLimit] = useState(pageSize);
  const counts = useMemo(() => Object.fromEntries(GROUPS.map((g) => [g.key, activities.filter(g.test).length])), [activities]);
  const items = useMemo(() => {
    const g = GROUPS.find((x) => x.key === group) ?? GROUPS[0]!;
    return activities.filter(g.test).filter((a) => !december || ["good", "variable"].includes(a.decemberStatus));
  }, [activities, group, december]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter experiences" className="-mx-4 flex gap-1.5 relative overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
          {GROUPS.filter((g) => g.key === "all" || counts[g.key]).map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={group === g.key}
              onClick={() => {
                setGroup(g.key);
                setLimit(pageSize);
              }}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-sm",
                group === g.key ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink",
              )}
            >
              {g.label} <span className="ml-0.5 text-xs opacity-70 tabular-nums">{counts[g.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={december} onChange={(e) => setDecember(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Workable in December
          </label>
          <Segmented
            label="Layout"
            size="sm"
            value={layout}
            onChange={setLayout}
            options={[
              { value: "grid", label: <span className="sr-only">Grid</span>, icon: <LayoutGrid className="size-4" /> },
              { value: "list", label: <span className="sr-only">List</span>, icon: <List className="size-4" /> },
            ]}
          />
        </div>
      </div>
      {items.length ? (
        <>
          <div className={cn("mt-6 grid gap-5", layout === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
            {items.slice(0, limit).map((a) => (
              <ActivityCard key={a.id} a={a} layout={layout} ownPhotosOnly={ownPhotosOnly} />
            ))}
          </div>
          {items.length > limit && (
            <div className="mt-6 text-center">
              <button type="button" onClick={() => setLimit((l) => l + pageSize)} className="h-10 rounded-md border border-line-strong bg-surface px-5 text-sm font-medium hover:border-ink">
                Show {Math.min(pageSize, items.length - limit)} more of {items.length - limit}
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState className="mt-6" title="Nothing matches these filters">
          Try another group or switch off “Workable in December”.
        </EmptyState>
      )}
    </div>
  );
}
