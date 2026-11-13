import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/services/catalog";
import { resolveActiveTrip } from "@/services/trips";
import { MapExplorer, type ExplorerPoint } from "@/components/map/map-explorer";

export const metadata: Metadata = {
  title: "Interactive map of Vietnam",
  description: "Explore Vietnam's destinations, attractions and experiences on an interactive map with region and category filters.",
  alternates: { canonical: "/map" },
};

const ATTR_TAGS: Record<string, string[]> = {
  beach: ["beaches"], heritage_site: ["heritage"], temple: ["heritage"], pagoda: ["heritage"], church: ["heritage"], museum: ["heritage"], landmark: ["heritage"],
  nature_reserve: ["nature"], waterfall: ["nature"], cave: ["nature", "adventure"], mountain: ["nature", "adventure"], park: ["nature"], lake: ["nature"], island: ["nature", "beaches"],
  market: ["food"], street: ["nightlife"], viewpoint: ["nature"], village: ["heritage"], theme_park: ["adventure"],
};

export default async function MapPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { destinations, activities } = await getCatalog();
  const destRegion = new Map(destinations.map((d) => [d.id, d.regionSlug]));
  const attrs = await db.select({ a: t.attractions, d: t.destinations }).from(t.attractions).innerJoin(t.destinations, eq(t.destinations.id, t.attractions.destinationId)).where(eq(t.attractions.status, "published")).all();

  const points: ExplorerPoint[] = [
    ...destinations.map((d) => ({ id: d.id, kind: "destination" as const, title: d.name, subtitle: d.tagline, region: d.regionSlug, lat: d.lat, lng: d.lng, href: `/destinations/${d.slug}`, image: d.image?.src ?? null, tags: [] as string[], meta: `${d.activityCount} experiences`, destinationSlug: d.slug })),
    ...attrs
      .filter(({ a }) => a.lat != null && a.lng != null)
      .map(({ a, d }) => ({ id: a.id, kind: "attraction" as const, title: a.name, subtitle: `Attraction · ${d.name}`, region: destRegion.get(d.id) ?? "", lat: a.lat!, lng: a.lng!, href: `/attractions/${a.slug}`, image: null, tags: [...(ATTR_TAGS[a.kind] ?? []), a.isFree ? "free" : "paid"], meta: a.isFree ? "Free entry" : a.feeText.slice(0, 60), destinationSlug: d.slug })),
    ...activities
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => {
        const tags: string[] = [a.priceTier === "free" ? "free" : "paid"];
        if (a.categories.includes("adventure") || a.categories.includes("water_sports") || a.themes.includes("extreme")) tags.push("adventure");
        if (a.themes.includes("beach")) tags.push("beaches");
        if (a.themes.includes("heritage") || a.categories.includes("historical") || a.categories.includes("cultural")) tags.push("heritage");
        if (a.categories.includes("nature") || a.categories.includes("wildlife")) tags.push("nature");
        if (a.categories.includes("food")) tags.push("food");
        if (a.categories.includes("nightlife")) tags.push("nightlife");
        return { id: a.id, kind: "activity" as const, title: a.title, subtitle: a.destinationName, region: a.regionSlug, lat: a.lat!, lng: a.lng!, href: `/experiences/${a.slug}`, image: a.image?.src ?? null, tags, meta: a.priceTier === "free" ? "Free" : a.durationText, destinationSlug: a.destinationSlug };
      }),
  ];

  const user = await getCurrentUser();
  const active = await resolveActiveTrip(user?.id);
  let stops: { id: string; name: string; lat: number; lng: number; dates: string }[] = [];
  if (active) {
    const days = await db.select().from(t.itineraryDays).where(eq(t.itineraryDays.tripId, active.trip.id)).orderBy(asc(t.itineraryDays.date)).all();
    const byId = new Map(destinations.map((d) => [d.id, d]));
    for (const d of days) {
      const dest = d.destinationId ? byId.get(d.destinationId) : null;
      if (!dest) continue;
      const last = stops.at(-1);
      if (last?.id === dest.id) last.dates = `${last.dates.split(" – ")[0]} – ${d.date.slice(5)}`;
      else stops.push({ id: dest.id, name: dest.name, lat: dest.lat, lng: dest.lng, dates: d.date.slice(5) });
    }
  } else stops = [];

  return (
    <MapExplorer
      points={points}
      stops={stops}
      tripName={active?.trip.name ?? null}
      initial={{ q: sp.q ?? "", region: sp.region ?? "", destination: sp.destination ?? "", tag: sp.tag ?? (sp.tier === "free" ? "free" : "") }}
    />
  );
}
