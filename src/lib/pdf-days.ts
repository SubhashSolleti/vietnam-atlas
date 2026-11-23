const WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** Regexes for a "Day n" heading: "Day 3 · Hue", "DAY 03:", "Day-3", "Day 3 (Sat)", "Day Three", or "Day 3 …" starting a line. */
function headings(n: number) {
  const num = `(?:0?${n}(?!\\d)${WORDS[n - 1] ? `|${WORDS[n - 1]}\\b` : ""})`;
  const day = `Day[\\s\\-–—]*${num}`;
  return [
    // Anywhere, when followed by a separator or a line break ("Day 1" never matches "Day 12", and "Days 1–3" never matches).
    new RegExp(`\\b${day}\\s*(?:[·•:|\\-–—.,;/()]|\\r?\\n|$)`, "i"),
    // At the start of a line, whatever follows ("Day 3 Hanoi", "DAY 3 Sat, Dec 14").
    new RegExp(`(?:^|\\n)[\\s#*•]*${day}`, "i"),
  ];
}

/**
 * Finds the page each trip day starts on in an itinerary PDF. Pure: takes the text of each page (page 1 first).
 * Days with no heading found are null.
 *
 * Itineraries often have an overview page listing every day, and mention days in passing ("unlike Day 5,"). So:
 * a page that names at least half the days is an overview, used only when a day is found nowhere else; and days
 * run in order, so each day takes the first page with its heading at or after the previous day's page.
 */
export function findDayPages(pageTexts: string[], dayCount: number): (number | null)[] {
  const candidates = Array.from({ length: dayCount }, (_, i) => {
    const res = headings(i + 1);
    return pageTexts.flatMap((text, p) => (res.some((re) => re.test(text)) ? [p + 1] : []));
  });
  const found = candidates.filter((c) => c.length).length;
  const perPage = new Map<number, number>();
  for (const c of candidates) for (const p of c) perPage.set(p, (perPage.get(p) ?? 0) + 1);
  const overview = new Set([...perPage].filter(([, n]) => found >= 4 && n >= Math.max(4, found / 2)).map(([p]) => p));

  let prev = 0;
  return candidates.map((all) => {
    const pages = all.some((p) => !overview.has(p)) ? all.filter((p) => !overview.has(p)) : all;
    if (!pages.length) return null;
    const page = pages.find((p) => p >= prev) ?? pages[0]!;
    prev = Math.max(prev, page);
    return page;
  });
}

// A line that starts an itinerary entry: "3:30–6:00 PM …", "9:30 AM–4:30 PM …", "7:00 AM–about", "6:30 PM Dinner…",
// "Morning Flight…", "Around 10:00 PM …". A time inside a sentence ("10:30 AM; drop bags") doesn't count.
const ENTRY_TIME = /^(?:\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\s*[–—-]\s*(?:\d|about\b|late\b)|\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s+[A-Z]|\d{1,2}:\d{2}\s+(?!AM\b|PM\b)[A-Z])/i;
const ENTRY_WORD = /^(?:(?:Morning|Afternoon|Evening|Night|All day)\b|Around \d)/;
const ENTRY = { test: (line: string) => ENTRY_TIME.test(line) || ENTRY_WORD.test(line) };
const TIME_ONLY = /^[\d:\s]*(?:AM|PM)?\s*[–—-]\s*(?:about)?$/i;
/** "9:00 PM fire-and-water show." wrapped onto a new line: a time inside a sentence (titles start with a capital). */
const MID_SENTENCE = /^\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s+[a-z]/;

/** Joins a PDF's wrapped lines back into entries (one per time slot), dropping running headers and footers. */
export function tidyDayText(raw: string) {
  let lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // The section starts with its own "Day N · …" heading (sometimes wrapped over a few lines), which the board shows.
  const first = lines.findIndex((l, i) => i > 0 && ENTRY.test(l));
  if (first > 0 && first <= 6) lines = lines.slice(first);
  else if (lines.length > 1) lines.shift();
  else if (lines[0]) lines[0] = lines[0].replace(/^Day[\s\-–—]*\w+\s*[·•:|\-–—.,]?\s*/i, "");
  // A short title-like line at the very end is the next section's subtitle ("Hanoi and the highlands").
  // (Title-like: capitalised words, no figures or punctuation but commas. A wrapped "hrs" or "mins" is not one.)
  while (lines.length > 1 && lines.at(-1)!.length < 50 && /^[A-Z][^\d.;:!?()]*\s[^\d.;:!?()]+$/.test(lines.at(-1)!)) lines.pop();
  const entries: string[] = [];
  for (const line of lines) {
    const letters = line.replace(/[^A-Za-z]/g, "");
    // Running headers like "VIETNAM · 12–25 DECEMBER 2026" or letter-spaced "T H E I T I N E R A R Y".
    if ((letters.length >= 8 && letters === letters.toUpperCase()) || /^(?:\S\s){5,}/.test(line)) continue;
    const last = entries.at(-1);
    // "Morning …" only starts an entry once the previous one is finished ("… 1.5 hrs"), not mid-description.
    const starts = (ENTRY_TIME.test(line) && !MID_SENTENCE.test(line)) || (ENTRY_WORD.test(line) && !!last && /(?:\bhrs?|\bmins?|\.)$/i.test(last));
    if (!last || (starts && !TIME_ONLY.test(last))) entries.push(line);
    else entries[entries.length - 1] = /[-–]$/.test(last) && /^[a-z]/.test(line) ? last + line : `${last} ${line}`;
  }
  return entries.join("\n").trim() || null;
}

/** The raw text of each day's section: from its "Day N" heading to the next day's (the last runs to the end of its page). */
export function daySections(pageTexts: string[], dayPages: (number | null)[]): (string | null)[] {
  const offsets: number[] = [];
  let full = "";
  for (const text of pageTexts) {
    offsets.push(full.length);
    full += `${text}\n`;
  }
  const starts = dayPages.map((page, i) => {
    if (!page) return null;
    const text = pageTexts[page - 1] ?? "";
    const at = headings(i + 1)
      .map((re) => {
        const m = re.exec(text);
        return m ? m.index + (m[0].length - m[0].trimStart().length) : -1;
      })
      .filter((x) => x >= 0);
    return at.length ? offsets[page - 1]! + Math.min(...at) : null;
  });
  return starts.map((start, i) => {
    if (start == null) return null;
    const next = starts.slice(i + 1).find((x): x is number => x != null && x > start);
    const end = next ?? offsets[dayPages[i]!] ?? full.length;
    return full.slice(start, end);
  });
}

/** A day's text for the board: tidied (see tidyDayText) and capped, ending on a whole entry. */
export function dayTextFor(raw: string | null, maxChars = 3000) {
  if (raw == null) return null;
  const tidy = tidyDayText(raw);
  if (!tidy || tidy.length <= maxChars) return tidy;
  const cut = tidy.slice(0, maxChars);
  return (cut.includes("\n") ? cut.slice(0, cut.lastIndexOf("\n")) : cut).trim() + " …";
}

/**
 * What the PDF says for each day: the text from that day's heading to the next day's, tidied (see tidyDayText).
 * Uses the pages findDayPages chose. Null for days without a heading. Capped, ending on a whole entry.
 */
export function findDayTexts(pageTexts: string[], dayPages: (number | null)[], maxChars = 3000): (string | null)[] {
  return daySections(pageTexts, dayPages).map((raw) => dayTextFor(raw, maxChars));
}

// ---- Reading a day's section into a heading (place, date) and timed entries ----

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const DATE_RE = new RegExp(
  `(?:\\b(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?,?\\s*)?(?:\\b${MON}\\s*(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*${MON}|\\b\\d{4}-(\\d{2})-(\\d{2})\\b)`,
  "i",
);
const pad = (n: number) => String(n).padStart(2, "0");
const isRunningHeader = (line: string) => {
  const letters = line.replace(/[^A-Za-z]/g, "");
  return (letters.length >= 8 && letters === letters.toUpperCase()) || /^(?:\S\s){5,}/.test(line);
};

export type PdfEntry = {
  /** "HH:MM" (24-hour), or null when the entry has no time. */
  start: string | null;
  end: string | null;
  title: string;
  description: string;
  /** From the times, else from a trailing "2.5 hrs" / "45 mins" in the description. */
  durationMin: number | null;
};
export type PdfDay = {
  /** What the heading says after "Day N", without the date: "Phu Quoc", "HCMC → Da Nang". */
  place: string | null;
  /** Every line of the heading (including an all-caps place label), for finding places. */
  headingText: string;
  /** "MM-DD" when the heading has a date. */
  monthDay: string | null;
  entries: PdfEntry[];
};

const to24 = (h: number, m: number, mer: string | undefined) => {
  let hh = h;
  if (mer?.toUpperCase() === "PM" && h < 12) hh += 12;
  if (mer?.toUpperCase() === "AM" && h === 12) hh = 0;
  return hh * 60 + m;
};
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const WORD_TIMES: Record<string, number> = { morning: 9 * 60, afternoon: 14 * 60, evening: 18 * 60, night: 20 * 60, "all day": 9 * 60 };

/** The time an entry line starts with, and the rest of the line. */
export function parseEntryTime(line: string): { start: string | null; end: string | null; rest: string } | null {
  const range = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–—-]\s*(?:about\s*)?(?:(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?|(late)\b)/i.exec(line);
  if (range) {
    const [m, h1, m1, mer1, h2, m2, mer2] = range;
    let start = to24(+h1!, +(m1 ?? 0), mer1 ?? mer2);
    const end = h2 != null ? to24(+h2, +(m2 ?? 0), mer2 ?? mer1) : null;
    if (!mer1 && mer2?.toUpperCase() === "PM" && end != null && start > end) start -= 12 * 60;
    return { start: hhmm(start), end: end == null ? null : hhmm(end), rest: line.slice(m.length).trim() };
  }
  const single = /^(?:around\s+)?(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b|^(?:around\s+)?(\d{1,2}):(\d{2})\b/i.exec(line);
  if (single) {
    const [m, h1, m1, mer, h2, m2] = single;
    const start = h1 != null ? to24(+h1, +(m1 ?? 0), mer) : to24(+h2!, +m2!, undefined);
    return { start: hhmm(start), end: null, rest: line.slice(m.length).trim() };
  }
  const word = /^(morning|afternoon|evening|night|all day)\b/i.exec(line);
  if (word) return { start: hhmm(WORD_TIMES[word[1]!.toLowerCase()]!), end: null, rest: line.slice(word[0].length).trim() };
  return null;
}

const CONNECTORS = new Set(["and", "of", "the", "to", "a", "at", "in", "on", "de", "du", "la", "by", "&", "style", "or"]);
/** A wrapped line that continues an entry's title ("(Duong Dong)", "Central Post Office & Cafe"), not its description. */
function looksLikeTitle(line: string) {
  if (line.startsWith("(")) return true;
  if (/[.,;:!?]/.test(line.replace(/\([^)]*\)/g, ""))) return false;
  const words = line.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  return words.length > 0 && words.every((w) => /^[“"'(‘]*[A-Z0-9]/.test(w) || CONNECTORS.has(w.replace(/[^\w&]/g, "").toLowerCase()));
}
const ENTRY_END = /(?:\b\d+(?:\.\d+)?\s*(?:hrs?|hours?|mins?|minutes)|^(?:hrs?|hours?|mins?|minutes)|^Optional|^Full-day outing|^Half-day outing)\.?$/i;
/** "… 2.75 hrs Before you go: …": a note run on after the entry's length, on the same line. */
const RUN_ON_NOTE = /(\b\d+(?:\.\d+)?\s*(?:hrs?|hours?|mins?|minutes)(?:\s+(?:by bus|by road|by car|by train|door to door|including transfers|in total|each way))?)\s+[A-Z][\s\S]*$/;
const DURATION_RE = /(\d+(?:\.\d+)?)\s*(hrs?|hours?|mins?|minutes)\b/gi;

/** Reads one day's raw section (from daySections) into its heading and entries. Pure. */
export function parseDaySection(raw: string): PdfDay {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const startsEntry = (line: string, prev: string | undefined) =>
    ENTRY_TIME.test(line) || (ENTRY_WORD.test(line) && (!prev || /(?:\bhrs?|\bmins?|\.|door to door|by bus|transfers|Optional|outing)$/i.test(prev)));
  let first = lines.findIndex((l, i) => i > 0 && startsEntry(l, undefined));
  if (first < 0 || first > 8) first = Math.min(1, lines.length);
  const headingLines = lines.slice(0, first);
  headingLines[0] = (headingLines[0] ?? "").replace(/^Day[\s\-–—]*\w+\s*[·•:|\-–—.,]?\s*/i, "");
  const headingText = headingLines.join(" ").replace(/\s+/g, " ").trim();
  const placeText = headingLines.filter((l) => !isRunningHeader(l)).join(" ").replace(/\s+/g, " ").trim();
  const date = DATE_RE.exec(placeText);
  let monthDay: string | null = null;
  if (date) {
    const mon = date[1] ?? date[4];
    const day = date[2] ?? date[3];
    if (mon && day) monthDay = `${pad(MONTHS.indexOf(mon.slice(0, 3).toLowerCase()) + 1)}-${pad(+day)}`;
    else if (date[5] && date[6]) monthDay = `${date[5]}-${date[6]}`;
  }
  const place = (date ? placeText.slice(0, date.index) : placeText).replace(/[\s·•:|,\-–—]+$/, "").trim() || null;

  // Entries: a time starts one; its title runs on over title-like lines, then the description.
  type Draft = { start: string | null; end: string | null; title: string[]; desc: string[]; closed?: boolean };
  const drafts: Draft[] = [];
  const body: string[] = [];
  // "7:00 AM–about" on its own line is finished by the next one.
  for (const l of lines.slice(first).filter((x) => !isRunningHeader(x))) {
    if (body.length && TIME_ONLY.test(body.at(-1)!)) body[body.length - 1] = `${body.at(-1)} ${l}`;
    else body.push(l);
  }
  // A short title-like line at the very end is the next section's subtitle.
  while (body.length > 1 && body.at(-1)!.length < 50 && /^[A-Z][^\d.;:!?()]*\s[^\d.;:!?()]+$/.test(body.at(-1)!)) body.pop();
  body.forEach((line, i) => {
    const cur = drafts.at(-1);
    const prev = cur ? (cur.desc.at(-1) ?? cur.title.at(-1)) : undefined;
    // A time at the start of a wrapped line ("9:00 PM fire-and-water show.") is mid-sentence: titles start with a capital.
    const time = startsEntry(line, prev) ? parseEntryTime(line) : null;
    if (time && cur && /^[a-z]/.test(time.rest)) {
      cur.desc.push(line);
      return;
    }
    if (time) {
      drafts.push({ start: time.start, end: time.end, title: time.rest ? [time.rest] : [], desc: [] });
      return;
    }
    if (!cur) return;
    const next = body[i + 1];
    const shortTail = line.split(/\s+/).length <= 2 && !/[.,;:!?]$/.test(cur.title.at(-1) ?? ".") && !!next && /^[A-Z]/.test(next) && !/[.,;:]/.test(line);
    if (cur.closed) return;
    if (!cur.desc.length && cur.title.join(" ").length < 90 && (!cur.title.length || looksLikeTitle(line) || shortTail)) cur.title.push(line);
    else cur.desc.push(line);
    // An entry ends with its length ("2.5 hrs", "Optional"); text after it is a note for the page, not this entry.
    if (cur.desc.length && ENTRY_END.test(line)) cur.closed = true;
  });
  const join = (parts: string[]) => parts.reduce((s, l) => (!s ? l : /[-–]$/.test(s) && /^[a-z]/.test(l) ? s + l : `${s} ${l}`), "").replace(/\s+/g, " ").trim();
  const entries = drafts
    .map((d): PdfEntry => {
      const title = join(d.title);
      let description = join(d.desc).replace(RUN_ON_NOTE, "$1");
      const mins = d.start && d.end ? (toMin(d.end) - toMin(d.start) + 24 * 60) % (24 * 60) : 0;
      let durationMin: number | null = mins > 0 ? mins : null;
      const durs = [...description.matchAll(DURATION_RE)];
      const lastDur = durs.at(-1);
      if (lastDur && description.length - (lastDur.index! + lastDur[0].length) < 30) {
        if (durationMin == null) durationMin = Math.round(parseFloat(lastDur[1]!) * (/^h/i.test(lastDur[2]!) ? 60 : 1));
        // "… shrine. 45 mins" ends the description with the duration: that's shown separately.
        if (/^\s*$/.test(description.slice(lastDur.index! + lastDur[0].length))) description = description.slice(0, lastDur.index).trimEnd().replace(/\s*\b(?:about|approx\.?|around|roughly)$/i, "").trim();
      }
      // The entry's length label ("Optional", "Full-day outing") is shown by the times, not the description.
      description = description.replace(/\s*\b(?:Optional|Full-day outing|Half-day outing)$/, "").trim();
      return { start: d.start, end: d.end, title, description, durationMin };
    })
    .filter((e) => e.title);
  return { place, headingText, monthDay, entries };
}
const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);

/** The page to open for a day: its own, or the nearest earlier day that was found (else page 1). */
export function pageForDay(dayPages: (number | null)[], dayIndex: number) {
  for (let i = Math.min(dayIndex, dayPages.length - 1); i >= 0; i--) if (dayPages[i]) return { page: dayPages[i]!, exact: i === dayIndex };
  return { page: 1, exact: false };
}

/** Uploads larger than this are refused: a Vercel function can't receive much more in one request. */
export const MAX_PLAN_PDF_BYTES = 4 * 1024 * 1024;

export function isPdf(bytes: Uint8Array) {
  // "%PDF-" within the first kilobyte (some generators put a byte-order mark or junk first).
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}
