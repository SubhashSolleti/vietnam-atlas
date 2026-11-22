/**
 * Writes the base itinerary (src/content/base-plan.ts) into a trip: day titles and destinations, the booked flights
 * and transfers, timed itinerary items, and a shortlist entry for every planned activity so each traveller can mark
 * it "I'm in", "Skip" or "Already done".
 *
 * Used by the seed (new databases) and by db:setup's one-time upgrade of the existing group trip.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../open";
import * as t from "../schema";
import { basePlanDays, basePlanLegs } from "../../content/base-plan";
import { activityCostFromPrice } from "../../lib/budget-engine";
import { dateRange } from "../../lib/utils";

/** The database or an open transaction. */
export type Conn = Pick<Database, "select" | "insert" | "update" | "delete">;

export async function applyBasePlan(db: Conn, trip: { id: string; startDate: string; endDate: string }, ownerMemberId: string | null, partySize: number) {
  const slugs = [...new Set([...basePlanDays.map((d) => d.destination), ...basePlanLegs.flatMap((l) => [l.from, l.to]).filter(Boolean)])];
  const destId = new Map((await db.select({ id: t.destinations.id, slug: t.destinations.slug }).from(t.destinations).where(inArray(t.destinations.slug, slugs)).all()).map((d) => [d.slug, d.id]));
  const actSlugs = basePlanDays.flatMap((d) => d.items.flatMap((i) => (i.activity ? [i.activity] : [])));
  const acts = await db.select({ id: t.activities.id, slug: t.activities.slug }).from(t.activities).where(inArray(t.activities.slug, actSlugs)).all();
  const actId = new Map(acts.map((a) => [a.slug, a.id]));
  const missing = [...slugs.filter((s) => !destId.has(s)), ...actSlugs.filter((s) => !actId.has(s))];
  if (missing.length) throw new Error(`Base plan refers to unknown catalogue slugs: ${missing.join(", ")}`);
  const prices = new Map(
    (await db
      .select()
      .from(t.activityPrices)
      .where(and(inArray(t.activityPrices.activityId, acts.map((a) => a.id)), eq(t.activityPrices.isCurrent, true)))
      .all()).map((p) => [p.activityId, p]),
  );

  // Days: one per date, titled and placed as in the plan.
  const have = new Set((await db.select({ date: t.itineraryDays.date }).from(t.itineraryDays).where(eq(t.itineraryDays.tripId, trip.id)).all()).map((d) => d.date));
  const missingDays = dateRange(trip.startDate, trip.endDate).filter((d) => !have.has(d));
  if (missingDays.length) await db.insert(t.itineraryDays).values(missingDays.map((date) => ({ tripId: trip.id, date }))).run();
  const dayId = new Map((await db.select({ id: t.itineraryDays.id, date: t.itineraryDays.date }).from(t.itineraryDays).where(eq(t.itineraryDays.tripId, trip.id)).all()).map((d) => [d.date, d.id]));
  for (const d of basePlanDays) {
    if (!dayId.has(d.date)) continue;
    await db
      .update(t.itineraryDays)
      .set({ destinationId: destId.get(d.destination)!, title: d.title, notes: d.notes ?? null })
      .where(eq(t.itineraryDays.id, dayId.get(d.date)!))
      .run();
  }

  // Transport: booked flights are fixed; transfers and buses are ideas until someone books them.
  const legRows = basePlanLegs.map((l) => ({
    id: crypto.randomUUID(),
    tripId: trip.id,
    fromDestinationId: l.from ? destId.get(l.from)! : null,
    toDestinationId: l.to ? destId.get(l.to)! : null,
    fromLabel: l.fromLabel,
    toLabel: l.toLabel,
    mode: l.mode,
    departAt: l.departAt,
    arriveAt: l.arriveAt ?? null,
    durationMin: l.durationMin ?? null,
    costVnd: l.costVnd ?? 0,
    costMode: l.costMode ?? ("per_person" as const),
    overnight: !!l.overnight,
    isFixed: l.booked,
    isInternational: !!l.international,
    status: l.booked ? ("booked" as const) : ("idea" as const),
    notes: l.notes,
  }));
  await db.insert(t.transportLegs).values(legRows).run();

  // Items: everything on a day, in time order.
  type Row = typeof t.itineraryItems.$inferInsert;
  const byDay = new Map<string, (Row & { time: string })[]>();
  const push = (date: string, row: Row & { time: string }) => {
    if (!dayId.has(date)) return;
    byDay.set(date, [...(byDay.get(date) ?? []), row]);
  };
  basePlanLegs.forEach((l, i) =>
    push(l.itemDate, {
      tripId: trip.id,
      dayId: dayId.get(l.itemDate)!,
      type: "transport",
      transportLegId: legRows[i]!.id,
      title: l.itemTitle,
      startTime: l.itemTime,
      durationMin: l.itemDurationMin,
      notes: l.notes,
      time: l.itemTime,
    }),
  );
  for (const d of basePlanDays)
    for (const i of d.items) {
      const activityId = i.activity ? actId.get(i.activity)! : null;
      const est = activityId ? activityCostFromPrice(prices.get(activityId), partySize) : { amountVnd: 0, costMode: "per_person" as const };
      push(d.date, {
        tripId: trip.id,
        dayId: dayId.get(d.date)!,
        type: activityId ? "activity" : (i.type ?? "note"),
        activityId,
        title: i.title,
        startTime: i.time,
        durationMin: i.durationMin,
        costVnd: est.amountVnd,
        costMode: est.costMode,
        notes: i.notes ?? null,
        time: i.time,
      });
    }
  const items = [...byDay.values()].flatMap((rows) => rows.sort((a, b) => a.time.localeCompare(b.time)).map(({ time: _time, ...row }, sort) => ({ ...row, sort })));
  if (items.length) await db.insert(t.itineraryItems).values(items).run();

  // Every planned activity goes on the shortlist, already scheduled, so travellers can vote on it.
  const candidates = [...new Set(actSlugs)].map((slug) => ({
    tripId: trip.id,
    activityId: actId.get(slug)!,
    addedBy: ownerMemberId,
    status: "scheduled" as const,
    participation: "everyone" as const,
    note: "From the base plan",
  }));
  if (candidates.length) await db.insert(t.tripCandidates).values(candidates).onConflictDoNothing().run();
  return { days: basePlanDays.length, items: items.length, legs: legRows.length };
}
