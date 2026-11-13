"use client";

import { Layers, Route, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { normalise } from "@/lib/activity-filters";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { AtlasMap, type MapPin } from "./atlas-map";

export type ExplorerPoint = {
  id: string;
  kind: "destination" | "attraction" | "activity";
  title: string;
  subtitle: string;
  region: string;
  lat: number;
  lng: number;
  href: string;
  image: string | null;
  tags: string[];
  meta: string;
  destinationSlug: string;
};

const TAGS = [
  ["adventure", "Adventure"],
  ["beaches", "Beaches"],
  ["heritage", "Heritage"],
  ["nature", "Nature"],
  ["food", "Food"],
  ["nightlife", "Nightlife"],
  ["free", "Free"],
  ["paid", "Paid"],
] as const;

const REGIONS = [
  ["", "All regions"],
  ["north", "North"],
  ["central", "Central"],
  ["south", "South"],
] as const;

export function MapExplorer({ points, stops, tripName, initial }: { points: ExplorerPoint[]; stops: { id: string; name: string; lat: number; lng: number; dates: string }[]; tripName: string | null; initial: { q: string; region: string; destination: string; tag: string } }) {
  const [layers, setLayers] = useState({ destination: true, attraction: true, activity: false });
  const [region, setRegion] = useState(initial.region);
  const [tags, setTags] = useState<string[]>(initial.tag ? [initial.tag] : []);
  const [q, setQ] = useState(initial.q);
  const [showRoute, setShowRoute] = useState(stops.length > 0);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const visible = useMemo(() => {
    const terms = normalise(q).split(/\s+/).filter(Boolean);
    return points.filter((p) => {
      if (!layers[p.kind]) return false;
      if (region && p.region !== region) return false;
      if (initial.destination && p.destinationSlug !== initial.destination && p.kind !== "destination") return false;
      if (tags.length && p.kind !== "destination" && !tags.some((t) => p.tags.includes(t))) return false;
      if (tags.length && p.kind === "destination" && !layers.attraction && !layers.activity) return true;
      if (tags.length && p.kind === "destination") return false;
      if (terms.length && !terms.every((t) => normalise(`${p.title} ${p.subtitle}`).includes(t))) return false;
      return true;
    });
  }, [points, layers, region, tags, q, initial.destination]);

  const pins = useMemo<MapPin[]>(
    () => [
      ...visible.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, kind: p.kind, title: p.title, subtitle: p.subtitle, href: p.href, image: p.image, meta: p.meta })),
      ...(showRoute ? stops.map((s, i) => ({ id: `stop-${i}`, lat: s.lat, lng: s.lng, kind: "stop" as const, label: String(i + 1), title: s.name, subtitle: `Your trip · ${s.dates}`, href: "/trip" })) : []),
    ],
    [visible, stops, showRoute],
  );
  const routes = useMemo(() => (showRoute && stops.length > 1 ? [{ id: "trip", points: stops.map((s) => [s.lat, s.lng] as [number, number]) }] : []), [showRoute, stops]);
  // Counts per layer reflect the other filters, independent of whether the layer is switched on.
  const counts = useMemo(() => {
    const terms = normalise(q).split(/\s+/).filter(Boolean);
    const base = points.filter(
      (p) =>
        (!region || p.region === region) &&
        (!tags.length || p.kind === "destination" || tags.some((t) => p.tags.includes(t))) &&
        (!terms.length || terms.every((t) => normalise(`${p.title} ${p.subtitle}`).includes(t))),
    );
    return { destination: base.filter((p) => p.kind === "destination").length, attraction: base.filter((p) => p.kind === "attraction").length, activity: base.filter((p) => p.kind === "activity").length };
  }, [points, region, tags, q]);

  const controls = (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <label htmlFor="map-q" className="sr-only">Search the map</label>
        <input id="map-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places…" className="field h-10 pl-9" />
      </div>
      <fieldset>
        <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase"><Layers className="size-3.5" />Show</legend>
        {(["destination", "attraction", "activity"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />
            <span className={cn("size-2.5 rounded-full", k === "destination" ? "bg-forest" : k === "attraction" ? "bg-[#B8892F]" : "bg-jade")} />
            {k === "destination" ? "Destinations" : k === "attraction" ? "Attractions" : "Activities"}
            <span className="ml-auto text-xs text-muted tabular-nums">{counts[k]}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Region</legend>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={region === v} onClick={() => setRegion(v)} className={cn("h-7 rounded-full border px-2.5 text-xs", region === v ? "border-brand bg-brand text-brand-ink" : "border-line text-muted")}>{l}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Categories</legend>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map(([v, l]) => {
            const on = tags.includes(v);
            return <button key={v} type="button" aria-pressed={on} onClick={() => setTags(on ? tags.filter((x) => x !== v) : [...tags, v])} className={cn("h-7 rounded-full border px-2.5 text-xs", on ? "border-brand bg-brand text-brand-ink" : "border-line text-muted")}>{l}</button>;
          })}
        </div>
        {tags.length > 0 && <p className="mt-2 text-xs text-muted">Category filters apply to attractions and activities.</p>}
      </fieldset>
      {stops.length > 0 && (
        <label className="flex items-center gap-2 rounded-sm bg-accent-soft px-3 py-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={showRoute} onChange={(e) => setShowRoute(e.target.checked)} />
          <Route className="size-4 text-accent" />Show my itinerary route{tripName ? ` (${tripName})` : ""}
        </label>
      )}
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Results ({visible.length})</p>
        <ul className="max-h-[38vh] space-y-0.5 overflow-y-auto pr-1">
          {visible.slice(0, 150).map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { setSelected(p.id); setPanelOpen(false); }} className={cn("w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-surface-2", selected === p.id && "bg-surface-2 font-medium")}>
                {p.title} <span className="text-xs text-muted">· {p.kind}</span>
              </button>
            </li>
          ))}
          {visible.length > 150 && <li className="px-2 py-1 text-xs text-muted">Zoom or filter to narrow {visible.length - 150} more…</li>}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="relative h-[calc(100dvh-4rem)] lg:grid lg:grid-cols-[320px_1fr]">
      <aside className="hidden overflow-y-auto border-r border-line bg-surface p-5 lg:block" aria-label="Map filters">
        <h1 className="mb-1 text-2xl">Map explorer</h1>
        <p className="mb-5 text-xs text-muted">Pins open a preview. Map data © OpenStreetMap contributors (needs an internet connection for map tiles).</p>
        {controls}
      </aside>
      <div className="relative h-full pb-14 lg:pb-0">
        <h1 className="sr-only lg:hidden">Map explorer</h1>
        <AtlasMap pins={pins} routes={routes} selectedId={selected} onSelect={setSelected} className="rounded-none" ariaLabel="Interactive map of Vietnam" />
        <button type="button" onClick={() => setPanelOpen(true)} className="absolute top-3 right-3 z-[400] flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium shadow-[var(--shadow-pop)] lg:hidden">
          <Layers className="size-4" /> Filters · {visible.length}
        </button>
        {/* A real modal dialog: focus moves in, Escape closes, focus returns to the Filters button. */}
        <Dialog open={panelOpen} onClose={() => setPanelOpen(false)} title="Map filters" size="lg">
          {controls}
          <Link href="/destinations" className="mt-6 block text-sm text-accent underline">Prefer a list? Browse destinations</Link>
        </Dialog>
      </div>
    </div>
  );
}
