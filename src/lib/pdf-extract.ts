/**
 * Reads an itinerary PDF: its page count, the page each trip day starts on, and what it says for each day.
 * Server only (PDF.js via unpdf). Throws if the file can't be parsed.
 */
import { findDayPages, findDayTexts } from "./pdf-days";

export async function analyseItineraryPdf(bytes: Uint8Array, dayCount: number) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const dayPages = findDayPages(text, dayCount);
  return { pageCount: totalPages, dayPages, dayTexts: findDayTexts(text, dayPages) };
}
