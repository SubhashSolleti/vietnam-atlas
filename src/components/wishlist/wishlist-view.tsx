"use client";

import { Columns3, Download, Flame, LayoutGrid, List, ThumbsUp, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addCandidate } from "@/app/actions/trips";
import { removeWishlistItems, setWishlistState, toggleCompare } from "@/app/actions/wishlist";
import { AtlasImage, type AtlasImageData } from "@/components/catalog/atlas-image";
import { DecemberBadge } from "@/components/catalog/meta";
import { Price } from "@/components/catalog/price";
import { useFx } from "@/components/site/fx";
import { useUserState } from "@/components/site/user-state";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_LABELS, DURATION_LABELS, PRICE_BUCKETS } from "@/content/taxonomy";
import { filterActivities, type ActivityCardData } from "@/lib/activity-filters";
import { cn } from "@/lib/utils";

export type SavedEntry = {
  wishId: string;
  entityType: "activity" | "attraction" | "destination";
  entityId: string;
  state: string;
  priority: number;
  note: string | null;
  savedAt: string;
  title: string;
  href: string;
  destination: string;
  destinationSlug: string;
  image: AtlasImageData | null;
  activity: ActivityCardData | null;
  groupStatus: string | null;
  attractionFree?: boolean;
};

const TABS = [
  ["all", "All saved"],
  ["activities", "Activities"],
  ["attractions", "Attractions"],
  ["destinations", "Destinations"],
  ["food", "Food experiences"],
  ["adventure", "Adventure"],
  ["free", "Free"],
  ["paid", "Paid"],
] as const;

function matchesTab(e: SavedEntry, tab: (typeof TABS)[number][0]) {
  const a = e.activity;
  switch (tab) {
    case "activities":
      return e.entityType === "activity";
    case "attractions":
      return e.entityType === "attraction";
    case "destinations":
      return e.entityType === "destination";
    case "food":
      return !!a?.categories.includes("food");
    case "adventure":
      return !!a && (a.categories.includes("adventure") || a.themes.includes("extreme"));
    case "free":
      return a ? a.priceTier === "free" : !!e.attractionFree;
    case "paid":
      return a ? a.priceTier !== "free" : e.entityType === "attraction" && !e.attractionFree;
    default:
      return true;
  }
}

const STATE_LABEL: Record<string, string> = { wishlist: "Saved", interested: "Interested", must_do: "Must-do", completed: "Completed", rejected: "Rejected" };

export function WishlistView({ entries, activeTripId, activeTripName }: { entries: SavedEntry[]; activeTripId: string | null; activeTripName: string | null }) {
  const fx = useFx();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const { state } = useUserState();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const [view, setView] = useState<"grid" | "list" | "compare">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [f, setF] = useState({ destination: "", price: "", category: "", duration: "", season: "", group: "", priority: "" });

  const shown = useMemo(() => {
    return entries.filter((e) => matchesTab(e, tab)).filter((e) => {
      if (f.destination && e.destinationSlug !== f.destination) return false;
      if (f.priority && e.state !== f.priority) return false;
      const a = e.activity;
      if ((f.price || f.category || f.duration || f.season || f.group) && !a) return false;
      if (a) {
        const filt = filterActivities([a], { price: f.price ? [f.price] : undefined, category: f.category ? [f.category] : undefined, duration: f.duration ? [f.duration] : undefined }, fx.inrToVnd);
        if (!filt.length) return false;
        if (f.season === "good" && !["good", "variable"].includes(a.decemberStatus)) return false;
        if (f.season === "poor" && !["poor", "closed"].includes(a.decemberStatus)) return false;
        if (f.group === "none" && e.groupStatus) return false;
        if (f.group === "shortlist" && !e.groupStatus) return false;
        if (f.group === "approved" && !["approved", "scheduled"].includes(e.groupStatus ?? "")) return false;
      }
      return true;
    });
  }, [entries, tab, f, fx.inrToVnd]); // eslint-disable-line react-hooks/exhaustive-deps

  const destOptions = [...new Map(entries.map((e) => [e.destinationSlug, e.destination])).entries()];
  const allSelected = shown.length > 0 && shown.every((e) => selected.includes(e.wishId));
  const selEntries = entries.filter((e) => selected.includes(e.wishId));

  const exportData = (kind: "csv" | "json") => {
    if (!(selEntries.length ? selEntries : shown).length) {
      toast({ tone: "error", title: "Nothing to export", description: "No saved items match the current filters." });
      return;
    }
    const rows = (selEntries.length ? selEntries : shown).map((e) => ({
      type: e.entityType,
      title: e.title,
      destination: e.destination,
      personal_state: STATE_LABEL[e.state] ?? e.state,
      group_status: e.groupStatus ?? "",
      price_min_vnd: e.activity?.price?.minVnd ?? "",
      price_max_vnd: e.activity?.price?.maxVnd ?? "",
      price_status: e.activity?.price?.status ?? "",
      duration: e.activity?.durationText ?? "",
      december: e.activity?.decemberStatus ?? "",
      note: e.note ?? "",
      url: new URL(e.href, window.location.origin).toString(),
    }));
    const blob =
      kind === "json"
        ? new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })
        : new Blob([[Object.keys(rows[0] ?? { title: "" }).join(","), ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vietnam-atlas-wishlist.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ tone: "success", title: `Exported ${rows.length} items as ${kind.toUpperCase()}` });
  };

  const bulkRemove = async () => {
    const n = selected.length;
    if (!(await confirm({ title: `Remove ${n} saved ${n === 1 ? "item" : "items"}?`, confirmLabel: "Remove", tone: "danger" }))) return;
    start(async () => {
      const r = await removeWishlistItems(selected);
      toast(r.ok ? { tone: "success", title: `Removed ${r.removed} ${r.removed === 1 ? "item" : "items"}` } : { tone: "error", title: r.error });
      setSelected([]);
    });
  };
  const bulkPropose = () =>
    start(async () => {
      if (!activeTripId) {
        toast({ tone: "error", title: "You're not in a trip yet", description: "Create a trip or join one with an invite code, then propose these experiences.", action: { label: "Go to Group Planner", href: "/group" } });
        return;
      }
      const acts = selEntries.filter((e) => e.entityType === "activity");
      for (const e of acts) await addCandidate(activeTripId, e.entityId);
      toast({ tone: "success", title: `Proposed ${acts.length} activities to ${activeTripName}`, action: { label: "Open shortlist", href: `/group/${activeTripId}?tab=shortlist` } });
      setSelected([]);
    });
  const bulkCompare = () =>
    start(async () => {
      const candidates = selEntries.filter((e) => e.entityType === "activity" && !state.compareIds.includes(e.entityId));
      const room = Math.max(0, 4 - state.compareIds.length);
      const acts = candidates.slice(0, room);
      for (const e of acts) await toggleCompare(e.entityId, true);
      if (candidates.length > acts.length)
        toast({ tone: "info", title: `Comparison holds 4 experiences`, description: `Added ${acts.length}; ${candidates.length - acts.length} more weren't added. Remove some from the comparison to add others.` });
      router.push("/wishlist/compare");
    });

  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Saved item types" className="-mx-4 flex gap-1 relative overflow-x-auto border-b border-line px-4 scrollbar-none md:mx-0 md:px-0">
        {TABS.map(([k, l]) => {
          const count = entries.filter((e) => matchesTab(e, k)).length;
          return (
            <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={cn("shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap", tab === k ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink")}>
              {l} <span className="text-xs tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <Sel label="Destination" value={f.destination} onChange={(v) => setF({ ...f, destination: v })} options={destOptions.map(([v, l]) => [v, l])} />
        <Sel label="Price" value={f.price} onChange={(v) => setF({ ...f, price: v })} options={PRICE_BUCKETS.map((b) => [b.slug, b.label])} />
        <Sel label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v })} options={Object.entries(CATEGORY_LABELS)} />
        <Sel label="Duration" value={f.duration} onChange={(v) => setF({ ...f, duration: v })} options={Object.entries(DURATION_LABELS)} />
        <Sel label="December suitability" value={f.season} onChange={(v) => setF({ ...f, season: v })} options={[["good", "Workable in December"], ["poor", "Poor / closed in December"]]} />
        <Sel label="Group approval" value={f.group} onChange={(v) => setF({ ...f, group: v })} options={[["none", "Not proposed"], ["shortlist", "On group shortlist"], ["approved", "Group approved"]]} />
        <Sel label="Personal priority" value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={[["must_do", "Must-do"], ["interested", "Interested"], ["wishlist", "Saved"]]} />
      </div>

      <div className="sticky top-16 z-10 mt-4 flex flex-wrap items-center gap-2 border-y border-line bg-bg/95 py-2 backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={allSelected} onChange={() => setSelected(allSelected ? [] : shown.map((e) => e.wishId))} />
          {selected.length ? `${selected.length} selected` : `Select all (${shown.length})`}
        </label>
        {selected.length > 0 && (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={bulkPropose}><Users className="size-4" />Propose to group</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={bulkCompare}><Columns3 className="size-4" />Compare</Button>
            <Button size="sm" variant="ghost" className="text-bad" disabled={pending} onClick={bulkRemove}><Trash2 className="size-4" />Remove</Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => exportData("csv")}><Download className="size-4" />CSV</Button>
          <Button size="sm" variant="ghost" onClick={() => exportData("json")}>JSON</Button>
          <Segmented label="View" size="sm" value={view} onChange={setView} options={[{ value: "grid", label: <span className="sr-only">Grid</span>, icon: <LayoutGrid className="size-4" /> }, { value: "list", label: <span className="sr-only">List</span>, icon: <List className="size-4" /> }, { value: "compare", label: <span className="sr-only">Comparison</span>, icon: <Columns3 className="size-4" /> }]} />
        </div>
      </div>

      {!shown.length ? (
        <EmptyState className="mt-6" title="Nothing matches" action={<Button variant="outline" onClick={() => { setF({ destination: "", price: "", category: "", duration: "", season: "", group: "", priority: "" }); setTab("all"); }}>Reset filters</Button>} />
      ) : view === "compare" ? (
        <CompareInline entries={shown.filter((e) => e.activity)} />
      ) : (
        <ul className={cn("mt-5 grid gap-4", view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1")}>
          {shown.map((e) => (
            <SavedCard key={e.wishId} e={e} layout={view} selected={selected.includes(e.wishId)} onSelect={() => setSelected((s) => (s.includes(e.wishId) ? s.filter((x) => x !== e.wishId) : [...s, e.wishId]))} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const id = `wf-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} className={cn("field h-9 text-sm", value && "border-brand")} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{label}: any</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function SavedCard({ e, layout, selected, onSelect }: { e: SavedEntry; layout: "grid" | "list"; selected: boolean; onSelect: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const setState = (s: "interested" | "must_do" | "wishlist") =>
    start(async () => {
      const r = await setWishlistState({ entityType: e.entityType, entityId: e.entityId, state: e.state === s ? "wishlist" : s });
      if (!r.ok) toast({ tone: "error", title: r.error });
    });
  return (
    <li className={cn("relative flex overflow-hidden rounded-md border bg-surface", selected ? "border-brand ring-1 ring-brand" : "border-line", layout === "list" ? "flex-row" : "flex-col")}>
      <div className={cn("relative shrink-0 bg-surface-2", layout === "list" ? "w-36 sm:w-48" : "aspect-[4/3]")}>
        <AtlasImage image={e.image} fallbackLabel={e.title} sizes={layout === "list" ? "192px" : "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} credit="none" />
        <label className="absolute top-2 left-2 z-[2] grid size-7 place-items-center rounded-sm bg-white/90 shadow">
          <input type="checkbox" checked={selected} onChange={onSelect} className="size-4 accent-[var(--brand)]" aria-label={`Select ${e.title}`} />
        </label>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <div className="flex flex-wrap gap-1">
          <Badge>{e.entityType}</Badge>
          {e.state !== "wishlist" && <Badge tone={e.state === "must_do" ? "accent" : "good"}>{STATE_LABEL[e.state]}</Badge>}
          {e.groupStatus && <Badge tone="brand">{e.groupStatus === "approved" ? "Group approved" : e.groupStatus === "scheduled" ? "In itinerary" : "On shortlist"}</Badge>}
        </div>
        <Link href={e.href} className="mt-1.5 font-semibold leading-snug hover:text-accent">{e.title}</Link>
        <p className="text-xs text-muted">{e.destination}</p>
        {e.activity && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DecemberBadge status={e.activity.decemberStatus} />
            <span className="text-xs text-muted">{e.activity.durationText}</span>
          </div>
        )}
        {e.note && <p className="mt-2 line-clamp-2 rounded-xs bg-highlight-soft px-2 py-1 text-xs">{e.note}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          {e.activity ? <Price tier={e.activity.priceTier} price={e.activity.price} size="sm" /> : <span />}
          <div className="flex gap-1">
            <button type="button" aria-pressed={e.state === "interested"} aria-label="Mark interested" disabled={pending} onClick={() => setState("interested")} className={cn("grid size-8 place-items-center rounded-full", e.state === "interested" ? "bg-good-soft text-good" : "text-muted hover:bg-surface-2")}><ThumbsUp className="size-4" /></button>
            <button type="button" aria-pressed={e.state === "must_do"} aria-label="Mark must-do" disabled={pending} onClick={() => setState("must_do")} className={cn("grid size-8 place-items-center rounded-full", e.state === "must_do" ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2")}><Flame className="size-4" /></button>
          </div>
        </div>
      </div>
    </li>
  );
}

function CompareInline({ entries }: { entries: SavedEntry[] }) {
  if (!entries.length) return <EmptyState className="mt-6" title="No activities to compare" />;
  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-muted">Quick comparison of {entries.length} saved activities. For a detailed side-by-side with differences highlighted, use <ButtonLink href="/wishlist/compare" size="xs" variant="outline">Compare (up to 4)</ButtonLink></p>
      <div className="relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr><th className="px-3 py-2">Activity</th><th className="px-3 py-2">Destination</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Duration</th><th className="px-3 py-2">Difficulty</th><th className="px-3 py-2">December</th></tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {entries.map((e) => (
              <tr key={e.wishId}>
                <td className="px-3 py-2 font-medium"><Link href={e.href} className="hover:text-accent">{e.title}</Link></td>
                <td className="px-3 py-2">{e.destination}</td>
                <td className="px-3 py-2"><Price tier={e.activity!.priceTier} price={e.activity!.price} size="sm" showStatus={false} /></td>
                <td className="px-3 py-2">{e.activity!.durationText}</td>
                <td className="px-3 py-2 capitalize">{e.activity!.difficulty}</td>
                <td className="px-3 py-2"><DecemberBadge status={e.activity!.decemberStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
