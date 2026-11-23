/**
 * Reads an itinerary PDF: its page count, and for each trip day the page it starts on, what it says, and its
 * parsed heading and entries. Server only (PDF.js via unpdf). Throws if the file can't be parsed.
 */
import { daySections, dayTextFor, findDayPages, parseDaySection, type PdfDay } from "./pdf-days";

/** Most "Day N" headings looked for. */
const MAX_PDF_DAYS = 45;

export async function analyseItineraryPdf(bytes: Uint8Array, tripDates: string[]) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { pageCount: totalPages, ...daysForTrip(text, tripDates) };
}

/**
 * Lines the PDF's days up with the trip's. When headings carry dates ("Day 1 · Phu Quoc Sat, Dec 12"), PDF Day 1
 * goes on Dec 12 even if the trip starts the day before; otherwise PDF Day 1 is the trip's first day. Pure.
 */
export function daysForTrip(pageTexts: string[], tripDates: string[]) {
  const pages = findDayPages(pageTexts, MAX_PDF_DAYS);
  const sections = daySections(pageTexts, pages);
  const parsed = sections.map((raw) => (raw ? parseDaySection(raw) : null));
  // The usual gap between a PDF day's date and its number, in trip days.
  const shifts = new Map<number, number>();
  parsed.forEach((d, j) => {
    const i = d?.monthDay ? tripDates.findIndex((date) => date.slice(5) === d.monthDay) : -1;
    if (i >= 0) shifts.set(i - j, (shifts.get(i - j) ?? 0) + 1);
  });
  const shift = [...shifts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const at = (i: number) => i - shift;
  return {
    dayPages: tripDates.map((_, i) => pages[at(i)] ?? null),
    dayTexts: tripDates.map((_, i) => dayTextFor(sections[at(i)] ?? null)),
    days: tripDates.map((_, i): PdfDay | null => parsed[at(i)] ?? null),
  };
}
