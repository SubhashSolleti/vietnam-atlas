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
