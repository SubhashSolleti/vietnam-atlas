/**
 * Seeds a freshly-migrated database. Run via `npm run db:reset` (drops, migrates, seeds).
 *
 * Content comes from src/content/** (typed seed files). After seeding, the admin CMS is
 * the source of truth; nothing in the app reads the seed files at runtime.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import { openDatabase } from "../open";
import * as t from "../schema";
import type { DestinationBundle, MediaManifestEntry, SourceRef } from "../../content/types";
import { regions } from "../../content/regions";
import { CATEGORY_LABELS, THEME_LABELS } from "../../content/taxonomy";
import { budgetCategories, demoTrip } from "../../content/demo-trip";
import { UNIT_CAPACITY } from "../../content/unit-capacity";
import { BUNDLE_OF } from "../../content/ticket-bundles";
import { DEFAULT_FX } from "../../lib/money";
import { hashPasswordSync } from "./password";

// Seeding runs on an empty database and is simply re-run on failure, so it uses plain statements (no transactions).
const { db, client } = openDatabase("migrations");
const ROOT = resolve(import.meta.dirname, "../../..");
const VERIFIED_AT = "2026-11-12";

async function loadBundles(): Promise<DestinationBundle[]> {
  const dir = join(ROOT, "src/content/catalog");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .sort();
  const out: DestinationBundle[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    out.push(mod.default as DestinationBundle);
  }
  return out;
}

async function optionalImport<T>(rel: string): Promise<T | null> {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return (await import(pathToFileURL(p).href)) as T;
}

function manifest(): Map<string, MediaManifestEntry[]> {
  const p = join(ROOT, "src/content/media-manifest.json");
  const map = new Map<string, MediaManifestEntry[]>();
  if (!existsSync(p)) {
    console.warn("! No media manifest found: run `npm run media -- sync`. Pages will show image fallbacks.");
    return map;
  }
  const entries = JSON.parse(readFileSync(p, "utf8")) as MediaManifestEntry[];
  for (const e of entries) {
    const base = e.key.replace(/:\d+$/, "");
    const list = map.get(base) ?? [];
    list.push(e);
    map.set(base, list);
  }
  // The lowest index is the hero; compare numerically so ":10" sorts after ":2".
  const idx = (k: string) => Number(k.match(/:(\d+)$/)?.[1] ?? 0);
  for (const list of map.values()) list.sort((a, b) => idx(a.key) - idx(b.key));
  return map;
}

/*
 * Catalogue rows are buffered and written with multi-row INSERTs, a few hundred rows per round trip instead of
 * one. A remote database (Supabase from a Vercel build) costs ~100 ms per round trip, so row-at-a-time seeding of
 * ~7,000 rows took over half an hour. Ids are generated here, so children can reference parents before either is written.
 */
type AnyTable = Parameters<typeof db.insert>[0];
const pending = new Map<AnyTable, { rows: Record<string, unknown>[]; ignoreConflicts: boolean }>();
const newId = () => crypto.randomUUID();
function defer<T extends AnyTable>(table: T, row: T["$inferInsert"], ignoreConflicts = false) {
  const entry = pending.get(table) ?? { rows: [], ignoreConflicts };
  entry.rows.push(row as Record<string, unknown>);
  pending.set(table, entry);
}
// Referenced tables are written first (in this order); the rest only reference these.
const PARENTS: AnyTable[] = [t.regions, t.media, t.sources, t.destinations, t.attractions, t.activities];
async function flush() {
  const rank = (table: AnyTable) => (PARENTS.includes(table) ? PARENTS.indexOf(table) : PARENTS.length);
  for (const table of [...pending.keys()].sort((a, b) => rank(a) - rank(b))) {
    const { rows, ignoreConflicts } = pending.get(table)!;
    for (let i = 0; i < rows.length; i += 400) {
      const q = db.insert(table).values(rows.slice(i, i + 400) as never);
      await (ignoreConflicts ? q.onConflictDoNothing() : q);
    }
  }
  pending.clear();
}

// Deduplicated on (url, title), the same key as the sources unique index.
const sourceCache = new Map<string, string>();
function upsertSource(s: SourceRef) {
  const key = `${s.url}|${s.title}`;
  const cached = sourceCache.get(key);
  if (cached) return cached;
  const id = newId();
  defer(t.sources, {
    id,
    title: s.title,
    url: s.url,
    publisher: s.publisher,
    kind: s.kind,
  });
  sourceCache.set(key, id);
  return id;
}

function linkSources(entityType: string, entityId: string, list: SourceRef[]) {
  for (const s of list) {
    defer(t.sourceVerifications, {
      sourceId: upsertSource(s),
      entityType,
      entityId,
      checked: s.checked,
      status: s.status,
      confidence: s.confidence,
      verifiedAt: VERIFIED_AT,
      verifiedBy: "Seed content review",
    });
  }
}

const media = manifest();
const mediaIdByFile = new Map<string, string>();
function linkMedia(entityType: "region" | "destination" | "attraction" | "activity", entityId: string, key: string, altBase: string) {
  const entries = media.get(key) ?? [];
  for (const [i, e] of entries.entries()) {
    let mediaId = mediaIdByFile.get(e.file);
    if (!mediaId) {
      mediaId = newId();
      defer(t.media, {
        id: mediaId,
        src: e.file,
        width: e.width,
        height: e.height,
        alt: `${altBase}${e.title ? `${e.title}` : ""}`.slice(0, 240),
        title: e.title,
        author: e.author,
        license: e.license,
        licenseUrl: e.licenseUrl,
        sourceUrl: e.sourceUrl,
        representative: false,
      });
      mediaIdByFile.set(e.file, mediaId);
    }
    defer(t.entityMedia, {
      entityType,
      entityId,
      mediaId,
      role: i === 0 ? "hero" : "gallery",
      sort: i,
    });
  }
}

async function main() {
  const started = Date.now();
  const bundles = await loadBundles();

  await (async () => {
    /* Taxonomy */
    let sort = 0;
    for (const [slug, name] of Object.entries(CATEGORY_LABELS))
      await db.insert(t.activityCategories).values({ slug, name, kind: "category", sort: sort++ }).run();
    for (const [slug, name] of Object.entries(THEME_LABELS)) await db.insert(t.activityCategories).values({ slug, name, kind: "theme", sort: sort++ }).run();
    const catId = new Map((await db.select().from(t.activityCategories).all()).map((c) => [c.slug, c.id]));

    /* Regions */
    const regionId = new Map<string, string>();
    for (const [i, r] of regions.entries()) {
      const id = newId();
      defer(t.regions, { ...r, id, sort: i });
      regionId.set(r.slug, id);
      linkMedia("region", id, `region:${r.slug}`, r.name);
    }

    /* Destinations (parents before children: the self-reference is checked as rows are written) */
    const allDests = bundles.flatMap((b) => b.destinations);
    const destId = new Map(allDests.map((d) => [d.slug, newId()]));
    for (const d of [...allDests].sort((a, b) => Number(!!a.parentSlug) - Number(!!b.parentSlug))) {
      const id = destId.get(d.slug)!;
      defer(t.destinations, {
        id,
        parentId: d.parentSlug ? destId.get(d.parentSlug) : undefined,
        slug: d.slug,
        name: d.name,
        localName: d.localName,
        kind: d.kind,
        regionId: regionId.get(d.region)!,
        province: d.province,
        formerProvince: d.formerProvince,
        lat: d.lat,
        lng: d.lng,
        tagline: d.tagline,
        summary: d.summary,
        intro: d.intro,
        whySpecial: d.whySpecial,
        whyVisit: d.whyVisit,
        uniqueText: d.unique,
        idealFor: d.idealFor,
        daysMin: d.recommendedDays.min,
        daysMax: d.recommendedDays.max,
        travelStyle: d.travelStyle,
        spendingLevel: d.spendingLevel,
        adventureLevel: d.adventureLevel,
        popularity: d.popularity,
        highlights: d.highlights,
        months: d.months.join(""),
        weather: d.weather,
        decemberNote: d.decemberNote,
        transportHubs: d.transportHubs,
        food: d.food,
        nightlife: d.nightlife,
        practical: d.practical,
        featured: ["phu-quoc", "hanoi", "ha-long-bay", "sa-pa", "ninh-binh", "da-lat", "da-nang", "hoi-an", "ho-chi-minh-city"].includes(d.slug),
        status: "published",
        updatedBy: "seed",
      });
      linkSources("destination", id, d.sources);
      linkMedia("destination", id, `destination:${d.slug}`, d.name);
    }
    for (const d of allDests) {
      for (const n of d.nearby) {
        if (!destId.has(n.slug) || n.slug === d.slug) continue;
        defer(
          t.destinationRelationships,
          {
            fromId: destId.get(d.slug)!,
            toId: destId.get(n.slug)!,
            distanceKm: Math.round(n.distanceKm),
            travel: n.travel,
          },
          true,
        );
      }
    }

    /* Attractions */
    const attrId = new Map<string, string>();
    for (const a of bundles.flatMap((b) => b.attractions)) {
      if (!destId.has(a.destinationSlug)) continue;
      const id = newId();
      defer(t.attractions, {
        id,
        slug: a.slug,
        destinationId: destId.get(a.destinationSlug)!,
        name: a.name,
        localName: a.localName,
        kind: a.kind,
        lat: a.lat,
        lng: a.lng,
        description: a.description,
        whatToSee: a.whatToSee,
        whatToDo: a.whatToDo,
        openingHoursText: a.openingHours.text,
        openingHoursStatus: a.openingHours.status,
        feeText: a.entranceFee.text,
        feeMinVnd: a.entranceFee.minVnd,
        feeMaxVnd: a.entranceFee.maxVnd,
        feeStatus: a.entranceFee.status,
        visitDuration: a.visitDuration,
        accessibility: a.accessibility,
        distanceFromCentre: a.distanceFromCentre,
        seasonality: a.seasonality,
        officialUrl: a.officialUrl,
        booking: a.booking,
        isFree: a.isFree,
        updatedBy: "seed",
      });
      attrId.set(a.slug, id);
      linkSources("attraction", id, a.sources);
      linkMedia("attraction", id, `attraction:${a.slug}`, a.name);
    }

    /* Activities */
    const actId = new Map<string, string>();
    const allActs = bundles.flatMap((b) => b.activities);
    for (const a of allActs) {
      if (!destId.has(a.destinationSlug)) continue;
      const id = newId();
      defer(t.activities, {
        id,
        slug: a.slug,
        destinationId: destId.get(a.destinationSlug)!,
        attractionId: a.attractionSlug ? attrId.get(a.attractionSlug) : undefined,
        title: a.title,
        kind: a.kind,
        priceTier: a.priceTier,
        summary: a.summary,
        description: a.description,
        whatYouDo: a.whatYouDo,
        steps: a.steps,
        durationBucket: a.duration.bucket,
        durationText: a.duration.text,
        durationHours: a.duration.hours,
        difficulty: a.difficulty,
        intensity: a.intensity,
        minAge: a.minAge,
        skills: a.skills,
        safety: a.safety,
        availability: a.availability,
        months: a.months.join(""),
        decemberStatus: a.decemberStatus,
        decemberNote: a.decemberNote,
        weatherDependent: a.weatherDependent,
        minParticipants: a.minParticipants,
        suitability: a.suitability,
        groupNote: a.groupNote,
        booking: a.booking,
        cancellation: a.cancellation,
        bring: a.bring,
        wear: a.wear,
        transport: a.transport,
        accessibility: a.accessibility,
        providerLinks: a.providerLinks,
        featured: !!a.featured,
        updatedBy: "seed",
      });
      actId.set(a.slug, id);
      for (const c of new Set([...a.categories, ...a.themes])) {
        const categoryId = catId.get(c);
        if (categoryId) defer(t.activityCategoryLinks, { activityId: id, categoryId }, true);
      }
      defer(t.activityPrices, {
        activityId: id,
        minVnd: a.price.minVnd,
        maxVnd: a.price.maxVnd,
        unit: a.price.unit,
        basis: a.price.basis,
        status: a.price.status,
        audience: a.price.audience ?? "adult",
        includes: a.price.includes ?? [],
        excludes: a.price.excludes ?? [],
        extras: a.price.extras ?? [],
        validity: a.price.validity,
        unitCapacity: UNIT_CAPACITY[a.slug]?.capacity ?? null,
        ticketBundle: BUNDLE_OF[a.slug] ?? null,
        // Only verified prices carry a verification date; estimates were compiled, not checked.
        verifiedAt: a.price.status.startsWith("verified") ? VERIFIED_AT : null,
      });
      linkSources("activity", id, a.sources);
      linkMedia("activity", id, `activity:${a.slug}`, a.title);
    }
    for (const a of allActs) {
      const from = actId.get(a.slug);
      if (!from) continue;
      for (const [type, list] of [
        ["free", a.freeAlternatives],
        ["paid", a.paidAlternatives],
      ] as const)
        for (const s of list) {
          const to = actId.get(s);
          if (to && to !== from) defer(t.activityAlternatives, { activityId: from, alternativeId: to, type }, true);
        }
    }
    await flush();

    /* Budget categories */
    for (const [i, c] of budgetCategories.entries()) {
      await db
        .insert(t.budgetCategories)
        .values({
          slug: c.slug,
          name: c.name,
          description: c.description,
          budgetPerDay: c.perDay?.[0] ?? null,
          balancedPerDay: c.perDay?.[1] ?? null,
          comfortablePerDay: c.perDay?.[2] ?? null,
          sort: i,
        })
        .run();
    }

    /* Settings */
    await db.insert(t.settings).values({ key: "fx", value: DEFAULT_FX, updatedBy: "seed" }).run();
    await db
      .insert(t.settings)
      .values({
        key: "site",
        value: {
          name: "Vietnam Atlas",
          tagline: "Discover More. Experience Vietnam. Plan Together.",
        },
      })
      .run();
    // Editorial imagery for the homepage (hero + discovery themes), editable in Admin → Settings.
    const ref = (key: string, index = 0) => {
      const e = media.get(key)?.[index];
      return e
        ? {
            src: e.file,
            width: e.width,
            height: e.height,
            alt: e.title,
            author: e.author,
            license: e.license,
            sourceUrl: e.sourceUrl,
          }
        : null;
    };
    const themes: Record<string, unknown> = {};
    for (const k of media.keys()) if (k.startsWith("theme:")) themes[k.slice(6)] = ref(k);
    await db
      .insert(t.settings)
      .values({
        key: "site_media",
        value: { hero: ref("site:hero"), heroAlt: ref("site:hero", 1), themes },
      })
      .run();

    console.log(
      `✓ Catalogue: ${destId.size} destinations, ${attrId.size} attractions, ${actId.size} activities, ${sourceCache.size} sources, ${mediaIdByFile.size} images`,
    );
  })();

  /* Guide, checklists, networking (optional files written by content authors) */
  const guide = await optionalImport<{
    guideSections: import("../../content/guide-types").GuideSectionSeed[];
  }>("src/content/guide.ts");
  const checklists = await optionalImport<{
    preparationChecklist: import("../../content/guide-types").ChecklistItemSeed[];
    packingChecklist: import("../../content/guide-types").ChecklistItemSeed[];
  }>("src/content/checklists.ts");
  const networking = await optionalImport<{
    communities: import("../../content/guide-types").CommunitySeed[];
    professionalEvents: import("../../content/guide-types").ProfessionalEventSeed[];
  }>("src/content/networking.ts");

  await (async () => {
    for (const [i, s] of (guide?.guideSections ?? []).entries()) {
      const sec = (await db
        .insert(t.guideSections)
        .values({
          slug: s.slug,
          letter: s.letter,
          title: s.title,
          summary: s.summary,
          icon: s.icon,
          sort: i,
        })
        .returning({ id: t.guideSections.id })
        .get())!;
      for (const [j, a] of s.articles.entries()) {
        const row = (await db
          .insert(t.travelGuides)
          .values({
            sectionId: sec.id,
            slug: a.slug,
            title: a.title,
            kind: a.kind,
            summary: a.summary,
            body: a.body,
            keyFacts: a.keyFacts ?? [],
            warnings: a.warnings ?? [],
            lastVerified: a.lastVerified,
            sort: j,
          })
          .returning({ id: t.travelGuides.id })
          .get())!;
        linkSources("guide", row.id, a.sources);
      }
    }
    let k = 0;
    for (const [list, items] of [
      ["preparation", checklists?.preparationChecklist ?? []],
      ["packing", checklists?.packingChecklist ?? []],
    ] as const)
      for (const it of items)
        defer(t.preparationChecklists, {
          list,
          group: it.group,
          label: it.label,
          detail: it.detail,
          dueDaysBefore: it.dueDaysBefore,
          sort: k++,
        });
    for (const c of networking?.communities ?? []) {
      const row = (await db
        .insert(t.eventOrganisers)
        .values({
          slug: c.slug,
          name: c.name,
          type: c.type,
          city: c.city,
          description: c.description,
          organiser: c.organiser,
          url: c.url,
          howToEngage: c.howToEngage,
          cadence: c.cadence,
          price: c.price,
          status: c.status,
        })
        .returning({ id: t.eventOrganisers.id })
        .get())!;
      linkSources("organiser", row.id, c.sources);
    }
    for (const e of networking?.professionalEvents ?? []) {
      const row = (await db
        .insert(t.professionalEvents)
        .values({
          slug: e.slug,
          name: e.name,
          type: e.type,
          city: e.city,
          startDate: e.startDate,
          endDate: e.endDate,
          venue: e.venue,
          price: e.price,
          registrationUrl: e.registrationUrl,
          description: e.description,
          organiser: e.organiser,
          lastVerified: e.lastVerified,
        })
        .returning({ id: t.professionalEvents.id })
        .get())!;
      linkSources("event", row.id, e.sources);
    }
    await flush();
    console.log(
      `✓ Guide: ${guide?.guideSections.length ?? 0} sections · checklists: ${k} items · communities: ${networking?.communities.length ?? 0} · events: ${networking?.professionalEvents.length ?? 0}`,
    );
  })();

  /* Users & demo workspace */
  // Never fall back to a published password: generate strong ones unless the operator supplies them.
  const generated: string[] = [];
  const secret = (env: string | undefined, label: string) => {
    if (env && env.length >= 12) return env;
    if (env) throw new Error(`${label} must be at least 12 characters.`);
    const pw = randomBytes(15).toString("base64url");
    generated.push(`${label}: ${pw}`);
    return pw;
  };
  const adminPassword = secret(process.env.SEED_ADMIN_PASSWORD, "admin@atlas.local");
  const editorPassword = secret(process.env.SEED_EDITOR_PASSWORD, "editor@atlas.local");
  // The demo trip is a real group's private workspace: its invite code must not be guessable.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const demoInviteCode = (process.env.DEMO_INVITE_CODE ?? Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join("")).toUpperCase();
  await (async () => {
    const admin = (await db
      .insert(t.users)
      .values({
        email: "admin@atlas.local",
        passwordHash: hashPasswordSync(adminPassword),
        displayName: "Atlas Admin",
        role: "super_admin",
        isGuest: false,
        avatarColor: "#173F35",
      })
      .returning({ id: t.users.id })
      .get())!;
    await db
      .insert(t.users)
      .values({
        email: "editor@atlas.local",
        passwordHash: hashPasswordSync(editorPassword),
        displayName: "Content Editor",
        role: "content_editor",
        isGuest: false,
        avatarColor: "#C96F50",
      })
      .run();

    const trip = (await db
      .insert(t.trips)
      .values({
        name: demoTrip.name,
        description: demoTrip.description,
        startDate: demoTrip.startDate,
        endDate: demoTrip.endDate,
        travellersCount: demoTrip.travellersCount,
        budgetMinInr: demoTrip.budgetMinInr,
        budgetMaxInr: demoTrip.budgetMaxInr,
        budgetTargetInr: demoTrip.budgetTargetInr,
        currency: demoTrip.currency,
        scenario: demoTrip.scenario,
        inviteCode: demoInviteCode,
        createdBy: admin.id,
        settings: demoTrip.settings,
      })
      .returning()
      .get())!;
    for (const [i, m] of demoTrip.members.entries()) {
      const row = (await db
        .insert(t.tripMembers)
        .values({
          tripId: trip.id,
          // The owner seat belongs to the site operator; the other seats are claimed with the invite code.
          userId: m.role === "owner" ? admin.id : null,
          joinedAt: m.role === "owner" ? new Date().toISOString() : null,
          displayName: m.displayName,
          role: m.role,
          travellerType: m.travellerType,
          coupleGroup: "coupleGroup" in m ? m.coupleGroup : null,
          avatarColor: m.avatarColor,
          sort: i,
        })
        .returning({ id: t.tripMembers.id })
        .get())!;
      await db.insert(t.tripPreferences).values({ memberId: row.id }).run();
    }
    // Itinerary days
    const dates: string[] = [];
    for (let d = new Date(`${trip.startDate}T00:00:00Z`); d <= new Date(`${trip.endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1))
      dates.push(d.toISOString().slice(0, 10));
    const dest = async (slug: string) =>
      (await db.select({ id: t.destinations.id }).from(t.destinations).where(eq(t.destinations.slug, slug)).get())?.id ?? null;
    const dayIds = new Map<string, string>();
    for (const date of dates) {
      const destinationId = date === trip.startDate ? await dest("phu-quoc") : date === trip.endDate ? await dest("hanoi") : null;
      const row = (await db.insert(t.itineraryDays).values({ tripId: trip.id, date, destinationId }).returning({ id: t.itineraryDays.id }).get())!;
      dayIds.set(date, row.id);
    }
    // Fixed international flights
    const [outbound, inbound] = demoTrip.fixedFlights;
    const legOut = (await db
      .insert(t.transportLegs)
      .values({
        tripId: trip.id,
        toDestinationId: await dest(outbound.toDestination ?? ""),
        fromLabel: outbound.fromLabel,
        toLabel: outbound.toLabel,
        mode: "flight",
        departAt: outbound.departAt,
        arriveAt: outbound.arriveAt,
        costVnd: 0,
        isFixed: true,
        isInternational: true,
        status: "booked",
        notes: outbound.notes,
      })
      .returning({ id: t.transportLegs.id })
      .get())!;
    const legIn = (await db
      .insert(t.transportLegs)
      .values({
        tripId: trip.id,
        fromDestinationId: await dest(inbound.fromDestination ?? ""),
        fromLabel: inbound.fromLabel,
        toLabel: inbound.toLabel,
        mode: "flight",
        departAt: inbound.departAt,
        arriveAt: inbound.arriveAt,
        costVnd: 0,
        isFixed: true,
        isInternational: true,
        status: "booked",
        notes: inbound.notes,
      })
      .returning({ id: t.transportLegs.id })
      .get())!;
    await db
      .insert(t.itineraryItems)
      .values([
        {
          tripId: trip.id,
          dayId: dayIds.get(trip.startDate)!,
          sort: 0,
          type: "transport",
          transportLegId: legOut.id,
          title: "Land at Phu Quoc (PQC): flight from Hyderabad",
          startTime: "15:30",
          durationMin: 75,
          notes: "Booked. Allow time for immigration and the transfer to your stay.",
        },
        {
          tripId: trip.id,
          dayId: dayIds.get(trip.endDate)!,
          sort: 0,
          type: "transport",
          transportLegId: legIn.id,
          title: "Transfer to Noi Bai & fly Hanoi → Hyderabad (12:20)",
          startTime: "09:15",
          durationMin: 185,
          notes: "Booked. Leave central Hanoi about 3 hours before departure.",
        },
      ])
      .run();
    console.log(`✓ Demo trip "${trip.name}" with ${demoTrip.members.length} seats: invite code ${trip.inviteCode}`);
  })();

  console.log(`\nSeed complete in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  if (generated.length) {
    // Shown once and kept only in a local, git-ignored file readable by this OS user.
    const file = join(ROOT, "data/initial-credentials.txt");
    writeFileSync(file, `Generated ${new Date().toISOString()}change these after first login.\n${generated.join("\n")}\n`, { mode: 0o600 });
    console.log(`\nGenerated staff passwords (also saved to data/initial-credentials.txt):\n  ${generated.join("\n  ")}`);
  } else console.log("Staff passwords taken from SEED_ADMIN_PASSWORD / SEED_EDITOR_PASSWORD.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
