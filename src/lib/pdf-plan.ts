/**
 * Turns an itinerary PDF's days (see parseDaySection) into a base plan: each day's place, and its timed entries
 * matched to catalogue activities, so they become cards travellers can move, swap or skip. Pure.
 *
 * Matching weighs words by how rare they are in the catalogue ("VinWonders" decides a match, "beach" barely does),
 * ignores place names ("Phu Quoc", "Sapa"), and reads an entry's title first, its description second. A title that
 * joins several stops ("Hanoi Old Quarter & Train Street") can match one activity per stop.
 */
import type { PdfDay, PdfEntry } from "./pdf-days";

export type PlanPlace = { id: string; slug: string; name: string; localName: string | null; parentId: string | null };
export type PlanActivity = { id: string; slug: string; title: string; destinationId: string; durationHours: number };
export type PlannedItem = {
  time: string | null;
  durationMin: number | null;
  title: string;
  activityId: string | null;
  type: "activity" | "transport" | "restaurant" | "free_time";
  notes: string | null;
};
export type PlannedDay = { destinationId: string | null; title: string | null; items: PlannedItem[] };

/** Lowest score that counts as a match. */
const THRESHOLD = 0.42;
const STOP = new Set(["and", "the", "of", "at", "a", "an", "to", "in", "on", "with", "or", "for", "by", "from", "plus", "your", "its", "via", "optional", "visit", "tour", "trip", "walk", "stroll", "explore", "exploration", "browse", "self", "guided"]);
/** Places spelled differently from the catalogue's name. */
const ALIASES: Record<string, string> = { hcmc: "ho-chi-minh-city", saigon: "ho-chi-minh-city", hochiminh: "ho-chi-minh-city", halong: "ha-long-bay", nhatrang: "nha-trang" };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);
/** Comparable word: plurals and doubled letters folded ("islands" → "island", "snorkelling" → "snorkeling"). */
const stem = (w: string) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w).replace(/([a-z])\1+/g, "$1");

export function makeMatcher(places: PlanPlace[], activities: PlanActivity[]) {
  // Place names as spaceless keys ("sapa" matches "Sa Pa"), longest first.
  const placeKeys = new Map<string, string>();
  for (const p of places) for (const n of [p.name, p.localName, p.slug.replace(/-/g, " ")]) if (n) placeKeys.set(words(n).join(""), p.id);
  const bySlug = new Map(places.map((p) => [p.slug, p.id]));
  for (const [alias, slug] of Object.entries(ALIASES)) if (bySlug.has(slug)) placeKeys.set(alias, bySlug.get(slug)!);
  const parentOf = new Map(places.map((p) => [p.id, p.parentId]));

  /** Places named in a text, in order, and its words without them. */
  const scan = (text: string) => {
    const ws = words(text);
    const found: string[] = [];
    const rest: string[] = [];
    for (let i = 0; i < ws.length; ) {
      let hit = 0;
      for (let n = Math.min(4, ws.length - i); n >= 1 && !hit; n--) {
        const id = placeKeys.get(ws.slice(i, i + n).join(""));
        if (id) {
          if (!found.includes(id)) found.push(id);
          hit = n;
        }
      }
      if (hit) i += hit;
      else rest.push(ws[i++]!);
    }
    return { places: found, words: rest.filter((w) => !STOP.has(w) && !/^\d+$/.test(w)).map(stem) };
  };

  // A catalogue title's brackets are small print ("(self-guided)", "(subject to access regulations)").
  const acts = activities.map((a) => ({ ...a, tokens: [...new Set(scan(a.title.replace(/\([^)]*\)/g, " ")).words)] }));
  const df = new Map<string, number>();
  for (const a of acts) for (const w of a.tokens) df.set(w, (df.get(w) ?? 0) + 1);
  // Rare words decide a match. A word the catalogue never uses ("Legend", "luxury") can't tell activities apart,
  // so it counts like a common one rather than the rarest.
  const weight = (w: string) => Math.log(1 + acts.length / (df.get(w) ?? 12));
  const inPlaces = (destinationId: string, ids: string[]) => ids.includes(destinationId) || ids.includes(parentOf.get(destinationId) ?? "");

  /**
   * Best activities for a title (with its description as weaker evidence), best first. When the day's places are
   * known, only activities there (or the day before's and after's) count: "Island hopping" on a Phu Quoc day isn't
   * Nha Trang's.
   */
  function score(title: string, description: string, near: string[], exclude: Set<string>, otherStops: string[] = []) {
    const main = scan(title.replace(/\([^)]*\)/g, " ")).words;
    // The description's words count as weaker evidence, except those naming the title's other stops.
    const others = new Set(otherStops.flatMap((o) => scan(o).words));
    const side = new Set([...scan(title.match(/\(([^)]*)\)/g)?.join(" ") ?? "").words, ...scan(description).words.filter((w) => !others.has(w) || main.includes(w))]);
    const T = new Set(main);
    if (!T.size) return [];
    const tTotal = [...T].reduce((s, w) => s + weight(w), 0);
    return acts
      .filter((a) => !exclude.has(a.id) && a.tokens.length && (!near.length || inPlaces(a.destinationId, near)) && a.tokens.some((w) => T.has(w) || side.has(w)))
      .map((a) => {
        const cTotal = a.tokens.reduce((s, w) => s + weight(w), 0);
        const cat = a.tokens.reduce((s, w) => s + weight(w) * (T.has(w) ? 1 : side.has(w) ? 0.5 : 0), 0) / cTotal;
        const tit = [...T].reduce((s, w) => s + (a.tokens.includes(w) ? weight(w) : 0), 0) / tTotal;
        // The description names the whole activity ("glass skywalk at O Quy Ho Pass"): as good as a fair title match.
        const named = a.tokens.reduce((s, w) => s + (T.has(w) || side.has(w) ? weight(w) : 0), 0) / cTotal >= 0.75 ? THRESHOLD : 0;
        // A name only one or two activities use ("Fansipan", "VinWonders") is strong evidence on its own.
        const fair = (tit + cat) / 2;
        const rare = fair >= 0.3 && a.tokens.some((w) => T.has(w) && w.length >= 5 && (df.get(w) ?? 0) <= 2) ? THRESHOLD : 0;
        return { a, score: Math.max(fair, named, rare) };
      })
      .sort((x, y) => y.score - x.score);
  }

  return { scan, score, inPlaces };
}

const kindOf = (title: string): PlannedItem["type"] =>
  /\b(flight|fly|flights|transfer|bus|train to|airport|ferry)\b/i.test(title) ? "transport" : /\b(dinner|lunch|breakfast|brunch)\b/i.test(title) ? "restaurant" : "free_time";
const trimNotes = (s: string) => (s.length > 400 ? `${s.slice(0, 397).replace(/\s+\S*$/, "")} …` : s) || null;
const addMin = (t: string, m: number) => {
  const x = +t.slice(0, 2) * 60 + +t.slice(3, 5) + m;
  return `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/**
 * The plan for each PDF day, in order. Each activity sits on one day: it goes to the stop that matches it best
 * anywhere in the PDF ("Hanoi Old Quarter food walk" gets the street-food tour, even if an earlier "Hanoi Old Quarter"
 * stop also liked it), and activities in `taken` (already in the trip) aren't matched at all.
 */
export function planFromPdf(days: (PdfDay | null)[], places: PlanPlace[], activities: PlanActivity[], taken: Set<string> = new Set()): (PlannedDay | null)[] {
  const m = makeMatcher(places, activities);
  const headings = days.map((d) => (d ? m.scan(d.headingText).places : []));
  const lastPlaceBefore = (i: number) => headings.slice(0, i).reverse().find((h) => h.length)?.at(-1);

  // Every stop that could be an activity: each part of "A & B", or the whole title.
  type Slot = { day: number; entry: number; part: number | null; title: string; cands: { id: string; score: number }[] };
  const slots: Slot[] = [];
  days.forEach((d, i) => {
    if (!d) return;
    const before = lastPlaceBefore(i);
    const near = [...headings[i]!, ...(headings[i - 1] ?? []), ...(headings[i + 1] ?? []), ...(before ? [before] : [])];
    d.entries.forEach((e, k) => {
      // Flights, transfers and meals stay as they are in the PDF.
      if (kindOf(e.title) !== "free_time") return;
      const here = [...near, ...m.scan(`${e.title} ${e.description}`).places];
      const parts = splitStops(e.title);
      const slot = (part: number | null, title: string, others: string[]) => ({
        day: i,
        entry: k,
        part,
        title,
        cands: m.score(title, e.description, here, taken, others).filter((c) => c.score >= THRESHOLD).map((c) => ({ id: c.a.id, score: c.score })),
      });
      if (parts.length > 1) parts.forEach((p, j) => slots.push(slot(j, p, parts.filter((_, x) => x !== j))));
      slots.push(slot(null, e.title, []));
    });
  });
  // Best matches first, across the whole PDF. A stop's parts are tried before its whole title.
  const chosen = new Map<Slot, string>();
  const used = new Set<string>();
  const assign = (pool: Slot[]) => {
    const offers = pool.flatMap((sl) => sl.cands.map((c) => ({ sl, ...c }))).sort((x, y) => y.score - x.score);
    for (const o of offers) if (!chosen.has(o.sl) && !used.has(o.id)) chosen.set(o.sl, o.id), used.add(o.id);
  };
  const multi = (sl: Slot) => slots.some((x) => x.day === sl.day && x.entry === sl.entry && x.part !== null);
  assign(slots.filter((sl) => (sl.part !== null) || !multi(sl)));
  const partsHit = (sl: Slot) => slots.some((x) => x.day === sl.day && x.entry === sl.entry && x.part !== null && chosen.has(x));
  assign(slots.filter((sl) => sl.part === null && multi(sl) && !partsHit(sl)));

  let prevPlace: string | null = null;
  return days.map((d, i) => {
    if (!d) return null;
    const heading = headings[i]!;
    const items = d.entries.flatMap((e, k) => {
      const hits = slots.filter((sl) => sl.day === i && sl.entry === k && chosen.has(sl)).map((sl) => ({ title: sl.title, id: chosen.get(sl)!, part: sl.part }));
      return entryItems(e, hits.sort((x, y) => (x.part ?? 0) - (y.part ?? 0)));
    });
    // The day's place: the heading's place with most planned activities (where the day is spent), else the
    // places of its activities, else the last place it names (a travel day ends there), else the day before's.
    const destOf = (id: string) => activities.find((a) => a.id === id)!.destinationId;
    const count = (id: string) => items.filter((it) => it.activityId && m.inPlaces(destOf(it.activityId), [id])).length;
    const fromActs = items.flatMap((it) => (it.activityId ? [destOf(it.activityId)] : []));
    const best = heading.length ? [...heading].sort((a, b) => count(b) - count(a))[0]! : null;
    const destinationId = best && (count(best) > 0 || heading.length === 1) ? best : (fromActs[0] ?? heading.at(-1) ?? prevPlace);
    prevPlace = destinationId ?? prevPlace;
    return { destinationId, title: dayTitle(d, items, m), items };
  });
}

/** "Hanoi Old Quarter & Train Street" → its stops ("(Duong Dong)" stays with its stop). */
function splitStops(title: string) {
  const outside = title.replace(/\([^)]*\)/g, (p) => p.replace(/[&,]|\band\b/g, " "));
  return outside.split(/\s*(?:&|\+|,|\band\b)\s*/).map((p) => p.trim()).filter(Boolean);
}

function entryItems(e: PdfEntry, hits: { title: string; id: string }[]): PlannedItem[] {
  const notes = trimNotes(e.description);
  const duration = e.durationMin;
  if (!hits.length) return [{ time: e.start, durationMin: duration, title: e.title.replace(/^Optional:\s*/i, ""), activityId: null, type: kindOf(e.title), notes }];
  // One stop takes the whole slot; several share it in order.
  const share = duration ? Math.max(15, Math.round(duration / hits.length / 5) * 5) : null;
  const single = hits.length === 1;
  return hits.map((h, i) => ({
    time: e.start && share ? addMin(e.start, share * i) : e.start,
    durationMin: single ? duration : share,
    title: (single ? e.title : h.title).replace(/^Optional:\s*/i, ""),
    activityId: h.id,
    type: "activity" as const,
    notes: single ? notes : `${e.title}. ${notes ?? ""}`.trim(),
  }));
}

/**
 * The PDF's own heading when it says more than the place ("HCMC → Da Nang", "Hanoi departure"), else the day's
 * first stops ("VinWonders Phu Quoc and Grand World Phu Quoc").
 */
function dayTitle(d: PdfDay, items: PlannedItem[], m: ReturnType<typeof makeMatcher>) {
  if (d.place && (/→|->/.test(d.place) || m.scan(d.place).words.length)) return d.place.charAt(0).toUpperCase() + d.place.slice(1);
  const names = items.filter((i) => i.type !== "transport").map((i) => i.title.replace(/\s*\([^)]*\)/g, ""));
  const two = names.slice(0, 2).join(" and ");
  return (two.length <= 70 ? two : names[0]) || d.place || null;
}
