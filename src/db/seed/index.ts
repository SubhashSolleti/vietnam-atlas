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

const db = openDatabase();
const ROOT = resolve(import.meta.dirname, "../../..");
const VERIFIED_AT = "2026-11-12";


async function loadBundles(): Promise<DestinationBundle[]> {
  const dir = join(ROOT, "src/content/catalog");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts").sort();
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

const sourceCache = new Map<string, string>();
function upsertSource(s: SourceRef) {
  const key = `${s.url}|${s.title}`;
  const cached = sourceCache.get(key);
  if (cached) return cached;
  const row = db
    .insert(t.sources)
    .values({ title: s.title, url: s.url, publisher: s.publisher, kind: s.kind })
    .onConflictDoNothing()
    .returning({ id: t.sources.id })
    .get();
  const id = row?.id ?? db.select({ id: t.sources.id }).from(t.sources).where(eq(t.sources.url, s.url)).get()!.id;
  sourceCache.set(key, id);
  return id;
}

function linkSources(entityType: string, entityId: string, list: SourceRef[]) {
  for (const s of list) {
    db.insert(t.sourceVerifications)
      .values({
        sourceId: upsertSource(s),
        entityType,
        entityId,
        checked: s.checked,
        status: s.status,
        confidence: s.confidence,
        verifiedAt: VERIFIED_AT,
        verifiedBy: "Seed content review",
      })
      .run();
  }
}

const media = manifest();
const mediaIdByFile = new Map<string, string>();
function linkMedia(entityType: "region" | "destination" | "attraction" | "activity", entityId: string, key: string, altBase: string) {
  const entries = media.get(key) ?? [];
  entries.forEach((e, i) => {
    let mediaId = mediaIdByFile.get(e.file);
    if (!mediaId) {
      mediaId = db
        .insert(t.media)
        .values({
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
        })
        .returning({ id: t.media.id })
        .get().id;
      mediaIdByFile.set(e.file, mediaId);
    }
    db.insert(t.entityMedia)
      .values({ entityType, entityId, mediaId, role: i === 0 ? "hero" : "gallery", sort: i })
      .run();
  });
}

async function main() {
  const started = Date.now();
  const bundles = await loadBundles();

  db.transaction(() => {
    /* Taxonomy */
    let sort = 0;
    for (const [slug, name] of Object.entries(CATEGORY_LABELS))
      db.insert(t.activityCategories).values({ slug, name, kind: "category", sort: sort++ }).run();
    for (const [slug, name] of Object.entries(THEME_LABELS))
      db.insert(t.activityCategories).values({ slug, name, kind: "theme", sort: sort++ }).run();
    const catId = new Map(db.select().from(t.activityCategories).all().map((c) => [c.slug, c.id]));

    /* Regions */
    const regionId = new Map<string, string>();
    regions.forEach((r, i) => {
      const row = db
        .insert(t.regions)
        .values({ ...r, sort: i })
        .returning({ id: t.regions.id })
        .get();
      regionId.set(r.slug, row.id);
      linkMedia("region", row.id, `region:${r.slug}`, r.name);
    });

    /* Destinations */
    const destId = new Map<string, string>();
    const allDests = bundles.flatMap((b) => b.destinations);
    for (const d of allDests) {
      const row = db
        .insert(t.destinations)
        .values({
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
        })
        .returning({ id: t.destinations.id })
        .get();
      destId.set(d.slug, row.id);
      linkSources("destination", row.id, d.sources);
      linkMedia("destination", row.id, `destination:${d.slug}`, d.name);
    }
    for (const d of allDests) {
      if (d.parentSlug && destId.has(d.parentSlug))
        db.update(t.destinations).set({ parentId: destId.get(d.parentSlug)! }).where(eq(t.destinations.id, destId.get(d.slug)!)).run();
      for (const n of d.nearby) {
        if (!destId.has(n.slug) || n.slug === d.slug) continue;
        db.insert(t.destinationRelationships)
          .values({ fromId: destId.get(d.slug)!, toId: destId.get(n.slug)!, distanceKm: Math.round(n.distanceKm), travel: n.travel })
          .onConflictDoNothing()
          .run();
      }
    }

    /* Attractions */
    const attrId = new Map<string, string>();
    for (const a of bundles.flatMap((b) => b.attractions)) {
      if (!destId.has(a.destinationSlug)) continue;
      const row = db
        .insert(t.attractions)
        .values({
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
        })
        .returning({ id: t.attractions.id })
        .get();
      attrId.set(a.slug, row.id);
      linkSources("attraction", row.id, a.sources);
      linkMedia("attraction", row.id, `attraction:${a.slug}`, a.name);
    }

    /* Activities */
    const actId = new Map<string, string>();
    const allActs = bundles.flatMap((b) => b.activities);
    for (const a of allActs) {
      if (!destId.has(a.destinationSlug)) continue;
      const row = db
        .insert(t.activities)
        .values({
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
        })
        .returning({ id: t.activities.id })
        .get();
      actId.set(a.slug, row.id);
      for (const c of new Set([...a.categories, ...a.themes])) {
        const id = catId.get(c);
        if (id) db.insert(t.activityCategoryLinks).values({ activityId: row.id, categoryId: id }).onConflictDoNothing().run();
      }
      db.insert(t.activityPrices)
        .values({
          activityId: row.id,
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
        })
        .run();
      linkSources("activity", row.id, a.sources);
      linkMedia("activity", row.id, `activity:${a.slug}`, a.title);
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
          if (to && to !== from) db.insert(t.activityAlternatives).values({ activityId: from, alternativeId: to, type }).onConflictDoNothing().run();
        }
    }

    /* Budget categories */
    budgetCategories.forEach((c, i) =>
      db
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
        .run(),
    );

    /* Settings */
    db.insert(t.settings).values({ key: "fx", value: DEFAULT_FX, updatedBy: "seed" }).run();
    db.insert(t.settings)
      .values({ key: "site", value: { name: "Vietnam Atlas", tagline: "Discover More. Experience Vietnam. Plan Together." } })
      .run();
    // Editorial imagery for the homepage (hero + discovery themes), editable in Admin → Settings.
    const ref = (key: string, index = 0) => {
      const e = media.get(key)?.[index];
      return e ? { src: e.file, width: e.width, height: e.height, alt: e.title, author: e.author, license: e.license, sourceUrl: e.sourceUrl } : null;
    };
    const themes: Record<string, unknown> = {};
    for (const k of media.keys()) if (k.startsWith("theme:")) themes[k.slice(6)] = ref(k);
    db.insert(t.settings).values({ key: "site_media", value: { hero: ref("site:hero"), heroAlt: ref("site:hero", 1), themes } }).run();

    console.log(`✓ Catalogue: ${destId.size} destinations, ${attrId.size} attractions, ${actId.size} activities, ${sourceCache.size} sources, ${mediaIdByFile.size} images`);
  });

  /* Guide, checklists, networking (optional files written by content authors) */
  const guide = await optionalImport<{ guideSections: import("../../content/guide-types").GuideSectionSeed[] }>("src/content/guide.ts");
  const checklists = await optionalImport<{
    preparationChecklist: import("../../content/guide-types").ChecklistItemSeed[];
    packingChecklist: import("../../content/guide-types").ChecklistItemSeed[];
  }>("src/content/checklists.ts");
  const networking = await optionalImport<{
    communities: import("../../content/guide-types").CommunitySeed[];
    professionalEvents: import("../../content/guide-types").ProfessionalEventSeed[];
  }>("src/content/networking.ts");

  db.transaction(() => {
    guide?.guideSections.forEach((s, i) => {
      const sec = db
        .insert(t.guideSections)
        .values({ slug: s.slug, letter: s.letter, title: s.title, summary: s.summary, icon: s.icon, sort: i })
        .returning({ id: t.guideSections.id })
        .get();
      s.articles.forEach((a, j) => {
        const row = db
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
          .get();
        linkSources("guide", row.id, a.sources);
      });
    });
    let k = 0;
    for (const [list, items] of [
      ["preparation", checklists?.preparationChecklist ?? []],
      ["packing", checklists?.packingChecklist ?? []],
    ] as const)
      for (const it of items)
        db.insert(t.preparationChecklists)
          .values({ list, group: it.group, label: it.label, detail: it.detail, dueDaysBefore: it.dueDaysBefore, sort: k++ })
          .run();
    for (const c of networking?.communities ?? []) {
      const row = db
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
        .get();
      linkSources("organiser", row.id, c.sources);
    }
    for (const e of networking?.professionalEvents ?? []) {
      const row = db
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
        .get();
      linkSources("event", row.id, e.sources);
    }
    console.log(
      `✓ Guide: ${guide?.guideSections.length ?? 0} sections · checklists: ${k} items · communities: ${networking?.communities.length ?? 0} · events: ${networking?.professionalEvents.length ?? 0}`,
    );
  });

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
  db.transaction(() => {
    const admin = db
      .insert(t.users)
      .values({ email: "admin@atlas.local", passwordHash: hashPasswordSync(adminPassword), displayName: "Atlas Admin", role: "super_admin", isGuest: false, avatarColor: "#173F35" })
      .returning({ id: t.users.id })
      .get();
    db.insert(t.users)
      .values({ email: "editor@atlas.local", passwordHash: hashPasswordSync(editorPassword), displayName: "Content Editor", role: "content_editor", isGuest: false, avatarColor: "#C96F50" })
      .run();

    const trip = db
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
      .get();
    demoTrip.members.forEach((m, i) => {
      const row = db
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
        .get();
      db.insert(t.tripPreferences).values({ memberId: row.id }).run();
    });
    // Itinerary days
    const dates: string[] = [];
    for (let d = new Date(`${trip.startDate}T00:00:00Z`); d <= new Date(`${trip.endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1))
      dates.push(d.toISOString().slice(0, 10));
    const dest = (slug: string) => db.select({ id: t.destinations.id }).from(t.destinations).where(eq(t.destinations.slug, slug)).get()?.id ?? null;
    const dayIds = new Map<string, string>();
    for (const date of dates) {
      const destinationId = date === trip.startDate ? dest("phu-quoc") : date === trip.endDate ? dest("hanoi") : null;
      const row = db.insert(t.itineraryDays).values({ tripId: trip.id, date, destinationId }).returning({ id: t.itineraryDays.id }).get();
      dayIds.set(date, row.id);
    }
    // Fixed international flights
    const [outbound, inbound] = demoTrip.fixedFlights;
    const legOut = db
      .insert(t.transportLegs)
      .values({
        tripId: trip.id,
        toDestinationId: dest(outbound.toDestination ?? ""),
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
      .get();
    const legIn = db
      .insert(t.transportLegs)
      .values({
        tripId: trip.id,
        fromDestinationId: dest(inbound.fromDestination ?? ""),
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
      .get();
    db.insert(t.itineraryItems)
      .values([
        { tripId: trip.id, dayId: dayIds.get(trip.startDate)!, sort: 0, type: "transport", transportLegId: legOut.id, title: "Land at Phu Quoc (PQC): flight from Hyderabad", startTime: "15:30", durationMin: 75, notes: "Booked. Allow time for immigration and the transfer to your stay." },
        { tripId: trip.id, dayId: dayIds.get(trip.endDate)!, sort: 0, type: "transport", transportLegId: legIn.id, title: "Transfer to Noi Bai & fly Hanoi → Hyderabad (12:20)", startTime: "09:15", durationMin: 185, notes: "Booked. Leave central Hanoi about 3 hours before departure." },
      ])
      .run();
    console.log(`✓ Demo trip "${trip.name}" with ${demoTrip.members.length} seats: invite code ${trip.inviteCode}`);
  });

  console.log(`\nSeed complete in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  if (generated.length) {
    // Shown once and kept only in a local, git-ignored file readable by this OS user.
    const file = join(ROOT, "data/initial-credentials.txt");
    writeFileSync(file, `Generated ${new Date().toISOString()}change these after first login.\n${generated.join("\n")}\n`, { mode: 0o600 });
    console.log(`\nGenerated staff passwords (also saved to data/initial-credentials.txt):\n  ${generated.join("\n  ")}`);
  } else console.log("Staff passwords taken from SEED_ADMIN_PASSWORD / SEED_EDITOR_PASSWORD.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
