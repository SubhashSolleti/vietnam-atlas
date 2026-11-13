"use server";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run, UserError } from "@/lib/action";
import { ADMIN_ROLES, requireRole, type CurrentUser } from "@/lib/auth";
import { uploadsDir } from "@/lib/uploads";
import { slugify } from "@/lib/utils";
import { invalidateCatalog } from "@/services/catalog";
import { setSetting } from "@/services/settings";

const STATUSES = ["verified_official", "verified_provider", "reference", "estimated", "community", "needs_verification", "temporarily_unavailable"] as const;
const lines = z.string().transform((s) => s.split("\n").map((x) => x.trim()).filter(Boolean));
const months = z.string().regex(/^[0-3]{12}$/, "Months must be 12 digits from 0 (avoid) to 3 (excellent)");

function audit(user: CurrentUser, action: string, entityType: string, entityId: string | null, summary: string, diff?: Record<string, unknown>) {
  db.insert(t.adminAuditLogs).values({ actorId: user.id, actorName: user.displayName, action, entityType, entityId, summary, diff: diff ?? null }).run();
}

function afterContentChange() {
  invalidateCatalog();
  revalidatePath("/", "layout");
}

/* ───────────── Activities ───────────── */

const activitySchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(140),
  slug: z.string().trim().max(120).optional(),
  destinationId: z.string().uuid("Choose a destination"),
  attractionId: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
  kind: z.enum(["activity", "attraction_visit", "food", "nightlife", "tour", "show", "shopping"]),
  priceTier: z.enum(["free", "low", "paid"]),
  summary: z.string().trim().max(200),
  description: z.string().trim().max(4000),
  whatYouDo: lines,
  steps: lines,
  durationBucket: z.enum(["under_1h", "1_3h", "half_day", "full_day", "overnight", "multi_day"]),
  durationText: z.string().trim().min(1, "Describe the duration").max(80),
  durationHours: z.coerce.number().min(0).max(240),
  difficulty: z.enum(["easy", "moderate", "challenging", "extreme"]),
  intensity: z.coerce.number().int().min(1).max(5),
  minAge: z.string().trim().max(80).optional(),
  skills: z.string().trim().max(400),
  safety: lines,
  availability: z.enum(["year_round", "seasonal", "weather_dependent", "temporarily_closed", "not_verified"]),
  months,
  decemberStatus: z.enum(["good", "variable", "poor", "closed", "unknown"]),
  decemberNote: z.string().trim().max(600),
  weatherDependent: z.boolean(),
  minParticipants: z.string().trim().max(80).optional(),
  suitability: z.array(z.enum(["couples", "groups", "solo", "social", "adventure_seekers"])),
  groupNote: z.string().trim().max(600),
  booking: z.string().trim().max(800),
  cancellation: z.string().trim().max(600).optional(),
  bring: lines,
  wear: lines,
  transport: z.string().trim().max(800),
  accessibility: z.string().trim().max(600),
  providerLinks: z.string().transform((s, ctx) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, url] = l.split("|").map((x) => x.trim());
        if (!name || !url || !/^https?:\/\//.test(url)) {
          ctx.addIssue({ code: "custom", message: `Provider link must be "Name | https://…": ${l}` });
          return { name: "", url: "" };
        }
        return { name, url };
      }),
  ),
  categories: z.array(z.string()).max(30),
  featured: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
  price: z.object({
    minVnd: z.coerce.number().int().min(0),
    maxVnd: z.coerce.number().int().min(0),
    unit: z.enum(["per_person", "per_group", "per_boat", "per_vehicle"]),
    basis: z.string().trim().max(600),
    status: z.enum(STATUSES),
    audience: z.enum(["adult", "child", "all"]),
    includes: lines,
    excludes: lines,
    extras: lines,
    validity: z.string().trim().max(200).optional(),
  }),
});

/** Publishing gate: incomplete records can be saved as drafts but not published. */
function publishProblems(v: z.output<typeof activitySchema>, sourceCount: number) {
  const p: string[] = [];
  if (v.summary.length < 20) p.push("Summary must be at least 20 characters.");
  if (v.description.length < 60) p.push("Description must be at least 60 characters.");
  if (!v.steps.length) p.push("Add at least one step.");
  if (!v.whatYouDo.length) p.push("Add at least one “what you'll do” item.");
  if (!v.categories.length) p.push("Choose at least one category.");
  if (!v.safety.length) p.push("Add at least one safety note.");
  if (v.priceTier !== "free" && v.price.maxVnd === 0) p.push("Paid activities need a price range.");
  if (v.priceTier === "free" && v.price.maxVnd > 0) p.push("Free activities can't have a price.");
  if (v.price.minVnd > v.price.maxVnd) p.push("Minimum price is above the maximum.");
  if (v.priceTier !== "free" && !v.price.basis) p.push("Explain the basis of the price.");
  if (v.price.status.startsWith("verified") && sourceCount === 0) p.push("A verified price needs at least one source.");
  if (sourceCount === 0) p.push("Add at least one source before publishing.");
  return p;
}

export async function saveActivity(id: string | null, input: z.input<typeof activitySchema>) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = activitySchema.parse(input);
    const slug = slugify(v.slug || v.title);
    if (!slug) throw new UserError("Slug is required.");
    const dupe = db.select({ id: t.activities.id }).from(t.activities).where(eq(t.activities.slug, slug)).get();
    if (dupe && dupe.id !== id) throw new UserError(`Another activity already uses the slug “${slug}”.`);
    const sourceCount = id ? db.select().from(t.sourceVerifications).where(and(eq(t.sourceVerifications.entityType, "activity"), eq(t.sourceVerifications.entityId, id))).all().length : 0;
    if (v.status === "published") {
      const problems = publishProblems(v, sourceCount);
      if (problems.length) throw new UserError(`Can't publish yet: ${problems.join(" ")}`);
    }
    const { price, categories, ...fields } = v;
    const values = { ...fields, slug, attractionId: v.attractionId ?? null, minAge: v.minAge || null, minParticipants: v.minParticipants || null, cancellation: v.cancellation || null, updatedBy: user.displayName };
    const before = id ? db.select().from(t.activities).where(eq(t.activities.id, id)).get() : null;
    const activityId = db.transaction((tx) => {
      let aid = id;
      if (aid) {
        if (!before) throw new UserError("Activity not found.");
        tx.update(t.activities).set(values).where(eq(t.activities.id, aid)).run();
      } else {
        aid = tx.insert(t.activities).values(values).returning({ id: t.activities.id }).get().id;
      }
      tx.delete(t.activityCategoryLinks).where(eq(t.activityCategoryLinks.activityId, aid)).run();
      const cats = tx.select().from(t.activityCategories).all();
      for (const c of categories) {
        const cat = cats.find((x) => x.slug === c);
        if (cat) tx.insert(t.activityCategoryLinks).values({ activityId: aid, categoryId: cat.id }).run();
      }
      const current = tx.select().from(t.activityPrices).where(and(eq(t.activityPrices.activityId, aid), eq(t.activityPrices.isCurrent, true))).get();
      const changed = !current || current.minVnd !== price.minVnd || current.maxVnd !== price.maxVnd || current.unit !== price.unit || current.status !== price.status || current.basis !== price.basis;
      if (changed) {
        // Keep price history: retire the old record and add a new current one.
        tx.update(t.activityPrices).set({ isCurrent: false }).where(eq(t.activityPrices.activityId, aid)).run();
        tx.insert(t.activityPrices).values({ activityId: aid, ...price, validity: price.validity || null, verifiedAt: new Date().toISOString().slice(0, 10) }).run();
      } else {
        tx.update(t.activityPrices).set({ includes: price.includes, excludes: price.excludes, extras: price.extras, audience: price.audience, validity: price.validity || null }).where(eq(t.activityPrices.id, current!.id)).run();
      }
      return aid;
    });
    audit(user, id ? "update" : "create", "activity", activityId, `${id ? "Updated" : "Created"} activity “${v.title}” (${v.status})`, before ? { statusBefore: before.status, statusAfter: v.status } : undefined);
    afterContentChange();
    return { id: activityId, slug };
  });
}

export async function setPublishStatus(entityType: "activity" | "destination" | "attraction", id: string, status: "draft" | "published" | "archived") {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    z.enum(["draft", "published", "archived"]).parse(status);
    z.enum(["activity", "destination", "attraction"]).parse(entityType);
    z.string().uuid().parse(id);
    const table = entityType === "activity" ? t.activities : entityType === "destination" ? t.destinations : t.attractions;
    const row = db.select({ id: table.id, status: table.status }).from(table).where(eq(table.id, id)).get();
    if (!row) throw new UserError("Not found.");
    if (status === "published") {
      const sources = db.select().from(t.sourceVerifications).where(and(eq(t.sourceVerifications.entityType, entityType), eq(t.sourceVerifications.entityId, id))).all();
      if (!sources.length) throw new UserError("Add at least one source before publishing.");
      if (entityType === "activity") {
        const a = db.select().from(t.activities).where(eq(t.activities.id, id)).get()!;
        const price = db.select().from(t.activityPrices).where(and(eq(t.activityPrices.activityId, id), eq(t.activityPrices.isCurrent, true))).get();
        const cats = db.select().from(t.activityCategoryLinks).where(eq(t.activityCategoryLinks.activityId, id)).all();
        if (!price || !cats.length || a.summary.length < 20 || !a.steps.length) throw new UserError("This activity is incomplete. Open the editor to see what's missing.");
      }
    }
    db.update(table).set({ status, updatedBy: user.displayName }).where(eq(table.id, id)).run();
    audit(user, status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish", entityType, id, `Set ${entityType} status ${row.status} → ${status}`);
    afterContentChange();
    return {};
  });
}

export async function toggleFeatured(entityType: "activity" | "destination", id: string, featured: boolean) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    z.enum(["activity", "destination"]).parse(entityType);
    z.boolean().parse(featured);
    const table = entityType === "activity" ? t.activities : t.destinations;
    db.update(table).set({ featured }).where(eq(table.id, id)).run();
    audit(user, "feature", entityType, id, `${featured ? "Featured" : "Unfeatured"} ${entityType}`);
    afterContentChange();
    return {};
  });
}

/* ───────────── Destinations ───────────── */

const destinationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  localName: z.string().trim().max(80).optional(),
  kind: z.enum(["city", "province", "island", "archipelago", "region", "bay", "national_park", "town", "rural_area"]),
  regionId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
  province: z.string().trim().min(2).max(80),
  formerProvince: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(8).max(24),
  lng: z.coerce.number().min(101).max(110),
  tagline: z.string().trim().min(5).max(90),
  summary: z.string().trim().min(20).max(400),
  intro: z.string().trim().min(40).max(4000),
  whySpecial: z.string().trim().max(2000),
  whyVisit: lines,
  uniqueText: z.string().trim().max(2000),
  idealFor: lines,
  daysMin: z.coerce.number().int().min(1).max(30),
  daysMax: z.coerce.number().int().min(1).max(30),
  travelStyle: z.string().trim().max(400),
  spendingLevel: z.coerce.number().int().min(1).max(4),
  adventureLevel: z.coerce.number().int().min(1).max(4),
  popularity: z.coerce.number().int().min(1).max(100),
  highlights: lines,
  months,
  weather: z.string().trim().max(2000),
  decemberNote: z.string().trim().max(1000),
  featured: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
  /** Advanced structured fields edited as JSON. */
  food: z.string(),
  nightlife: z.string(),
  practical: z.string(),
  transportHubs: z.string(),
});

function parseJson<T>(label: string, s: string, check: (x: unknown) => boolean): T {
  let v: unknown;
  try {
    v = JSON.parse(s);
  } catch {
    throw new UserError(`${label} is not valid JSON.`);
  }
  if (!check(v)) throw new UserError(`${label} doesn't have the expected structure.`);
  return v as T;
}

export async function saveDestination(id: string | null, input: z.input<typeof destinationSchema>) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = destinationSchema.parse(input);
    if (v.daysMax < v.daysMin) throw new UserError("Maximum days must be at least the minimum.");
    const slug = slugify(v.slug || v.name);
    const dupe = db.select({ id: t.destinations.id }).from(t.destinations).where(eq(t.destinations.slug, slug)).get();
    if (dupe && dupe.id !== id) throw new UserError(`Slug “${slug}” is already used.`);
    const food = parseJson<typeof t.destinations.$inferInsert.food>("Food", v.food, (x) => !!x && typeof x === "object" && Array.isArray((x as { dishes?: unknown }).dishes));
    const nightlife = parseJson<typeof t.destinations.$inferInsert.nightlife>("Nightlife", v.nightlife, Array.isArray);
    const practical = parseJson<typeof t.destinations.$inferInsert.practical>("Practical guide", v.practical, (x) => !!x && typeof x === "object" && "howToReach" in (x as object));
    const transportHubs = parseJson<typeof t.destinations.$inferInsert.transportHubs>("Transport hubs", v.transportHubs, Array.isArray);
    if (v.status === "published" && id) {
      const n = db.select().from(t.sourceVerifications).where(and(eq(t.sourceVerifications.entityType, "destination"), eq(t.sourceVerifications.entityId, id))).all().length;
      if (!n) throw new UserError("Add at least one source before publishing.");
    } else if (v.status === "published" && !id) throw new UserError("Save as a draft first, add sources and images, then publish.");
    const values = { ...v, slug, food, nightlife, practical, transportHubs, localName: v.localName || null, formerProvince: v.formerProvince || null, parentId: v.parentId ?? null, updatedBy: user.displayName };
    let did = id;
    if (id) db.update(t.destinations).set(values).where(eq(t.destinations.id, id)).run();
    else did = db.insert(t.destinations).values(values).returning({ id: t.destinations.id }).get().id;
    audit(user, id ? "update" : "create", "destination", did, `${id ? "Updated" : "Created"} destination “${v.name}” (${v.status})`);
    afterContentChange();
    return { id: did!, slug };
  });
}

/* ───────────── Attractions ───────────── */

const attractionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional(),
  destinationId: z.string().uuid(),
  localName: z.string().trim().max(120).optional(),
  kind: z.string().trim().min(2).max(40),
  lat: z.coerce.number().min(8).max(24).nullable().optional(),
  lng: z.coerce.number().min(101).max(110).nullable().optional(),
  description: z.string().trim().min(20).max(4000),
  whatToSee: lines,
  whatToDo: lines,
  openingHoursText: z.string().trim().min(1).max(400),
  openingHoursStatus: z.enum(STATUSES),
  feeText: z.string().trim().min(1).max(400),
  feeMinVnd: z.coerce.number().int().min(0).nullable().optional(),
  feeMaxVnd: z.coerce.number().int().min(0).nullable().optional(),
  feeStatus: z.enum(STATUSES),
  visitDuration: z.string().trim().max(80),
  accessibility: z.string().trim().max(600),
  distanceFromCentre: z.string().trim().max(120),
  seasonality: z.string().trim().max(600),
  officialUrl: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  booking: z.string().trim().max(600),
  isFree: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});

export async function saveAttraction(id: string | null, input: z.input<typeof attractionSchema>) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = attractionSchema.parse(input);
    const slug = slugify(v.slug || v.name);
    const dupe = db.select({ id: t.attractions.id }).from(t.attractions).where(eq(t.attractions.slug, slug)).get();
    if (dupe && dupe.id !== id) throw new UserError(`Slug “${slug}” is already used.`);
    if (v.status === "published") {
      const n = id ? db.select().from(t.sourceVerifications).where(and(eq(t.sourceVerifications.entityType, "attraction"), eq(t.sourceVerifications.entityId, id))).all().length : 0;
      if (!n) throw new UserError("Add at least one source before publishing (save as draft first).");
    }
    const values = { ...v, slug, localName: v.localName || null, lat: v.lat ?? null, lng: v.lng ?? null, feeMinVnd: v.feeMinVnd ?? null, feeMaxVnd: v.feeMaxVnd ?? null, officialUrl: v.officialUrl ?? null, updatedBy: user.displayName };
    let aid = id;
    if (id) db.update(t.attractions).set(values).where(eq(t.attractions.id, id)).run();
    else aid = db.insert(t.attractions).values(values).returning({ id: t.attractions.id }).get().id;
    audit(user, id ? "update" : "create", "attraction", aid, `${id ? "Updated" : "Created"} attraction “${v.name}”`);
    afterContentChange();
    return { id: aid!, slug };
  });
}

/* ───────────── Sources & verification ───────────── */

const sourceSchema = z.object({
  entityType: z.enum(["activity", "destination", "attraction", "guide", "organiser", "event"]),
  entityId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  url: z.string().url("Enter a full URL starting with https://"),
  publisher: z.string().trim().min(2).max(120),
  kind: z.enum(["official_tourism", "government", "attraction_official", "national_park", "transport", "provider", "publisher", "reference"]),
  checked: z.string().trim().min(2, "Say what was checked").max(200),
  status: z.enum(STATUSES),
  confidence: z.enum(["high", "medium", "low"]),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function addSource(input: z.input<typeof sourceSchema>) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = sourceSchema.parse(input);
    let source = db.select().from(t.sources).where(and(eq(t.sources.url, v.url), eq(t.sources.title, v.title))).get();
    if (!source) source = db.insert(t.sources).values({ title: v.title, url: v.url, publisher: v.publisher, kind: v.kind }).returning().get();
    db.insert(t.sourceVerifications)
      .values({ sourceId: source.id, entityType: v.entityType, entityId: v.entityId, checked: v.checked, status: v.status, confidence: v.confidence, verifiedAt: v.verifiedAt, verifiedBy: user.displayName })
      .run();
    audit(user, "add_source", v.entityType, v.entityId, `Added source “${v.title}” (${v.status})`);
    afterContentChange();
    return {};
  });
}

export async function updateVerification(id: string, input: { status: (typeof STATUSES)[number]; verifiedAt: string; confidence: "high" | "medium" | "low" }) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = z.object({ status: z.enum(STATUSES), verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), confidence: z.enum(["high", "medium", "low"]) }).parse(input);
    const row = db.select().from(t.sourceVerifications).where(eq(t.sourceVerifications.id, id)).get();
    if (!row) throw new UserError("Not found.");
    db.update(t.sourceVerifications).set({ ...v, verifiedBy: user.displayName }).where(eq(t.sourceVerifications.id, id)).run();
    audit(user, "verify", row.entityType, row.entityId, `Verification set to ${v.status} on ${v.verifiedAt}`);
    afterContentChange();
    return {};
  });
}

export async function removeVerification(id: string) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const row = db.select().from(t.sourceVerifications).where(eq(t.sourceVerifications.id, id)).get();
    if (!row) return {};
    db.delete(t.sourceVerifications).where(eq(t.sourceVerifications.id, id)).run();
    audit(user, "remove_source", row.entityType, row.entityId, "Removed a source citation");
    afterContentChange();
    return {};
  });
}

/* ───────────── Media ───────────── */

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function uploadImage(form: FormData) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const entityType = z.enum(["region", "destination", "attraction", "activity"]).parse(form.get("entityType"));
    const entityId = z.string().uuid().parse(form.get("entityId"));
    const alt = z.string().trim().min(5, "Alt text is required (describe the image)").max(240).parse(form.get("alt"));
    const author = z.string().trim().max(140).parse(form.get("author") ?? "");
    const license = z.string().trim().max(80).parse(form.get("license") ?? "");
    const sourceUrl = z.string().url().or(z.literal("")).parse(form.get("sourceUrl") ?? "");
    const representative = form.get("representative") === "on";
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Choose an image file.");
    if (!ALLOWED.has(file.type)) throw new UserError("Only JPEG, PNG, WebP or AVIF images are allowed.");
    if (file.size > 12 * 1024 * 1024) throw new UserError("Images must be 12 MB or smaller.");
    const buf = Buffer.from(await file.arrayBuffer());
    let meta;
    try {
      meta = await sharp(buf).metadata();
    } catch {
      throw new UserError("That file isn't a valid image.");
    }
    if (!meta.width || meta.width < 600) throw new UserError("Image must be at least 600px wide.");
    const name = `${entityType}-${entityId.slice(0, 8)}-${Date.now()}.webp`;
    const dir = uploadsDir();
    mkdirSync(dir, { recursive: true });
    const info = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer({ resolveWithObject: true });
    writeFileSync(join(dir, name), info.data);
    const m = db
      .insert(t.media)
      .values({ src: `/media/uploads/${name}`, width: info.info.width, height: info.info.height, alt, author: author || null, license: license || null, sourceUrl: sourceUrl || null, representative })
      .returning({ id: t.media.id })
      .get();
    const count = db.select().from(t.entityMedia).where(and(eq(t.entityMedia.entityType, entityType), eq(t.entityMedia.entityId, entityId))).all().length;
    db.insert(t.entityMedia).values({ entityType, entityId, mediaId: m.id, role: count === 0 ? "hero" : "gallery", sort: count }).run();
    audit(user, "add_image", entityType, entityId, `Uploaded image “${alt}”`);
    afterContentChange();
    return {};
  });
}

export async function updateImageLink(linkId: string, input: { role?: "hero" | "gallery"; sort?: number; alt?: string; remove?: boolean }) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    input = z
      .object({ role: z.enum(["hero", "gallery"]).optional(), sort: z.number().int().min(-1).max(1000).optional(), alt: z.string().optional(), remove: z.boolean().optional() })
      .parse(input);
    const link = db.select().from(t.entityMedia).where(eq(t.entityMedia.id, linkId)).get();
    if (!link) throw new UserError("Image not found.");
    if (input.remove) {
      db.delete(t.entityMedia).where(eq(t.entityMedia.id, linkId)).run();
      audit(user, "remove_image", link.entityType, link.entityId, "Removed an image");
    } else {
      if (input.role === "hero") {
        db.update(t.entityMedia).set({ role: "gallery" }).where(and(eq(t.entityMedia.entityType, link.entityType), eq(t.entityMedia.entityId, link.entityId))).run();
        // Hero is always shown first.
        db.update(t.entityMedia).set({ role: "hero", sort: -1 }).where(eq(t.entityMedia.id, linkId)).run();
      }
      if (input.sort != null) db.update(t.entityMedia).set({ sort: input.sort }).where(eq(t.entityMedia.id, linkId)).run();
      if (input.alt) db.update(t.media).set({ alt: z.string().trim().min(5).max(240).parse(input.alt) }).where(eq(t.media.id, link.mediaId)).run();
      audit(user, "update_image", link.entityType, link.entityId, "Updated image settings");
    }
    afterContentChange();
    return {};
  });
}

/* ───────────── Events & organisers ───────────── */

const eventSchema = z.object({
  name: z.string().trim().min(3).max(160),
  type: z.string().trim().min(2).max(40),
  city: z.enum(["hanoi", "ho-chi-minh-city", "da-nang", "nationwide"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  venue: z.string().trim().min(2).max(200),
  price: z.string().trim().min(1).max(120),
  registrationUrl: z.string().url("Events need an authoritative registration/listing URL"),
  description: z.string().trim().min(10).max(2000),
  organiser: z.string().trim().min(2).max(160),
  lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  publishStatus: z.enum(["draft", "published", "archived"]),
});

export async function saveEvent(id: string | null, input: z.input<typeof eventSchema>) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = eventSchema.parse(input);
    if (v.endDate && v.endDate < v.startDate) throw new UserError("End date is before the start date.");
    let eid = id;
    if (id) db.update(t.professionalEvents).set(v).where(eq(t.professionalEvents.id, id)).run();
    else eid = db.insert(t.professionalEvents).values({ ...v, slug: `${slugify(v.name)}-${v.startDate}` }).returning({ id: t.professionalEvents.id }).get().id;
    audit(user, id ? "update" : "create", "event", eid, `${id ? "Updated" : "Created"} event “${v.name}”`);
    revalidatePath("/connect");
    return { id: eid! };
  });
}

export async function setOrganiserStatus(id: string, publishStatus: "draft" | "published" | "archived") {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    z.enum(["draft", "published", "archived"]).parse(publishStatus);
    db.update(t.eventOrganisers).set({ publishStatus }).where(eq(t.eventOrganisers.id, id)).run();
    audit(user, "status", "organiser", id, `Organiser set to ${publishStatus}`);
    revalidatePath("/connect");
    return {};
  });
}

/* ───────────── Users, feedback, reviews ───────────── */

export async function setUserRole(userId: string, role: "super_admin" | "content_editor" | "member" | "visitor") {
  return run(async () => {
    const admin = await requireRole(["super_admin"]);
    z.enum(["super_admin", "content_editor", "member", "visitor"]).parse(role);
    if (userId === admin.id && role !== "super_admin") throw new UserError("You can't remove your own super admin role.");
    db.update(t.users).set({ role }).where(eq(t.users.id, userId)).run();
    audit(admin, "role", "user", userId, `Role changed to ${role}`);
    revalidatePath("/admin/users");
    return {};
  });
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  return run(async () => {
    const admin = await requireRole(["super_admin"]);
    if (userId === admin.id) throw new UserError("You can't disable your own account.");
    db.update(t.users).set({ disabledAt: disabled ? new Date().toISOString() : null }).where(eq(t.users.id, userId)).run();
    if (disabled) db.delete(t.sessions).where(eq(t.sessions.userId, userId)).run();
    audit(admin, disabled ? "disable" : "enable", "user", userId, `${disabled ? "Disabled" : "Re-enabled"} user`);
    revalidatePath("/admin/users");
    return {};
  });
}

export async function setFeedbackStatus(id: string, status: "open" | "resolved" | "dismissed") {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    z.enum(["open", "resolved", "dismissed"]).parse(status);
    db.update(t.feedback).set({ status }).where(eq(t.feedback.id, id)).run();
    audit(user, "feedback", "feedback", id, `Feedback marked ${status}`);
    revalidatePath("/admin/feedback");
    return {};
  });
}

export async function moderateReview(id: string, status: "published" | "rejected") {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    z.enum(["published", "rejected"]).parse(status);
    db.update(t.reviews).set({ status }).where(eq(t.reviews.id, id)).run();
    audit(user, "moderate", "review", id, `Review ${status}`);
    revalidatePath("/", "layout");
    return {};
  });
}

/* ───────────── Settings ───────────── */

export async function saveFx(input: { inrToVnd: number; usdToVnd: number; source: string }) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const v = z.object({ inrToVnd: z.number().min(50).max(1000), usdToVnd: z.number().min(10000).max(50000), source: z.string().trim().min(3).max(300) }).parse(input);
    setSetting("fx", { ...v, updatedAt: new Date().toISOString(), isLive: false }, user.id);
    audit(user, "settings", "settings", "fx", `FX set: 1 INR = ${v.inrToVnd} VND, 1 USD = ${v.usdToVnd} VND`);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function saveBudgetCategory(slug: string, input: { budgetPerDay: number | null; balancedPerDay: number | null; comfortablePerDay: number | null; description: string }) {
  return run(async () => {
    const user = await requireRole(ADMIN_ROLES);
    const n = z.number().int().min(0).max(100_000_000).nullable();
    const v = z.object({ budgetPerDay: n, balancedPerDay: n, comfortablePerDay: n, description: z.string().trim().max(300) }).parse(input);
    db.update(t.budgetCategories).set(v).where(eq(t.budgetCategories.slug, slug)).run();
    audit(user, "settings", "budget_category", slug, `Updated budget baselines for ${slug}`);
    revalidatePath("/", "layout");
    return {};
  });
}
