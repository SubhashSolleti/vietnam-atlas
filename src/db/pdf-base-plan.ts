/**
 * Fills a trip's empty days from its itinerary PDF: each day's place and title, and the PDF's timed entries as
 * itinerary items. Entries matched to catalogue activities become base-plan activities (with a shortlist entry, so
 * travellers can skip, move or swap them); flights, transfers, meals and unmatched stops stay as fixed rows.
 *
 * Days that already have items are left alone, so the owner's edits are never overwritten. Used when the owner
 * attaches a PDF, and by db:setup for trips that had one attached before this existed.
 */
import { and, eq, inArray } from "drizzle-orm";
import * as t from "./schema";
import type { Conn } from "./seed/base-plan";
import type { PdfDay } from "../lib/pdf-days";
import { planFromPdf } from "../lib/pdf-plan";
import { activityCostFromPrice } from "../lib/budget-engine";

export async function fillDaysFromPdf(db: Conn, tripId: string, pdfDays: (PdfDay | null)[], opts: { partySize: number; addedBy: string | null }) {
  const days = await db.select().from(t.itineraryDays).where(eq(t.itineraryDays.tripId, tripId)).orderBy(t.itineraryDays.date).all();
  const items = await db.select({ dayId: t.itineraryItems.dayId, activityId: t.itineraryItems.activityId }).from(t.itineraryItems).where(eq(t.itineraryItems.tripId, tripId)).all();
  const busy = new Set(items.map((i) => i.dayId));
  const taken = new Set(items.flatMap((i) => (i.activityId ? [i.activityId] : [])));
  if (!pdfDays.some((d, i) => d?.entries.length && days[i] && !busy.has(days[i]!.id))) return { days: 0, activities: 0, items: 0 };

  const places = await db.select({ id: t.destinations.id, slug: t.destinations.slug, name: t.destinations.name, localName: t.destinations.localName, parentId: t.destinations.parentId }).from(t.destinations).all();
  const activities = await db.select({ id: t.activities.id, slug: t.activities.slug, title: t.activities.title, destinationId: t.activities.destinationId, durationHours: t.activities.durationHours }).from(t.activities).all();
  const plan = planFromPdf(pdfDays, places, activities, taken);
  // A stop the PDF gives no end time ("9:00 PM–late") takes the activity's usual length.
  const hours = new Map(activities.map((a) => [a.id, a.durationHours]));
  const usualLength = (activityId: string | null) => (activityId && hours.get(activityId) ? Math.round(hours.get(activityId)! * 60) : null);

  const rows: (typeof t.itineraryItems.$inferInsert)[] = [];
  let filled = 0;
  for (const [i, day] of days.entries()) {
    const p = plan[i];
    if (!p || !p.items.length || busy.has(day.id)) continue;
    filled++;
    const set = { ...(day.destinationId ? {} : { destinationId: p.destinationId }), ...(day.title ? {} : { title: p.title }) };
    if (Object.keys(set).length) await db.update(t.itineraryDays).set(set).where(eq(t.itineraryDays.id, day.id)).run();
    p.items
      .slice()
      .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"))
      .forEach((it, sort) =>
        rows.push({ tripId, dayId: day.id, sort, type: it.type, activityId: it.activityId, title: it.title.slice(0, 200), startTime: it.time, durationMin: it.durationMin ?? usualLength(it.activityId), notes: it.notes, source: "plan" }),
      );
  }
  const actIds = [...new Set(rows.flatMap((r) => (r.activityId ? [r.activityId] : [])))];
  if (actIds.length) {
    const prices = new Map(
      (await db.select().from(t.activityPrices).where(and(inArray(t.activityPrices.activityId, actIds), eq(t.activityPrices.isCurrent, true))).all()).map((p) => [p.activityId, p]),
    );
    for (const r of rows) {
      if (!r.activityId) continue;
      const est = activityCostFromPrice(prices.get(r.activityId), opts.partySize);
      r.costVnd = est.amountVnd;
      r.costMode = est.costMode;
    }
  }
  if (rows.length) await db.insert(t.itineraryItems).values(rows).run();
  // Every planned activity goes on the shortlist, already scheduled, so travellers can mark it.
  if (actIds.length)
    await db
      .insert(t.tripCandidates)
      .values(actIds.map((activityId) => ({ tripId, activityId, addedBy: opts.addedBy, status: "scheduled" as const, participation: "everyone" as const, note: "From the itinerary PDF" })))
      .onConflictDoNothing()
      .run();
  return { days: filled, activities: actIds.length, items: rows.length };
}
