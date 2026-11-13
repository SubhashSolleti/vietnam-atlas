/**
 * Checks every URL cited in seed content (sources, provider links, official URLs).
 * Writes data/link-report.json. Usage: npx tsx scripts/check-links.ts
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DestinationBundle } from "../src/content/types";

const ROOT = resolve(import.meta.dirname, "..");
const UA = "VietnamAtlasLocal/0.1 link-check (personal local development build)";

async function collect() {
  const urls = new Map<string, Set<string>>();
  const add = (u: string | undefined, where: string) => {
    if (!u) return;
    (urls.get(u) ?? urls.set(u, new Set()).get(u)!).add(where);
  };
  const dir = join(ROOT, "src/content/catalog");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const b = (await import(pathToFileURL(join(dir, f)).href)).default as DestinationBundle;
    for (const d of b.destinations) d.sources.forEach((s) => add(s.url, `destination:${d.slug}`));
    for (const a of b.attractions) { a.sources.forEach((s) => add(s.url, `attraction:${a.slug}`)); add(a.officialUrl, `attraction:${a.slug}:official`); }
    for (const a of b.activities) { a.sources.forEach((s) => add(s.url, `activity:${a.slug}`)); a.providerLinks.forEach((p) => add(p.url, `activity:${a.slug}:provider`)); }
  }
  for (const file of ["guide", "networking"]) {
    const mod = await import(pathToFileURL(join(ROOT, `src/content/${file}.ts`)).href);
    for (const sec of mod.guideSections ?? []) for (const a of sec.articles) a.sources.forEach((s: { url: string }) => add(s.url, `guide:${a.slug}`));
    for (const c of mod.communities ?? []) { add(c.url, `community:${c.slug}`); c.sources.forEach((s: { url: string }) => add(s.url, `community:${c.slug}`)); }
    for (const e of mod.professionalEvents ?? []) { add(e.registrationUrl, `event:${e.slug}`); e.sources.forEach((s: { url: string }) => add(s.url, `event:${e.slug}`)); }
  }
  return urls;
}

async function check(url: string): Promise<{ status: number | string; finalUrl?: string }> {
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(url, { method, redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (method === "HEAD" && (res.status === 405 || res.status === 403 || res.status >= 500)) continue;
      return { status: res.status, finalUrl: res.url !== url ? res.url : undefined };
    } catch (e) {
      if (method === "GET") return { status: (e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message.slice(0, 80) };
    }
  }
  return { status: "unknown" };
}

const urls = await collect();
const list = [...urls.keys()];
console.log(`Checking ${list.length} unique URLs…`);
const results: { url: string; status: number | string; finalUrl?: string; usedBy: string[] }[] = [];
let i = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (i < list.length) {
      const url = list[i++]!;
      const r = await check(url);
      results.push({ url, ...r, usedBy: [...urls.get(url)!].slice(0, 6) });
    }
  }),
);
const bad = results.filter((r) => typeof r.status !== "number" || r.status >= 400);
writeFileSync(join(ROOT, "data/link-report.json"), JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, bad }, null, 2));
console.log(`${results.length - bad.length} OK, ${bad.length} problems → data/link-report.json`);
for (const b of bad) console.log(`  ${b.status}  ${b.url}  (${b.usedBy.length} uses)`);
