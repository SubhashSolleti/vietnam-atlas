/**
 * Validates seed content in src/content/catalog/*.ts
 *
 *   npx tsx scripts/check-content.ts            # all files, cross-file references are errors
 *   npx tsx scripts/check-content.ts phu-quoc   # only matching files; cross-file refs become warnings
 */
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DestinationBundle } from "../src/content/types";
import { UNIT_CAPACITY } from "../src/content/unit-capacity";
import { BUNDLE_OF } from "../src/content/ticket-bundles";

const dir = resolve(import.meta.dirname, "../src/content/catalog");
const filter = process.argv[2];

const allFiles = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts");
const files = filter ? allFiles.filter((f) => f.includes(filter)) : allFiles;

const errors: string[] = [];
const warnings: string[] = [];

const STATUSES = new Set([
  "verified_official",
  "verified_provider",
  "reference",
  "estimated",
  "community",
  "needs_verification",
  "temporarily_unavailable",
]);

async function load(file: string): Promise<DestinationBundle> {
  const mod = await import(pathToFileURL(join(dir, file)).href);
  const bundle = (mod.default ?? mod.bundle) as DestinationBundle | undefined;
  if (!bundle) throw new Error(`${file}: must have a default export of type DestinationBundle`);
  return bundle;
}

function isUrl(u: string) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch {
    return false;
  }
}

const main = async () => {
  const allActSlugs = new Set<string>();
  const everything: Record<string, DestinationBundle> = {};
  for (const f of allFiles) {
    try {
      everything[f] = await load(f);
    } catch (e) {
      if (files.includes(f)) errors.push(String(e));
    }
  }
  const destSlugs = new Set(Object.values(everything).flatMap((b) => b.destinations.map((d) => d.slug)));
  const attrSlugs = new Set(Object.values(everything).flatMap((b) => b.attractions.map((a) => a.slug)));
  const actSlugs = new Set(Object.values(everything).flatMap((b) => b.activities.map((a) => a.slug)));
  const crossRef = (msg: string) => (filter ? warnings.push(msg) : errors.push(msg));

  const seen = new Map<string, string>();
  const dup = (kind: string, slug: string, file: string) => {
    const key = `${kind}:${slug}`;
    if (seen.has(key)) errors.push(`${file}: duplicate ${kind} slug "${slug}" (also in ${seen.get(key)})`);
    seen.set(key, file);
  };
  for (const [file, b] of Object.entries(everything)) {
    b.destinations.forEach((d) => dup("destination", d.slug, file));
    b.attractions.forEach((a) => dup("attraction", a.slug, file));
    b.activities.forEach((a) => dup("activity", a.slug, file));
  }

  const checkSources = (where: string, sources: { url: string; status: string }[]) => {
    if (!sources.length) warnings.push(`${where}: no sources`);
    for (const s of sources) {
      if (!isUrl(s.url)) errors.push(`${where}: invalid source url ${s.url}`);
      if (!STATUSES.has(s.status)) errors.push(`${where}: invalid source status ${s.status}`);
    }
  };

  let destCount = 0,
    attrCount = 0,
    actCount = 0;
  for (const f of files) {
    const b = everything[f];
    if (!b) continue;
    for (const d of b.destinations) {
      destCount++;
      const w = `${f} destination ${d.slug}`;
      if (!/^[a-z0-9-]+$/.test(d.slug)) errors.push(`${w}: slug must be kebab-case`);
      if (d.months.length !== 12) errors.push(`${w}: months must have 12 entries`);
      if (d.tagline.length > 90) warnings.push(`${w}: tagline > 90 chars`);
      if (d.imageQueries.length < 3) warnings.push(`${w}: provide 4–6 imageQueries`);
      if (d.parentSlug && !destSlugs.has(d.parentSlug)) crossRef(`${w}: unknown parentSlug ${d.parentSlug}`);
      for (const n of d.nearby) if (!destSlugs.has(n.slug)) crossRef(`${w}: nearby unknown destination ${n.slug}`);
      if (Math.abs(d.lat - 16) > 8 || Math.abs(d.lng - 106) > 5) errors.push(`${w}: coordinates look outside Vietnam`);
      checkSources(w, d.sources);
    }
    for (const a of b.attractions) {
      attrCount++;
      const w = `${f} attraction ${a.slug}`;
      if (!destSlugs.has(a.destinationSlug)) errors.push(`${w}: unknown destinationSlug ${a.destinationSlug}`);
      if (!STATUSES.has(a.openingHours.status)) errors.push(`${w}: invalid openingHours.status`);
      if (!STATUSES.has(a.entranceFee.status)) errors.push(`${w}: invalid entranceFee.status`);
      if (a.officialUrl && !isUrl(a.officialUrl)) errors.push(`${w}: invalid officialUrl`);
      checkSources(w, a.sources);
    }
    for (const a of b.activities) {
      actCount++;
      const w = `${f} activity ${a.slug}`;
      if (!/^[a-z0-9-]+$/.test(a.slug)) errors.push(`${w}: slug must be kebab-case`);
      if (!destSlugs.has(a.destinationSlug)) errors.push(`${w}: unknown destinationSlug ${a.destinationSlug}`);
      if (a.attractionSlug && !attrSlugs.has(a.attractionSlug)) errors.push(`${w}: unknown attractionSlug ${a.attractionSlug}`);
      if (a.months.length !== 12) errors.push(`${w}: months must have 12 entries`);
      if (a.summary.length > 170) warnings.push(`${w}: summary > 160 chars`);
      if (a.price.minVnd > a.price.maxVnd) errors.push(`${w}: price min > max`);
      if (a.priceTier === "free" && a.price.maxVnd > 0) errors.push(`${w}: free activity with non-zero price`);
      if (a.priceTier !== "free" && a.price.maxVnd === 0) errors.push(`${w}: non-free activity with zero price`);
      if (a.price.status.startsWith("verified") && !a.sources.some((s) => s.status.startsWith("verified")))
        errors.push(`${w}: price marked verified but no verified source`);
      if (!STATUSES.has(a.price.status)) errors.push(`${w}: invalid price.status`);
      if (!a.categories.length) errors.push(`${w}: needs at least one category`);
      if (!a.steps.length || !a.whatYouDo.length) warnings.push(`${w}: empty steps/whatYouDo`);
      for (const s of [...a.freeAlternatives, ...a.paidAlternatives])
        if (!actSlugs.has(s)) crossRef(`${w}: alternative references unknown activity ${s}`);
      for (const p of a.providerLinks) if (!isUrl(p.url)) errors.push(`${w}: invalid provider url ${p.url}`);
      // The December badge and the December month score must tell the same story.
      const dec = a.months[11];
      const decOk = { good: [2, 3], variable: [1, 2], poor: [0, 1], closed: [0], unknown: [0, 1, 2, 3] }[a.decemberStatus] ?? [];
      if (dec != null && !decOk.includes(dec)) errors.push(`${w}: decemberStatus "${a.decemberStatus}" contradicts December score ${dec}`);
      if ((a.price.unit === "per_boat" || a.price.unit === "per_vehicle") && !UNIT_CAPACITY[a.slug])
        errors.push(`${w}: ${a.price.unit} price needs a capacity in src/content/unit-capacity.ts`);
      if (UNIT_CAPACITY[a.slug] && a.price.unit !== "per_boat" && a.price.unit !== "per_vehicle")
        errors.push(`${w}: has a unit capacity but is priced ${a.price.unit}`);
      allActSlugs.add(a.slug);
      checkSources(w, a.sources);
    }
  }

  if (!filter) for (const slug of Object.keys(BUNDLE_OF)) if (!allActSlugs.has(slug)) errors.push(`ticket-bundles.ts: unknown activity ${slug}`);
  if (!filter) for (const slug of Object.keys(UNIT_CAPACITY)) if (!allActSlugs.has(slug)) errors.push(`unit-capacity.ts: unknown activity ${slug}`);
  for (const w of warnings) console.warn("WARN ", w);
  for (const e of errors) console.error("ERROR", e);
  console.log(
    `\nChecked ${files.length} file(s): ${destCount} destinations, ${attrCount} attractions, ${actCount} activities. ` +
      `${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  process.exit(errors.length ? 1 : 0);
};

main();
