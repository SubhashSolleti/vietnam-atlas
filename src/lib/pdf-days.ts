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
const ENTRY_TIME = /^(?:\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\s*[–—-]\s*(?:\d|about\b)|\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s+[A-Z]|\d{1,2}:\d{2}\s+(?!AM\b|PM\b)[A-Z])/i;
const ENTRY_WORD = /^(?:Morning|Afternoon|Evening|Night|All day|Around \d)\b/;
const ENTRY = { test: (line: string) => ENTRY_TIME.test(line) || ENTRY_WORD.test(line) };
const TIME_ONLY = /^[\d:\s]*(?:AM|PM)?\s*[–—-]\s*(?:about)?$/i;

/** Joins a PDF's wrapped lines back into entries (one per time slot), dropping running headers and footers. */
export function tidyDayText(raw: string) {
  let lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // The section starts with its own "Day N · …" heading (sometimes wrapped over a few lines), which the board shows.
  const first = lines.findIndex((l, i) => i > 0 && ENTRY.test(l));
  if (first > 0 && first <= 6) lines = lines.slice(first);
  else if (lines.length > 1) lines.shift();
  else if (lines[0]) lines[0] = lines[0].replace(/^Day[\s\-–—]*\w+\s*[·•:|\-–—.,]?\s*/i, "");
  // A short title-like line at the very end is the next section's subtitle ("Hanoi and the highlands").
  // (Title-like: capitalised words, no figures or punctuation. A wrapped "hrs" or "mins" is not one.)
  while (lines.length > 1 && lines.at(-1)!.length < 50 && /^[A-Z][^\d.,;:!?()]*\s[^\d.,;:!?()]+$/.test(lines.at(-1)!)) lines.pop();
  const entries: string[] = [];
  for (const line of lines) {
    const letters = line.replace(/[^A-Za-z]/g, "");
    // Running headers like "VIETNAM · 12–25 DECEMBER 2026" or letter-spaced "T H E I T I N E R A R Y".
    if ((letters.length >= 8 && letters === letters.toUpperCase()) || /^(?:\S\s){5,}/.test(line)) continue;
    const last = entries.at(-1);
    // "Morning …" only starts an entry once the previous one is finished ("… 1.5 hrs"), not mid-description.
    const starts = ENTRY_TIME.test(line) || (ENTRY_WORD.test(line) && !!last && /(?:\bhrs?|\bmins?|\.)$/i.test(last));
    if (!last || (starts && !TIME_ONLY.test(last))) entries.push(line);
    else entries[entries.length - 1] = /[-–]$/.test(last) && /^[a-z]/.test(line) ? last + line : `${last} ${line}`;
  }
  return entries.join("\n").trim() || null;
}

/**
 * What the PDF says for each day: the text from that day's heading to the next day's, tidied (see tidyDayText).
 * Uses the pages findDayPages chose. Null for days without a heading. Capped, ending on a whole entry.
 */
export function findDayTexts(pageTexts: string[], dayPages: (number | null)[], maxChars = 1500): (string | null)[] {
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
    // The last day found runs to the end of its page.
    const end = next ?? offsets[dayPages[i]!] ?? full.length;
    const tidy = tidyDayText(full.slice(start, end));
    if (!tidy || tidy.length <= maxChars) return tidy;
    const cut = tidy.slice(0, maxChars);
    return (cut.includes("\n") ? cut.slice(0, cut.lastIndexOf("\n")) : cut).trim() + " …";
  });
}

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
