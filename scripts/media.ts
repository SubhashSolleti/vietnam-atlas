/**
 * Curated photography pipeline (Wikimedia Commons, open licences only).
 *
 * The manifest (src/content/media-manifest.json) is the reviewed source of truth: every entry was
 * checked by eye against the place or experience it illustrates. Nothing is added automatically.
 *
 *   npm run media -- sync          Download any manifest photo missing from public/media, drop entries whose
 *                                  title is in media-rejects.json and delete files the manifest no longer uses.
 *   npm run media -- audit         Contact sheets of every manifest photo + near-duplicate report
 *                                  → data/media-review/audit/ (review sheets, add bad ones to media-rejects.json, then `sync`).
 *   npm run media -- candidates [--search]
 *                                  For entities below their photo target, gather place-accurate candidates from
 *                                  Wikidata (P18) and the entity's (or its attraction's) Commons category →
 *                                  data/media-review/candidates.json + sheets/. `--search` adds a slower,
 *                                  rate-limited pass using Commons search scoped to the destination's category tree.
 *   npm run media -- sheets        Rebuild candidate contact sheets (works on partial candidate runs).
 *   npm run media -- apply <picks.json>
 *                                  Add reviewed picks: [{ "key": "activity:slug", "cids": ["12a"] }]. Each pick is
 *                                  downloaded, re-encoded to WebP and appended with full attribution.
 *
 * Targets: destination 5, attraction 2, activity 1, region 1, theme 1, homepage hero 2.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import type { DestinationBundle, MediaManifestEntry, SourceRef } from "../src/content/types";
import { regions } from "../src/content/regions";
import { ADVENTURE_TYPES } from "../src/content/taxonomy";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const MANIFEST = join(ROOT, "src/content/media-manifest.json");
const REJECTS = join(ROOT, "src/content/media-rejects.json");
const WORK = join(ROOT, "data/media-review");
const UA = "VietnamAtlas/1.0 (editorial photo curation for a travel guide; low request rate)";
const TARGETS: Record<string, number> = { destination: 5, attraction: 2, activity: 1, region: 1, theme: 1, site: 2 };
/** Commons categories for destinations whose cited article is broader or has no category of its own. */
const CATEGORY_OVERRIDES: Record<string, string> = {
  "destination:ben-tre": "Ben Tre",
  "destination:cai-be": "Cái Bè District",
  "destination:chau-doc": "Chau Doc",
  "destination:tra-su": "Tra Su Forest",
  "destination:hoi-an": "Hoi An",
  "destination:ho-chi-minh-city": "Ho Chi Minh City",
};
/** Exact-phrase Commons searches for places that have photos but no Commons category. */
const PHRASE_SEARCHES: Record<string, string> = {
  "destination:pu-luong": '"Pu Luong"',
};


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readJson = <T>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback);
const baseKey = (k: string) => k.replace(/:\d+$/, "");
const idxOf = (k: string) => Number(k.match(/:(\d+)$/)?.[1] ?? 0);
const normTitle = (t: string) => t.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " ");

function loadManifest(): MediaManifestEntry[] {
  return readJson<MediaManifestEntry[]>(MANIFEST, []);
}
function saveManifest(m: MediaManifestEntry[]) {
  m.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
  writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + "\n");
}

/* ───────── Entities ───────── */

type Entity = { key: string; kind: string; name: string; context: string; destSlug?: string; destName?: string; wiki?: string; destWiki?: string; attrKey?: string; queries: string[] };

async function loadEntities() {
  const out = new Map<string, Entity>();
  const wikiOf = (sources: SourceRef[] = []) => sources.find((s) => s.url.startsWith("https://en.wikipedia.org/wiki/"))?.url.split("/wiki/")[1];
  out.set("site:hero", { key: "site:hero", kind: "site", name: "Homepage hero", context: "Iconic northern Vietnam karst seascape", wiki: "Ha_Long_Bay", queries: ["Ha Long Bay", "Lan Ha Bay"] });
  for (const r of regions) out.set(`region:${r.slug}`, { key: `region:${r.slug}`, kind: "region", name: r.name, context: r.tagline, queries: [r.imageQuery] });
  for (const a of ADVENTURE_TYPES) out.set(`theme:${a.slug}`, { key: `theme:${a.slug}`, kind: "theme", name: a.label, context: a.description, queries: [a.imageQuery] });
  const dir = join(ROOT, "src/content/catalog");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts").sort()) {
    const b = (await import(pathToFileURL(join(dir, f)).href)).default as DestinationBundle;
    const dest = new Map(b.destinations.map((d) => [d.slug, d]));
    for (const d of b.destinations)
      out.set(`destination:${d.slug}`, { key: `destination:${d.slug}`, kind: "destination", name: d.name, context: d.tagline, destSlug: d.slug, wiki: wikiOf(d.sources), queries: [...d.imageQueries, `${d.name} Vietnam`] });
    for (const a of b.attractions) {
      const d = dest.get(a.destinationSlug);
      out.set(`attraction:${a.slug}`, { key: `attraction:${a.slug}`, kind: "attraction", name: a.name, context: a.description.slice(0, 160), destSlug: a.destinationSlug, destName: d?.name, wiki: wikiOf(a.sources), destWiki: wikiOf(d?.sources), queries: [a.imageQuery, `${a.name} ${d?.name ?? ""}`.trim()] });
    }
    for (const a of b.activities) {
      const d = dest.get(a.destinationSlug);
      out.set(`activity:${a.slug}`, { key: `activity:${a.slug}`, kind: "activity", name: a.title, context: a.summary, destSlug: a.destinationSlug, destName: d?.name, destWiki: wikiOf(d?.sources), attrKey: a.attractionSlug ? `attraction:${a.attractionSlug}` : undefined, queries: [a.imageQuery] });
    }
  }
  return out;
}

function fileFor(e: Entity, title: string) {
  const h = createHash("sha1").update(title).digest("hex").slice(0, 6);
  const [kind, slug] = e.key.split(":") as [string, string];
  if (kind === "site") return `/media/site/${slug}-${h}.webp`;
  if (kind === "region") return `/media/regions/${slug}-${h}.webp`;
  if (kind === "theme") return `/media/themes/${slug}-${h}.webp`;
  const d = e.destSlug!;
  if (kind === "destination") return `/media/${d}/destination-${h}.webp`;
  return `/media/${d}/${kind === "attraction" ? "a" : "x"}-${slug.replace(`${d}-`, "")}-${h}.webp`;
}

/* ───────── Polite Wikimedia client ───────── */

let pausedUntil = 0;
let nextCallAt = 0;
let nextSearchAt = 0;
async function api(base: string, params: Record<string, string>, attempt = 0): Promise<any> {
  const isSearch = params.list === "search";
  const wait = Math.max(pausedUntil, nextCallAt, isSearch ? nextSearchAt : 0) - Date.now();
  if (wait > 0) await sleep(wait);
  nextCallAt = Date.now() + 2000;
  if (isSearch) nextSearchAt = Date.now() + 6000;
  const url = new URL(base);
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", maxlag: "5", ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 8) throw new Error(`${res.status} from ${url.host} (${params.list ?? params.prop ?? params.action})`);
    const retryAfter = Number(res.headers.get("retry-after")) || 10 * (attempt + 1);
    pausedUntil = Date.now() + retryAfter * 1000 + 500;
    console.warn(`  … ${url.host} asked us to wait ${retryAfter}s`);
    return api(base, params, attempt + 1);
  }
  return res.json();
}
async function download(url: string, attempt = 0): Promise<Buffer> {
  const wait = pausedUntil - Date.now();
  if (wait > 0) await sleep(wait);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`download ${res.status}`);
    const retryAfter = Number(res.headers.get("retry-after")) || 5 * (attempt + 1);
    pausedUntil = Date.now() + retryAfter * 1000;
    return download(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`download ${res.status}`);
  await sleep(250);
  return Buffer.from(await res.arrayBuffer());
}

const COMMONS = "https://commons.wikimedia.org/w/api.php";
type WikidataInfo = { p18: string[]; cat: string | null };
const wdCache = new Map<string, WikidataInfo>();
/** Resolves Wikipedia titles → Wikidata image (P18) and Commons category (P373), 50 per request, cached on disk. */
async function prefetchWikidata(titles: string[]) {
  const cachePath = join(WORK, "wikidata.json");
  for (const [k, v] of Object.entries(readJson<Record<string, WikidataInfo>>(cachePath, {}))) wdCache.set(k, v);
  const todo = [...new Set(titles)].filter((t) => !wdCache.has(t));
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const p = await api("https://en.wikipedia.org/w/api.php", { action: "query", titles: batch.map((t) => decodeURIComponent(t).replace(/_/g, " ")).join("|"), prop: "pageprops", ppprop: "wikibase_item", redirects: "1" });
    // follow normalisation and redirects back to the title we asked for
    const hop = new Map<string, string>();
    for (const n of [...(p?.query?.normalized ?? []), ...(p?.query?.redirects ?? [])]) hop.set(n.from, n.to);
    const resolveTitle = (t: string) => {
      let cur = t;
      for (let k = 0; k < 4 && hop.has(cur); k++) cur = hop.get(cur)!;
      return cur;
    };
    const qidByTitle = new Map<string, string>((p?.query?.pages ?? []).filter((x: any) => x.pageprops?.wikibase_item).map((x: any) => [x.title, x.pageprops.wikibase_item]));
    const qids = [...new Set(qidByTitle.values())];
    const claims = new Map<string, any>();
    for (let j = 0; j < qids.length; j += 50) {
      const e = await api("https://www.wikidata.org/w/api.php", { action: "wbgetentities", ids: qids.slice(j, j + 50).join("|"), props: "claims", formatversion: "1" });
      for (const [q, ent] of Object.entries<any>(e?.entities ?? {})) claims.set(q, ent.claims ?? {});
    }
    for (const t of batch) {
      const c = claims.get(qidByTitle.get(resolveTitle(decodeURIComponent(t).replace(/_/g, " "))) ?? "") ?? {};
      wdCache.set(t, { p18: (c.P18 ?? []).map((x: any) => x.mainsnak?.datavalue?.value).filter(Boolean), cat: c.P373?.[0]?.mainsnak?.datavalue?.value ?? null });
    }
    writeFileSync(cachePath, JSON.stringify(Object.fromEntries(wdCache), null, 1));
  }
}
const wikidataFor = (t: string): WikidataInfo => wdCache.get(t) ?? { p18: [], cat: null };
/** For places without a cited Wikipedia article: look the name up on Wikidata, accepting only items described as in Vietnam. */
const byName = new Map<string, WikidataInfo>();
async function wikidataByName(name: string, destName?: string): Promise<WikidataInfo> {
  const hit = byName.get(name);
  if (hit) return hit;
  const d = await api("https://www.wikidata.org/w/api.php", { action: "wbsearchentities", search: name.replace(/\s*\(.*?\)\s*/g, " ").trim(), language: "en", limit: "5", formatversion: "1" });
  const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  const inVietnam = (r: any) => /vietnam/i.test(fold(r.description ?? "")) || (!!destName && fold(r.description ?? "").includes(fold(destName)));
  const match = (d?.search ?? []).find(inVietnam);
  let out: WikidataInfo = { p18: [], cat: null };
  if (match) {
    const e = await api("https://www.wikidata.org/w/api.php", { action: "wbgetentities", ids: match.id, props: "claims", formatversion: "1" });
    const c = e?.entities?.[match.id]?.claims ?? {};
    out = { p18: (c.P18 ?? []).map((x: any) => x.mainsnak?.datavalue?.value).filter(Boolean), cat: c.P373?.[0]?.mainsnak?.datavalue?.value ?? null };
  }
  byName.set(name, out);
  return out;
}
const catCache = new Map<string, string[]>();
async function categoryFiles(cat: string, limit: number): Promise<string[]> {
  const hit = catCache.get(cat);
  if (hit) return hit;
  const d = await api(COMMONS, { action: "query", list: "categorymembers", cmtitle: `Category:${cat}`, cmtype: "file", cmlimit: String(limit) });
  const files = (d?.query?.categorymembers ?? []).map((m: any) => m.title as string);
  catCache.set(cat, files);
  return files;
}
async function search(q: string, limit: number): Promise<string[]> {
  const d = await api(COMMONS, { action: "query", list: "search", srsearch: `${q} filetype:bitmap`, srnamespace: "6", srlimit: String(limit) });
  return (d?.query?.search ?? []).map((s: any) => s.title);
}

/* ───────── Candidate gathering ───────── */

type Candidate = { cid: string; title: string; thumb: string; full: string; width: number; height: number; author: string; license: string; licenseUrl: string | null; page: string; via: string };
type CandidateSet = { key: string; name: string; need: number; cands: Candidate[] };

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const BAD_TITLE = /\b(map|logo|flag|coat of arms|diagram|chart|stamp|banknote|seal|locator|svg|icon|poster|scan|document|signature|plan|sketch|drawing|painting|postcard|1[89]\d\d)\b/i;
const OK_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? ?\d(\.\d)?|cc by(-sa)?)/i;
const QUALITY = /^Category:(Quality images|Featured pictures on Wikimedia Commons|Valued images)/;

async function describe(titles: string[], via: Map<string, string>, landscape: boolean, excluded: Set<string>) {
  const out: (Omit<Candidate, "cid"> & { quality: boolean })[] = [];
  for (let i = 0; i < titles.length; i += 40) {
    const d = await api(COMMONS, { action: "query", titles: titles.slice(i, i + 40).join("|"), prop: "imageinfo|categories", iiprop: "url|size|mime|extmetadata", iiurlwidth: "500", cllimit: "max" });
    for (const p of d?.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii || !/image\/(jpeg|png|webp)/.test(ii.mime)) continue;
      const title = normTitle(p.title);
      if (excluded.has(title) || BAD_TITLE.test(title) || ii.width < 1200) continue;
      const ratio = ii.width / ii.height;
      if (landscape ? ratio < 1.25 || ratio > 2.3 : ratio < 1.0 || ratio > 2.3) continue;
      const m = ii.extmetadata ?? {};
      const license = stripHtml(m.LicenseShortName?.value ?? "");
      if (!OK_LICENSE.test(license) || /\b(nc|nd)\b/i.test(license)) continue;
      out.push({
        title,
        thumb: ii.thumburl ?? ii.url,
        full: ii.thumburl ? ii.thumburl.replace(/\/500px-/, "/1280px-") : ii.url,
        width: ii.width,
        height: ii.height,
        author: stripHtml(m.Artist?.value ?? m.Credit?.value ?? "").slice(0, 140) || "Unknown author",
        license,
        licenseUrl: m.LicenseUrl?.value ?? null,
        page: ii.descriptionurl,
        via: via.get(p.title) ?? "?",
        quality: (p.categories ?? []).some((c: any) => QUALITY.test(c.title)),
      });
    }
  }
  const rank = (c: { via: string; quality: boolean }) => ["p18", "cat", "attr", "deepcat", "search"].indexOf(c.via.split(":")[0]!) * 2 + (c.quality ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b));
}

async function gather(e: Entity, need: number, excluded: Set<string>, allowSearch: boolean) {
  const via = new Map<string, string>();
  const add = (titles: string[], tag: string) => {
    for (const t of titles) {
      const tt = t.startsWith("File:") ? t : `File:${t}`;
      if (!via.has(tt)) via.set(tt, tag);
    }
  };
  let dcat: string | null = CATEGORY_OVERRIDES[`destination:${e.destSlug}`] ?? (e.destWiki ? wikidataFor(e.destWiki).cat : null);
  if (CATEGORY_OVERRIDES[e.key]) add(await categoryFiles(CATEGORY_OVERRIDES[e.key]!, 120), `cat:${CATEGORY_OVERRIDES[e.key]}`);
  if (PHRASE_SEARCHES[e.key] && allowSearch) add(await search(PHRASE_SEARCHES[e.key]!, 30), "deepcat:phrase");
  if (e.wiki) {
    const wd = wikidataFor(e.wiki);
    add(wd.p18, "p18");
    if (wd.cat) add(await categoryFiles(wd.cat, e.kind === "destination" ? 80 : 40), `cat:${wd.cat}`);
    if (e.kind === "destination" && !CATEGORY_OVERRIDES[e.key]) dcat = wd.cat;
  }
  if (!e.wiki && e.kind === "attraction" && allowSearch) {
    const wd = await wikidataByName(e.name, e.destName);
    add(wd.p18, "p18");
    if (wd.cat) add(await categoryFiles(wd.cat, 40), `cat:${wd.cat}`);
  }
  if (e.attrKey) {
    const a = entities.get(e.attrKey);
    const wd = a?.wiki ? wikidataFor(a.wiki) : a && allowSearch ? await wikidataByName(a.name, a.destName) : null;
    if (wd) {
      add(wd.p18, "attr");
      if (wd.cat) add(await categoryFiles(wd.cat, 30), `attr:${wd.cat}`);
    }
  }
  const landscape = ["destination", "site", "region"].includes(e.kind);
  const want = Math.max(5, need * 3);
  const strip = (q: string) => (e.destName ? q.replace(new RegExp(e.destName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "") : q).replace(/\s+/g, " ").trim();
  // Wikidata and the entity's own category are exact; search only tops up (and is rate-limited).
  let cands = via.size ? await describe([...via.keys()], via, landscape, excluded) : [];
  if (!allowSearch) return cands.slice(0, 8);
  if (cands.length < want && dcat) {
    const before = via.size;
    for (const q of e.queries.slice(0, e.kind === "destination" ? 2 : 1)) add(await search(`deepcat:"${dcat}" ${strip(q) || q}`, 15), `deepcat:${dcat}`);
    if (via.size > before) cands = await describe([...via.keys()], via, landscape, excluded);
  }
  // Unscoped search produced the original mismatches, so it is only used for broad imagery (regions, themes, hero).
  if (cands.length < want && ["region", "theme", "site"].includes(e.kind)) {
    const before = via.size;
    add(await search(e.queries[0]!, 12), "search");
    if (via.size > before) cands = await describe([...via.keys()], via, landscape, excluded);
  }
  return cands.slice(0, 8);
}

function excludedTitles(extra: CandidateSet[] = []) {
  return new Set([...loadManifest().map((m) => m.title), ...readJson<{ title: string }[]>(REJECTS, []).map((r) => r.title), ...extra.flatMap((s) => s.cands.map((c) => c.title))].map(normTitle));
}

async function candidates(keysArg: string | undefined, allowSearch: boolean) {
  mkdirSync(join(WORK, "thumbs"), { recursive: true });
  await prefetchWikidata([...entities.values()].flatMap((e) => [e.wiki, e.destWiki]).filter((t): t is string => !!t));
  const have = new Map<string, number>();
  for (const m of loadManifest()) have.set(baseKey(m.key), (have.get(baseKey(m.key)) ?? 0) + 1);
  const wanted = keysArg
    ? keysArg.split(",").map((key) => ({ key, need: Math.max(1, (TARGETS[key.split(":")[0]!] ?? 1) - (have.get(key) ?? 0)) }))
    : [...entities.values()].map((e) => ({ key: e.key, need: (TARGETS[e.kind] ?? 1) - (have.get(e.key) ?? 0) })).filter((r) => r.need > 0);
  const path = join(WORK, "candidates.json");
  const sets = readJson<CandidateSet[]>(path, []);
  // A search pass revisits entities the exact (Wikidata/category) pass couldn't fill.
  // Explicit --keys always re-gather (new candidates are merged into the existing set).
  const done = new Set(keysArg ? [] : sets.filter((s) => !allowSearch || s.cands.length >= Math.min(3, s.need * 2)).map((s) => s.key));
  const excluded = excludedTitles(sets);
  const todo = wanted.filter((w) => !done.has(w.key));
  // Candidate ids ("<n><letter>") must stay unique across runs and merges: each gathered entity takes a fresh n.
  let nextN = Math.max(0, ...sets.flatMap((s) => s.cands.map((c) => parseInt(c.cid, 10) || 0)), sets.length) + 1;
  console.log(`Gathering candidates for ${todo.length} entities (${done.size} already gathered).`);
  for (const [i, w] of todo.entries()) {
    const e = entities.get(w.key);
    if (!e) continue;
    let found: Awaited<ReturnType<typeof gather>> = [];
    try {
      found = await gather(e, w.need, excluded, allowSearch);
    } catch (err) {
      console.warn(`! ${w.key}: ${(err as Error).message}`);
      continue; // not recorded → retried on the next run
    }
    const n = nextN++;
    const cands: Candidate[] = [];
    for (const c of found) {
      const cid = `${n}${String.fromCharCode(97 + cands.length)}`;
      try {
        const buf = await download(c.thumb);
        await sharp(buf).resize(400, 290, { fit: "contain", background: "#222" }).jpeg({ quality: 75 }).toFile(join(WORK, "thumbs", `${cid}.jpg`));
        const { quality: _q, ...rest } = c;
        cands.push({ ...rest, cid });
        excluded.add(c.title); // offer each photo to one entity only, so no picture can repeat across pages
      } catch {
        /* skip unreadable thumbnail */
      }
    }
    const prev = sets.findIndex((s) => s.key === w.key);
    const set = { key: w.key, name: `${e.name}${e.destName ? `, ${e.destName}` : ""}`, need: w.need, cands };
    if (prev >= 0) sets[prev] = { ...set, cands: [...sets[prev]!.cands, ...cands.filter((c) => !sets[prev]!.cands.some((o) => o.title === c.title))] };
    else sets.push(set);
    writeFileSync(path, JSON.stringify(sets, null, 1));
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${todo.length}`);
  }
  await sheets();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sheets() {
  const sets = readJson<CandidateSet[]>(join(WORK, "candidates.json"), []);
  const dir = join(WORK, "sheets");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Two entities per sheet, candidates in rows of four, legible when viewed at reduced size.
  const TW = 400, TH = 290, CH = 40, LH = 36, PER = 2, COLS = 4;
  const blockH = (r: CandidateSet) => LH + Math.ceil(r.cands.length / COLS) * (TH + CH);
  const rows = sets.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => s.cands.length);
  const index: { sheet: string; entities: { n: number; key: string; name: string; need: number }[] }[] = [];
  for (let s = 0; s < rows.length; s += PER) {
    const chunk = rows.slice(s, s + PER);
    const comps: OverlayOptions[] = [];
    let y = 0;
    for (const r of chunk) {
      comps.push({ input: Buffer.from(`<svg width="${TW * COLS}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#173f35"/><text x="10" y="25" font-family="Helvetica" font-size="20" font-weight="bold" fill="#fff">E${r.n}  ${esc(r.name.slice(0, 80))}  [${esc(r.key.split(":")[0]!)}, pick ≤ ${r.need}]</text></svg>`), left: 0, top: y });
      r.cands.forEach((c, k) => {
        const x = (k % COLS) * TW, ty = y + LH + Math.floor(k / COLS) * (TH + CH);
        comps.push({ input: join(WORK, "thumbs", `${c.cid}.jpg`), left: x, top: ty });
        comps.push({ input: Buffer.from(`<svg width="${TW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><text x="5" y="17" font-family="Helvetica" font-size="17" font-weight="bold" fill="#c00">${c.cid}</text><text x="70" y="16" font-family="Helvetica" font-size="13" fill="#000">${esc(c.title.slice(0, 44))}</text><text x="70" y="33" font-family="Helvetica" font-size="13" fill="#000">${esc(c.title.slice(44, 88))}</text></svg>`), left: x, top: ty + TH });
      });
      y += blockH(r) + 8;
    }
    const name = `cand-${String(index.length + 1).padStart(3, "0")}.jpg`;
    await sharp({ create: { width: TW * COLS, height: y, channels: 3, background: "#ccc" } }).composite(comps).jpeg({ quality: 74 }).toFile(join(dir, name));
    index.push({ sheet: name, entities: chunk.map((r) => ({ n: r.n, key: r.key, name: r.name, need: r.need })) });
  }
  writeFileSync(join(WORK, "sheets.json"), JSON.stringify(index, null, 1));
  console.log(`${index.length} candidate sheets in ${dir}`);
}

/* ───────── Apply reviewed picks ───────── */

async function dhash(input: string | Buffer) {
  const px = await sharp(input).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x]! > px[y * 9 + x + 1]! ? 1n : 0n);
  return h;
}
const hamming = (a: bigint, b: bigint) => {
  let x = a ^ b, c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
};

async function apply(picksPath: string) {
  const picks = readJson<{ key: string; cids: string[] }[]>(resolve(picksPath), []);
  // Candidate ids are unique across sets, so a reviewer may assign a photo found under another entity.
  const byCid = new Map(readJson<CandidateSet[]>(join(WORK, "candidates.json"), []).flatMap((s) => s.cands.map((c) => [c.cid, c] as const)));
  const manifest = loadManifest();
  const titles = new Set(manifest.map((m) => m.title));
  const hashes = await Promise.all(manifest.map(async (m) => ({ key: m.key, h: await dhash(join(PUBLIC, m.file)) })));
  let added = 0;
  for (const p of picks) {
    const e = entities.get(p.key);
    if (!e) {
      console.warn(`! unknown key ${p.key}`);
      continue;
    }
    for (const cid of p.cids) {
      const c = byCid.get(cid);
      if (!c || titles.has(c.title)) continue;
      const buf = await download(c.full);
      const h = await dhash(buf);
      const dup = hashes.find((x) => hamming(x.h, h) <= 5);
      if (dup) {
        console.warn(`  skip ${cid} (${p.key}): near-duplicate of ${dup.key}`);
        continue;
      }
      const file = fileFor(e, c.title);
      mkdirSync(dirname(join(PUBLIC, file)), { recursive: true });
      const info = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(PUBLIC, file));
      const idx = Math.max(-1, ...manifest.filter((m) => baseKey(m.key) === p.key).map((m) => idxOf(m.key))) + 1;
      manifest.push({ key: `${p.key}:${idx}`, file, width: info.width, height: info.height, title: c.title, author: c.author, license: c.license, licenseUrl: c.licenseUrl, sourceUrl: c.page, query: c.via });
      titles.add(c.title);
      hashes.push({ key: `${p.key}:${idx}`, h });
      added++;
    }
  }
  saveManifest(manifest);
  console.log(`Added ${added} reviewed photos; manifest now has ${manifest.length}.`);
}

/* ───────── Audit current manifest ───────── */

async function audit() {
  const manifest = loadManifest();
  const dir = join(WORK, "audit");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "sheets"), { recursive: true });
  const rows = manifest.map((m, i) => ({ id: i + 1, key: m.key, file: m.file, entity: entities.get(baseKey(m.key))?.name ?? baseKey(m.key), context: entities.get(baseKey(m.key))?.context ?? "", commonsTitle: m.title }));
  const hashes = await Promise.all(rows.map((r) => dhash(join(PUBLIC, r.file))));
  const dups: string[] = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) if (hamming(hashes[i]!, hashes[j]!) <= 6) dups.push(`#${rows[i]!.id} ${rows[i]!.key} ~ #${rows[j]!.id} ${rows[j]!.key}`);
  const TW = 420, TH = 300, CH = 72, PER = 12, COLS = 4;
  for (let s = 0; s * PER < rows.length; s++) {
    const comps: OverlayOptions[] = [];
    for (const [k, r] of rows.slice(s * PER, s * PER + PER).entries()) {
      const x = (k % COLS) * TW, y = Math.floor(k / COLS) * (TH + CH);
      comps.push({ input: await sharp(join(PUBLIC, r.file)).resize(TW - 8, TH - 8, { fit: "contain", background: "#222" }).toBuffer(), left: x + 4, top: y + 4 });
      const name = r.entity.length > 88 ? r.entity.slice(0, 87) + "…" : r.entity;
      comps.push({ input: Buffer.from(`<svg width="${TW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><text x="6" y="22" font-family="Helvetica" font-size="19" font-weight="bold" fill="#c00">#${r.id}</text><text x="70" y="22" font-family="Helvetica" font-size="14">${esc(name.slice(0, 44))}</text><text x="6" y="44" font-family="Helvetica" font-size="14">${esc(name.slice(44))}</text><text x="6" y="64" font-family="Helvetica" font-size="12" fill="#555">${esc(r.commonsTitle.slice(0, 60))}</text></svg>`), left: x, top: y + TH });
    }
    await sharp({ create: { width: TW * COLS, height: (TH + CH) * 3, channels: 3, background: "#ddd" } }).composite(comps).jpeg({ quality: 78 }).toFile(join(dir, "sheets", `sheet-${String(s + 1).padStart(2, "0")}.jpg`));
  }
  writeFileSync(join(dir, "audit.json"), JSON.stringify(rows, null, 1));
  writeFileSync(join(dir, "near-duplicates.txt"), dups.join("\n"));
  const perKey = new Map<string, number>();
  for (const m of manifest) perKey.set(baseKey(m.key), (perKey.get(baseKey(m.key)) ?? 0) + 1);
  const short = [...entities.values()].filter((e) => (perKey.get(e.key) ?? 0) < (TARGETS[e.kind] ?? 1));
  console.log(`${rows.length} photos on ${Math.ceil(rows.length / PER)} sheets in ${dir}; ${dups.length} near-duplicate pairs; ${short.length} entities below target.`);
}

/* ───────── Sync files with the manifest ───────── */

async function sync() {
  const rejected = new Set(readJson<{ title: string }[]>(REJECTS, []).map((r) => r.title));
  let manifest = loadManifest();
  const before = manifest.length;
  manifest = manifest.filter((m) => !rejected.has(m.title) && entities.has(baseKey(m.key)));
  let fetched = 0;
  for (const m of manifest) {
    const abs = join(PUBLIC, m.file);
    if (existsSync(abs)) continue;
    const fileTitle = decodeURIComponent(m.sourceUrl.split("/wiki/")[1] ?? "");
    const d = await api(COMMONS, { action: "query", titles: fileTitle, prop: "imageinfo", iiprop: "url", iiurlwidth: "1280" });
    const url = d?.query?.pages?.[0]?.imageinfo?.[0]?.thumburl;
    if (!url) {
      console.warn(`! ${m.key}: ${fileTitle} is no longer available on Commons`);
      continue;
    }
    mkdirSync(dirname(abs), { recursive: true });
    await sharp(await download(url)).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 74 }).toFile(abs);
    fetched++;
  }
  saveManifest(manifest);
  const used = new Set(manifest.map((m) => m.file));
  let removed = 0;
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const abs = join(dir, f);
      const rel = abs.slice(PUBLIC.length);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        if (!readdirSync(abs).length) rmSync(abs, { recursive: true });
      } else if (!used.has(rel)) {
        rmSync(abs);
        removed++;
      }
    }
  };
  walk(join(PUBLIC, "media"));
  console.log(`Manifest: ${manifest.length} photos (${before - manifest.length} dropped). Downloaded ${fetched}, removed ${removed} unused files.`);
}

/* ───────── CLI ───────── */

const entities = await loadEntities();
const [cmd, arg] = process.argv.slice(2);
const keysArg = process.argv.find((a) => a.startsWith("--keys="))?.slice(7);
switch (cmd) {
  case "sync":
    await sync();
    break;
  case "audit":
    await audit();
    break;
  case "candidates":
    await candidates(keysArg, process.argv.includes("--search"));
    break;
  case "sheets":
    await sheets();
    break;
  case "apply":
    if (!arg) throw new Error("usage: npm run media -- apply <picks.json>");
    await apply(arg);
    break;
  default:
    console.log("usage: npm run media -- <sync|audit|candidates|sheets|apply picks.json>");
    process.exitCode = 1;
}
