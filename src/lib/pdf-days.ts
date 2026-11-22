/**
 * Finds the page each trip day starts on in an itinerary PDF, from headings like "Day 3 · Phu Quoc" or "Day 3:".
 * Pure: takes the text of each page (page 1 first). Days with no heading found are null.
 */
export function findDayPages(pageTexts: string[], dayCount: number): (number | null)[] {
  return Array.from({ length: dayCount }, (_, i) => {
    const n = i + 1;
    // "Day 1" must not match "Day 12", and a heading is followed by a separator or a line break, not "days".
    const heading = new RegExp(`\\bDay\\s*0?${n}(?!\\d)\\s*(?:[·•:|\\-–—.,]|\\r?\\n|$)`, "i");
    const page = pageTexts.findIndex((text) => heading.test(text));
    return page === -1 ? null : page + 1;
  });
}

/** Uploads larger than this are refused: a Vercel function can't receive much more in one request. */
export const MAX_PLAN_PDF_BYTES = 4 * 1024 * 1024;

export function isPdf(bytes: Uint8Array) {
  // "%PDF-" within the first kilobyte (some generators put a byte-order mark or junk first).
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}
