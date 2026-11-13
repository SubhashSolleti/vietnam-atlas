import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, t } from "@/db/client";
import type { ActivityCardData } from "@/lib/activity-filters";
import { normalise } from "@/lib/activity-filters";
import { assignActivityImages } from "@/lib/image-pool";
import { heroOf, imagesFor, type ImageRef } from "./media";

/* ───────────── Catalogue snapshot (published records), cached in-process ───────────── */

export interface DestinationCardData {
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  kind: string;
  regionSlug: string;
  regionName: string;
  parentSlug: string | null;
  province: string;
  formerProvince: string | null;
  lat: number;
  lng: number;
  tagline: string;
  summary: string;
  daysMin: number;
  daysMax: number;
  spendingLevel: number;
  adventureLevel: number;
  popularity: number;
  months: string;
  highlights: string[];
  featured: boolean;
  activityCount: number;
  freeCount: number;
  image: ImageRef | null;
}

interface Snapshot {
  destinations: DestinationCardData[];
  activities: ActivityCardData[];
  regions: { id: string; slug: string; name: string; tagline: string; summary: string; description: string; climate: string; highlights: string[]; image: ImageRef | null; destinationCount: number }[];
  builtAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __atlasSnapshot: Snapshot | undefined;
  // eslint-disable-next-line no-var
  var __atlasSnapshotBuilding: Promise<Snapshot> | undefined;
}

export function invalidateCatalog() {
  globalThis.__atlasSnapshot = undefined;
  globalThis.__atlasSnapshotBuilding = undefined;
}

async function buildSnapshot(): Promise<Snapshot> {
  const regionRows = await db.select().from(t.regions).orderBy(asc(t.regions.sort)).all();
  const regionById = new Map(regionRows.map((r) => [r.id, r]));
  const destRows = await db.select().from(t.destinations).where(eq(t.destinations.status, "published")).all();
  const destById = new Map(destRows.map((d) => [d.id, d]));
  const actRows = (await db
    .select()
    .from(t.activities)
    .where(eq(t.activities.status, "published"))
    .all())
    .filter((a) => destById.has(a.destinationId));
  const actIds = actRows.map((a) => a.id);

  const catRows = await db
    .select({ activityId: t.activityCategoryLinks.activityId, slug: t.activityCategories.slug, kind: t.activityCategories.kind })
    .from(t.activityCategoryLinks)
    .innerJoin(t.activityCategories, eq(t.activityCategories.id, t.activityCategoryLinks.categoryId))
    .all();
  const cats = new Map<string, { categories: string[]; themes: string[] }>();
  for (const c of catRows) {
    const e = cats.get(c.activityId) ?? { categories: [], themes: [] };
    (c.kind === "theme" ? e.themes : e.categories).push(c.slug);
    cats.set(c.activityId, e);
  }
  const prices = new Map(
    (await db
      .select()
      .from(t.activityPrices)
      .where(eq(t.activityPrices.isCurrent, true))
      .all())
      .map((p) => [p.activityId, p]),
  );
  const attrRows = await db.select({ id: t.attractions.id, lat: t.attractions.lat, lng: t.attractions.lng }).from(t.attractions).all();
  const attrById = new Map(attrRows.map((a) => [a.id, a]));

  const destImages = await imagesFor("destination", destRows.map((d) => d.id));
  const actImages = await imagesFor("activity", actIds);
  const attrImages = await imagesFor("attraction", attrRows.map((a) => a.id));
  const regionImages = await imagesFor("region", regionRows.map((r) => r.id));

  const attrDest = new Map(
    (await db.select({ id: t.attractions.id, destinationId: t.attractions.destinationId }).from(t.attractions).where(eq(t.attractions.status, "published")).all()).map((r) => [r.id, r.destinationId]),
  );
  const cardImages = assignActivityImages(actRows, actImages, attrImages, destImages, attrDest);

  const activities: ActivityCardData[] = actRows.map((a) => {
    const d = destById.get(a.destinationId)!;
    const p = prices.get(a.id);
    const chosen = cardImages.get(a.id);
    const img = chosen?.image;
    const own = chosen && !chosen.borrowed;
    const attr = a.attractionId ? attrById.get(a.attractionId) : null;
    return {
      id: a.id,
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      kind: a.kind,
      destinationId: d.id,
      destinationSlug: d.slug,
      destinationName: d.name,
      regionSlug: regionById.get(d.regionId)?.slug ?? "",
      priceTier: a.priceTier,
      price: p ? { minVnd: p.minVnd, maxVnd: p.maxVnd, unit: p.unit, status: p.status } : null,
      durationText: a.durationText,
      durationBucket: a.durationBucket,
      durationHours: a.durationHours,
      difficulty: a.difficulty,
      intensity: a.intensity,
      availability: a.availability,
      decemberStatus: a.decemberStatus,
      months: a.months,
      weatherDependent: a.weatherDependent,
      categories: cats.get(a.id)?.categories ?? [],
      themes: cats.get(a.id)?.themes ?? [],
      suitability: a.suitability,
      featured: a.featured,
      lat: attr?.lat ?? d.lat,
      lng: attr?.lng ?? d.lng,
      image: img
        ? {
            src: img.src,
            alt: own ? img.alt : `${img.alt}representative image for ${a.title}`,
            width: img.width,
            height: img.height,
            representative: !own || img.representative,
            author: img.author,
            license: img.license,
            sourceUrl: img.sourceUrl,
          }
        : null,
    };
  });

  const counts = new Map<string, { all: number; free: number }>();
  for (const a of activities) {
    const c = counts.get(a.destinationId) ?? { all: 0, free: 0 };
    c.all++;
    if (a.priceTier === "free") c.free++;
    counts.set(a.destinationId, c);
  }

  const destinations: DestinationCardData[] = destRows.map((d) => {
    const r = regionById.get(d.regionId)!;
    // Parent destinations (e.g. Mekong Delta) aggregate their children's activities.
    const childIds = destRows.filter((c) => c.parentId === d.id).map((c) => c.id);
    const agg = [d.id, ...childIds].reduce(
      (s, id) => ({ all: s.all + (counts.get(id)?.all ?? 0), free: s.free + (counts.get(id)?.free ?? 0) }),
      { all: 0, free: 0 },
    );
    return {
      id: d.id,
      slug: d.slug,
      name: d.name,
      localName: d.localName,
      kind: d.kind,
      regionSlug: r.slug,
      regionName: r.name,
      parentSlug: d.parentId ? (destById.get(d.parentId)?.slug ?? null) : null,
      province: d.province,
      formerProvince: d.formerProvince,
      lat: d.lat,
      lng: d.lng,
      tagline: d.tagline,
      summary: d.summary,
      daysMin: d.daysMin,
      daysMax: d.daysMax,
      spendingLevel: d.spendingLevel,
      adventureLevel: d.adventureLevel,
      popularity: d.popularity,
      months: d.months,
      highlights: d.highlights,
      featured: d.featured,
      activityCount: agg.all,
      freeCount: agg.free,
      image: heroOf(destImages.get(d.id)),
    };
  });

  const regions = regionRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    summary: r.summary,
    description: r.description,
    climate: r.climate,
    highlights: r.highlights,
    image: heroOf(regionImages.get(r.id)),
    destinationCount: destinations.filter((d) => d.regionSlug === r.slug && !d.parentSlug).length,
  }));

  return { destinations, activities, regions, builtAt: Date.now() };
}

/**
 * The published catalogue, cached per server instance. On Vercel several instances run at once, so an admin edit
 * refreshes the instance that made it immediately and the others within a minute.
 */
export async function getCatalog(): Promise<Snapshot> {
  const s = globalThis.__atlasSnapshot;
  if (s && Date.now() - s.builtAt < 60_000) return s;
  // Concurrent requests share one rebuild.
  globalThis.__atlasSnapshotBuilding ??= buildSnapshot()
    .then((snap) => (globalThis.__atlasSnapshot = snap))
    .finally(() => (globalThis.__atlasSnapshotBuilding = undefined));
  return globalThis.__atlasSnapshotBuilding;
}

/* ───────────── Detail queries ───────────── */

export async function getDestinationBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const d = await db.select().from(t.destinations).where(eq(t.destinations.slug, slug)).get();
  if (!d || (!opts.includeUnpublished && d.status !== "published")) return null;
  const region = (await db.select().from(t.regions).where(eq(t.regions.id, d.regionId)).get())!;
  const parent = d.parentId ? await db.select().from(t.destinations).where(eq(t.destinations.id, d.parentId)).get() : null;
  const children = await db
    .select()
    .from(t.destinations)
    .where(and(eq(t.destinations.parentId, d.id), eq(t.destinations.status, "published")))
    .all();
  const attractions = await db
    .select()
    .from(t.attractions)
    .where(and(eq(t.attractions.destinationId, d.id), eq(t.attractions.status, "published")))
    .all();
  const images = (await imagesFor("destination", [d.id])).get(d.id) ?? [];
  const attractionImages = await imagesFor("attraction", attractions.map((a) => a.id));
  const nearby = await db
    .select({ rel: t.destinationRelationships, dest: t.destinations })
    .from(t.destinationRelationships)
    .innerJoin(t.destinations, eq(t.destinations.id, t.destinationRelationships.toId))
    .where(and(eq(t.destinationRelationships.fromId, d.id), eq(t.destinations.status, "published")))
    .all();
  const catalog = await getCatalog();
  const scope = new Set([d.id, ...children.map((c) => c.id)]);
  const activities = catalog.activities.filter((a) => scope.has(a.destinationId));
  const sources = await sourcesFor("destination", [d.id]);
  return {
    destination: d,
    region,
    parent,
    children: children.map((c) => catalog.destinations.find((x) => x.id === c.id)).filter(Boolean) as DestinationCardData[],
    attractions: attractions.map((a) => ({ ...a, images: attractionImages.get(a.id) ?? [] })),
    images,
    nearby: nearby.map((n) => ({
      ...n.rel,
      card: catalog.destinations.find((c) => c.id === n.dest.id) ?? null,
    })),
    activities,
    sources,
  };
}

export async function getAttractionBySlug(slug: string) {
  const a = await db.select().from(t.attractions).where(eq(t.attractions.slug, slug)).get();
  if (!a || a.status !== "published") return null;
  const d = (await db.select().from(t.destinations).where(eq(t.destinations.id, a.destinationId)).get())!;
  const images = (await imagesFor("attraction", [a.id])).get(a.id) ?? [];
  const linked = new Set(
    (await db.select({ id: t.activities.id }).from(t.activities).where(eq(t.activities.attractionId, a.id)).all()).map((r) => r.id),
  );
  const activities = (await getCatalog()).activities.filter((x) => linked.has(x.id));
  return { attraction: a, destination: d, images, activities, sources: await sourcesFor("attraction", [a.id]) };
}

export async function getActivityBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const a = await db.select().from(t.activities).where(eq(t.activities.slug, slug)).get();
  if (!a || (!opts.includeUnpublished && a.status !== "published")) return null;
  const d = (await db.select().from(t.destinations).where(eq(t.destinations.id, a.destinationId)).get())!;
  const region = (await db.select().from(t.regions).where(eq(t.regions.id, d.regionId)).get())!;
  const attraction = a.attractionId ? await db.select().from(t.attractions).where(eq(t.attractions.id, a.attractionId)).get() : null;
  const price = await db
    .select()
    .from(t.activityPrices)
    .where(and(eq(t.activityPrices.activityId, a.id), eq(t.activityPrices.isCurrent, true)))
    .get();
  const cats = await db
    .select({ slug: t.activityCategories.slug, name: t.activityCategories.name, kind: t.activityCategories.kind })
    .from(t.activityCategoryLinks)
    .innerJoin(t.activityCategories, eq(t.activityCategories.id, t.activityCategoryLinks.categoryId))
    .where(eq(t.activityCategoryLinks.activityId, a.id))
    .all();
  const own = (await imagesFor("activity", [a.id])).get(a.id) ?? [];
  const attrImgs = attraction ? ((await imagesFor("attraction", [attraction.id])).get(attraction.id) ?? []) : [];
  const destImgs = (await imagesFor("destination", [d.id])).get(d.id) ?? [];
  const alts = await db.select().from(t.activityAlternatives).where(eq(t.activityAlternatives.activityId, a.id)).all();
  const catalog = await getCatalog();
  const card = (id: string) => catalog.activities.find((x) => x.id === id);
  const nearbyAttractions = await db
    .select()
    .from(t.attractions)
    .where(and(eq(t.attractions.destinationId, d.id), eq(t.attractions.status, "published"), a.attractionId ? ne(t.attractions.id, a.attractionId) : undefined))
    .limit(6)
    .all();
  const reviews = await db
    .select({ r: t.reviews, name: t.users.displayName })
    .from(t.reviews)
    .innerJoin(t.users, eq(t.users.id, t.reviews.userId))
    .where(and(eq(t.reviews.activityId, a.id), eq(t.reviews.status, "published")))
    .all();
  return {
    activity: a,
    destination: d,
    region,
    attraction,
    price: price ?? null,
    categories: cats,
    images: { own, attraction: attrImgs, destination: destImgs },
    freeAlternatives: alts.filter((x) => x.type === "free").map((x) => card(x.alternativeId)).filter(Boolean) as ActivityCardData[],
    paidAlternatives: alts.filter((x) => x.type === "paid").map((x) => card(x.alternativeId)).filter(Boolean) as ActivityCardData[],
    related: catalog.activities
      .filter((x) => x.destinationId === d.id && x.id !== a.id)
      .filter((x) => x.categories.some((c) => cats.some((k) => k.slug === c)))
      .slice(0, 8),
    nearbyAttractions,
    reviews,
    sources: await sourcesFor("activity", [a.id]),
    card: card(a.id) ?? null,
  };
}

export async function sourcesFor(entityType: string, ids: string[]) {
  return (ids.length ? await db
    .select({ v: t.sourceVerifications, s: t.sources })
    .from(t.sourceVerifications)
    .innerJoin(t.sources, eq(t.sources.id, t.sourceVerifications.sourceId))
    .where(and(eq(t.sourceVerifications.entityType, entityType), inArray(t.sourceVerifications.entityId, ids)))
    .all() : [])
    .map(({ v, s }) => ({
      id: v.id,
      entityId: v.entityId,
      title: s.title,
      url: s.url,
      publisher: s.publisher,
      kind: s.kind,
      checked: v.checked,
      status: v.status,
      confidence: v.confidence,
      verifiedAt: v.verifiedAt,
    }));
}

/* ───────────── Global search ───────────── */

export type SearchKind = "destination" | "region" | "attraction" | "activity" | "food" | "guide" | "transport";

export interface SearchHit {
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  image?: string | null;
  score: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __atlasSearchIndex: { builtAt: number; docs: (Omit<SearchHit, "score"> & { text: string; boost: number })[] } | undefined;
}

async function searchIndex() {
  const cached = globalThis.__atlasSearchIndex;
  const snap = await getCatalog();
  if (cached && cached.builtAt >= snap.builtAt) return cached.docs;
  const docs: (Omit<SearchHit, "score"> & { text: string; boost: number })[] = [];
  for (const r of snap.regions)
    docs.push({ kind: "region", title: r.name, subtitle: r.tagline, href: `/explore/${r.slug}`, image: r.image?.src, text: normalise(`${r.name} ${r.summary}`), boost: 3 });
  for (const d of snap.destinations)
    docs.push({
      kind: "destination",
      title: d.name,
      subtitle: `${d.regionName} · ${d.province}`,
      href: `/destinations/${d.slug}`,
      image: d.image?.src,
      text: normalise(`${d.name} ${d.localName ?? ""} ${d.province} ${d.formerProvince ?? ""} ${d.tagline} ${d.highlights.join(" ")}`),
      boost: 4,
    });
  for (const a of snap.activities)
    docs.push({
      kind: a.categories.includes("food") ? "food" : "activity",
      title: a.title,
      subtitle: a.destinationName,
      href: `/experiences/${a.slug}`,
      image: a.image?.src,
      text: normalise(`${a.title} ${a.destinationName} ${a.summary} ${a.categories.join(" ")}`),
      boost: 2,
    });
  const attrs = await db
    .select({ a: t.attractions, d: t.destinations })
    .from(t.attractions)
    .innerJoin(t.destinations, eq(t.destinations.id, t.attractions.destinationId))
    .where(eq(t.attractions.status, "published"))
    .all();
  for (const { a, d } of attrs)
    docs.push({ kind: "attraction", title: a.name, subtitle: `Attraction · ${d.name}`, href: `/attractions/${a.slug}`, text: normalise(`${a.name} ${a.localName ?? ""} ${d.name} ${a.kind}`), boost: 3 });
  const dests = await db.select({ slug: t.destinations.slug, name: t.destinations.name, food: t.destinations.food }).from(t.destinations).where(eq(t.destinations.status, "published")).all();
  for (const d of dests)
    for (const dish of d.food.dishes)
      docs.push({
        kind: "food",
        title: dish.name,
        subtitle: `Local dish · ${d.name}`,
        href: `/destinations/${d.slug}#food`,
        text: normalise(`${dish.name} ${dish.localName ?? ""} ${dish.description} food dish`),
        boost: 1,
      });
  const guides = await db
    .select({ g: t.travelGuides, s: t.guideSections })
    .from(t.travelGuides)
    .innerJoin(t.guideSections, eq(t.guideSections.id, t.travelGuides.sectionId))
    .where(eq(t.travelGuides.status, "published"))
    .all();
  for (const { g, s } of guides)
    docs.push({
      kind: s.slug.includes("transport") ? "transport" : "guide",
      title: g.title,
      subtitle: `Travel guide · ${s.title}`,
      href: `/guide/${s.slug}#${g.slug}`,
      text: normalise(`${g.title} ${g.summary} ${s.title}`),
      boost: 2,
    });
  globalThis.__atlasSearchIndex = { builtAt: snap.builtAt, docs };
  return docs;
}

export async function search(q: string, opts: { kinds?: SearchKind[]; limit?: number } = {}): Promise<SearchHit[]> {
  const terms = normalise(q).split(/\s+/).filter((x) => x.length > 0);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const d of await searchIndex()) {
    if (opts.kinds?.length && !opts.kinds.includes(d.kind)) continue;
    if (!terms.every((term) => d.text.includes(term))) continue;
    const title = normalise(d.title);
    let score = d.boost;
    if (title === terms.join(" ")) score += 20;
    else if (title.startsWith(terms[0]!)) score += 8;
    else if (terms.every((term) => title.includes(term))) score += 5;
    hits.push({ kind: d.kind, title: d.title, subtitle: d.subtitle, href: d.href, image: d.image, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, opts.limit ?? 30);
}
