"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { routeTemplates } from "@/content/demo-trip";
import { run, UserError } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { activityCostFromPrice } from "@/lib/budget-engine";
import { isoDate, isoDateTime, participantList } from "@/lib/validation";
import { assertMember, membersOf } from "@/services/trips";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
  .nullable()
  .optional();
const localDateTime = isoDateTime.nullable().optional();
const money = z.number().int().min(0).max(5_000_000_000);
const participants = participantList.nullable().optional();

function touch(tripId: string) {
  db.update(t.trips).set({ updatedAt: new Date().toISOString() }).where(eq(t.trips.id, tripId)).run();
  revalidatePath("/", "layout");
}

function dayAccess(dayId: string, userId: string) {
  const day = db.select().from(t.itineraryDays).where(eq(t.itineraryDays.id, dayId)).get();
  if (!day) throw new UserError("Day not found.");
  return { day, ...assertMember(day.tripId, userId) };
}

/** null = everyone. An empty or all-invalid selection also means everyone (the forms have no "nobody" option). */
function cleanParticipants(tripId: string, list: string[] | null | undefined) {
  if (!list) return null;
  const ids = new Set(membersOf(tripId).map((m) => m.id));
  const valid = [...new Set(list)].filter((x) => ids.has(x));
  return valid.length === ids.size || !valid.length ? null : valid;
}

/* ───────── Days ───────── */

export async function updateDay(dayId: string, input: { destinationId?: string | null; title?: string | null; notes?: string | null }) {
  return run(async () => {
    const v = z
      .object({ destinationId: z.string().uuid().nullable().optional(), title: z.string().trim().max(120).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional() })
      .parse(input);
    const user = await requireUser();
    const { day } = dayAccess(dayId, user.id);
    db.update(t.itineraryDays).set(v).where(eq(t.itineraryDays.id, dayId)).run();
    touch(day.tripId);
    return {};
  });
}

/* ───────── Items ───────── */

const itemSchema = z.object({
  type: z.enum(["activity", "restaurant", "note", "free_time", "accommodation", "transport"]),
  activityId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Give it a title").max(160),
  startTime: time,
  durationMin: z.number().int().min(0).max(48 * 60).nullable().optional(),
  costVnd: money.optional(),
  costMode: z.enum(["per_person", "total"]).optional(),
  participants,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function addItineraryItem(dayId: string, input: z.input<typeof itemSchema>) {
  return run(async () => {
    const v = itemSchema.parse(input);
    const user = await requireUser();
    const { day } = dayAccess(dayId, user.id);
    let { costVnd, costMode, durationMin, title } = v;
    if (v.activityId) {
      const act = db.select().from(t.activities).where(eq(t.activities.id, v.activityId)).get();
      if (!act) throw new UserError("Activity not found.");
      const price = db.select().from(t.activityPrices).where(and(eq(t.activityPrices.activityId, act.id), eq(t.activityPrices.isCurrent, true))).get();
      const cand = db.select().from(t.tripCandidates).where(and(eq(t.tripCandidates.tripId, day.tripId), eq(t.tripCandidates.activityId, act.id))).get();
      if (cand) v.participants ??= cand.participants;
      const party = cleanParticipants(day.tripId, v.participants)?.length ?? membersOf(day.tripId).length;
      const est = activityCostFromPrice(price, party);
      costVnd ??= cand?.agreedPriceVnd ?? est.amountVnd;
      costMode ??= cand?.agreedPriceVnd != null ? "per_person" : est.costMode;
      durationMin ??= Math.round(act.durationHours * 60);
      title = title || act.title;
      // Scheduling moves an open or approved shortlist item along; a rejected or completed one keeps its status.
      if (cand && (cand.status === "discussion" || cand.status === "approved"))
        db.update(t.tripCandidates).set({ status: "scheduled" }).where(eq(t.tripCandidates.id, cand.id)).run();
    }
    const last = db.select({ sort: t.itineraryItems.sort }).from(t.itineraryItems).where(eq(t.itineraryItems.dayId, dayId)).orderBy(asc(t.itineraryItems.sort)).all().at(-1);
    const row = db
      .insert(t.itineraryItems)
      .values({
        tripId: day.tripId,
        dayId,
        sort: (last?.sort ?? -1) + 1,
        type: v.type,
        activityId: v.activityId ?? null,
        title,
        startTime: v.startTime ?? null,
        durationMin: durationMin ?? null,
        costVnd: costVnd ?? 0,
        costMode: costMode ?? "per_person",
        participants: cleanParticipants(day.tripId, v.participants),
        notes: v.notes ?? null,
      })
      .returning({ id: t.itineraryItems.id })
      .get();
    touch(day.tripId);
    return { itemId: row.id };
  });
}

export async function updateItineraryItem(itemId: string, input: Partial<z.input<typeof itemSchema>>) {
  return run(async () => {
    const v = itemSchema.partial().parse(input);
    const user = await requireUser();
    const item = db.select().from(t.itineraryItems).where(eq(t.itineraryItems.id, itemId)).get();
    if (!item) throw new UserError("That plan no longer exists.");
    assertMember(item.tripId, user.id);
    if (item.transportLegId) {
      const leg = db.select().from(t.transportLegs).where(eq(t.transportLegs.id, item.transportLegId)).get();
      if ((v.startTime !== undefined && v.startTime !== item.startTime) || (v.durationMin !== undefined && v.durationMin !== item.durationMin))
        throw new UserError(leg?.isFixed ? "This is a booked flight. Edit it from the transport panel if it has really changed." : "Change the time on the transport itself so the plan and the booking stay in step.");
    }
    const { participants: p, ...rest } = v;
    db.update(t.itineraryItems)
      .set({ ...rest, ...(p !== undefined ? { participants: cleanParticipants(item.tripId, p) } : {}) })
      .where(eq(t.itineraryItems.id, itemId))
      .run();
    touch(item.tripId);
    return {};
  });
}

export async function deleteItineraryItem(itemId: string) {
  return run(async () => {
    const user = await requireUser();
    const item = db.select().from(t.itineraryItems).where(eq(t.itineraryItems.id, itemId)).get();
    if (!item) return {};
    assertMember(item.tripId, user.id);
    if (item.transportLegId) {
      const leg = db.select().from(t.transportLegs).where(eq(t.transportLegs.id, item.transportLegId)).get();
      if (leg?.isFixed) throw new UserError("Booked flights can't be removed from the itinerary.");
    }
    db.delete(t.itineraryItems).where(eq(t.itineraryItems.id, itemId)).run();
    if (item.activityId) {
      const still = db.select().from(t.itineraryItems).where(and(eq(t.itineraryItems.tripId, item.tripId), eq(t.itineraryItems.activityId, item.activityId))).get();
      if (!still)
        db.update(t.tripCandidates)
          .set({ status: "approved" })
          .where(and(eq(t.tripCandidates.tripId, item.tripId), eq(t.tripCandidates.activityId, item.activityId), eq(t.tripCandidates.status, "scheduled")))
          .run();
    }
    touch(item.tripId);
    return {};
  });
}

/** Persist a drag-and-drop result: the full ordered item list for one or two days. */
export async function reorderItems(moves: { dayId: string; itemIds: string[] }[]) {
  return run(async () => {
    const v = z.array(z.object({ dayId: z.string().uuid(), itemIds: z.array(z.string().uuid()).max(100) })).min(1).max(2).parse(moves);
    const user = await requireUser();
    let tripId = "";
    db.transaction((tx) => {
      for (const m of v) {
        const day = tx.select().from(t.itineraryDays).where(eq(t.itineraryDays.id, m.dayId)).get();
        if (!day) throw new UserError("Day not found.");
        assertMember(day.tripId, user.id);
        if (tripId && tripId !== day.tripId) throw new UserError("Items can only move within one trip.");
        tripId = day.tripId;
        m.itemIds.forEach((id, idx) => {
          const item = tx.select().from(t.itineraryItems).where(eq(t.itineraryItems.id, id)).get();
          if (!item || item.tripId !== day.tripId) throw new UserError("Item not found.");
          if (item.dayId !== m.dayId && item.transportLegId) {
            const leg = tx.select().from(t.transportLegs).where(eq(t.transportLegs.id, item.transportLegId)).get();
            if (leg?.isFixed) throw new UserError("Booked flights can't be moved to another day.");
          }
          tx.update(t.itineraryItems).set({ dayId: m.dayId, sort: idx }).where(eq(t.itineraryItems.id, id)).run();
        });
      }
    });
    touch(tripId);
    return {};
  });
}

/* ───────── Transport ───────── */

const legSchema = z.object({
  fromDestinationId: z.string().uuid().nullable().optional(),
  toDestinationId: z.string().uuid().nullable().optional(),
  fromLabel: z.string().trim().min(1, "Where from?").max(120),
  toLabel: z.string().trim().min(1, "Where to?").max(120),
  mode: z.enum(["flight", "sleeper_bus", "cabin_bus", "train", "private_transfer", "rental_vehicle", "ride_hailing", "boat", "ferry"]),
  departAt: localDateTime,
  arriveAt: localDateTime,
  durationMin: z.number().int().min(0).max(72 * 60).nullable().optional(),
  costVnd: money.default(0),
  costMode: z.enum(["per_person", "total"]).default("per_person"),
  participants,
  overnight: z.boolean().default(false),
  luggageNote: z.string().trim().max(400).nullable().optional(),
  bookingRef: z.string().trim().max(80).nullable().optional(),
  status: z.enum(["idea", "quoted", "booked"]).default("idea"),
  notes: z.string().trim().max(1000).nullable().optional(),
});
const legInput = legSchema.refine((v) => !v.departAt || !v.arriveAt || v.arriveAt > v.departAt, { message: "Arrival must be after departure", path: ["arriveAt"] });

function syncLegItem(tripId: string, legId: string, opts: { updateFixed?: boolean } = {}) {
  const leg = db.select().from(t.transportLegs).where(eq(t.transportLegs.id, legId)).get();
  if (!leg) return;
  const existingMarker = db.select().from(t.itineraryItems).where(eq(t.itineraryItems.transportLegId, legId)).get();
  if (leg.isFixed && opts.updateFixed && existingMarker) {
    // Booked flights keep their hand-written marker ("Land at …"); move it to the departure day if that's
    // inside the trip, otherwise to the arrival day, at the matching time.
    const dayFor = (dt: string | null) => (dt ? db.select().from(t.itineraryDays).where(and(eq(t.itineraryDays.tripId, tripId), eq(t.itineraryDays.date, dt.slice(0, 10)))).get() : undefined);
    const dep = dayFor(leg.departAt);
    const arr = dayFor(leg.arriveAt);
    const anchor = dep ? { day: dep, at: leg.departAt } : arr ? { day: arr, at: leg.arriveAt } : null;
    if (anchor) db.update(t.itineraryItems).set({ dayId: anchor.day.id, startTime: anchor.at?.slice(11, 16) ?? null, durationMin: dep ? leg.durationMin : null }).where(eq(t.itineraryItems.id, existingMarker.id)).run();
    return;
  }
  const date = (leg.departAt ?? leg.arriveAt)?.slice(0, 10);
  const day = date ? db.select().from(t.itineraryDays).where(and(eq(t.itineraryDays.tripId, tripId), eq(t.itineraryDays.date, date))).get() : null;
  const existing = db.select().from(t.itineraryItems).where(eq(t.itineraryItems.transportLegId, legId)).get();
  if (!day) {
    if (existing && !leg.isFixed) db.delete(t.itineraryItems).where(eq(t.itineraryItems.id, existing.id)).run();
    return;
  }
  const values = {
    title: `${leg.fromLabel} → ${leg.toLabel}`,
    startTime: leg.departAt?.slice(11, 16) ?? null,
    durationMin: leg.durationMin,
    participants: leg.participants,
  };
  if (existing) {
    if (!leg.isFixed) db.update(t.itineraryItems).set({ ...values, dayId: day.id }).where(eq(t.itineraryItems.id, existing.id)).run();
  } else {
    const count = db.select().from(t.itineraryItems).where(eq(t.itineraryItems.dayId, day.id)).all().length;
    db.insert(t.itineraryItems).values({ tripId, dayId: day.id, sort: count, type: "transport", transportLegId: legId, costVnd: 0, ...values }).run();
  }
}

function computeArrival(departAt: string | null | undefined, durationMin: number | null | undefined) {
  if (!departAt || !durationMin) return null;
  const d = new Date(`${departAt}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + durationMin);
  return d.toISOString().slice(0, 16);
}

export async function saveTransportLeg(tripId: string, legId: string | null, input: z.input<typeof legSchema>, opts: { confirmFixedChange?: boolean } = {}) {
  return run(async () => {
    const v = legInput.parse(input);
    const user = await requireUser();
    const { member } = assertMember(tripId, user.id);
    const arriveAt = v.arriveAt ?? computeArrival(v.departAt, v.durationMin);
    const values = { ...v, arriveAt, participants: cleanParticipants(tripId, v.participants) };
    let id = legId;
    if (legId) {
      const leg = db.select().from(t.transportLegs).where(and(eq(t.transportLegs.id, legId), eq(t.transportLegs.tripId, tripId))).get();
      if (!leg) throw new UserError("Transport not found.");
      if (leg.isFixed && !opts.confirmFixedChange)
        throw new UserError("This is a booked international flight. Confirm that the booking has really changed to edit it.");
      if (leg.isFixed && member.role === "member") throw new UserError("Only the owner or an editor can change a booked flight.");
      db.update(t.transportLegs).set(values).where(eq(t.transportLegs.id, legId)).run();
    } else {
      id = db.insert(t.transportLegs).values({ tripId, ...values }).returning({ id: t.transportLegs.id }).get().id;
    }
    // A confirmed change to a booked flight also moves its itinerary marker.
    syncLegItem(tripId, id!, { updateFixed: !!opts.confirmFixedChange });
    touch(tripId);
    return { legId: id! };
  });
}

export async function deleteTransportLeg(legId: string) {
  return run(async () => {
    const user = await requireUser();
    const leg = db.select().from(t.transportLegs).where(eq(t.transportLegs.id, legId)).get();
    if (!leg) return {};
    assertMember(leg.tripId, user.id);
    if (leg.isFixed) throw new UserError("Booked international flights can't be deleted here.");
    db.delete(t.transportLegs).where(eq(t.transportLegs.id, legId)).run();
    touch(leg.tripId);
    return {};
  });
}

/* ───────── Accommodation ───────── */

const staySchema = z
  .object({
    destinationId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1, "Name the stay").max(120),
    type: z.enum(["airbnb", "hotel", "hostel", "guesthouse", "homestay", "villa", "cruise", "other"]),
    checkIn: isoDate,
    checkOut: isoDate,
    costVnd: money.default(0),
    costMode: z.enum(["per_person", "total"]).default("total"),
    participants,
    status: z.enum(["idea", "quoted", "booked"]).default("idea"),
    // Web links only: never javascript:, data: or other schemes.
    url: z.string().url().max(500).refine((u) => /^https?:\/\//i.test(u), "Use a web address starting with http:// or https://").nullable().optional().or(z.literal("").transform(() => null)),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

export async function saveStay(tripId: string, stayId: string | null, input: z.input<typeof staySchema>) {
  return run(async () => {
    const v = staySchema.parse(input);
    const user = await requireUser();
    assertMember(tripId, user.id);
    const values = { ...v, participants: cleanParticipants(tripId, v.participants) };
    if (stayId) {
      const s = db.select().from(t.accommodations).where(and(eq(t.accommodations.id, stayId), eq(t.accommodations.tripId, tripId))).get();
      if (!s) throw new UserError("Stay not found.");
      db.update(t.accommodations).set(values).where(eq(t.accommodations.id, stayId)).run();
    } else {
      stayId = db.insert(t.accommodations).values({ tripId, ...values }).returning({ id: t.accommodations.id }).get().id;
    }
    touch(tripId);
    return { stayId };
  });
}

export async function deleteStay(stayId: string) {
  return run(async () => {
    const user = await requireUser();
    const s = db.select().from(t.accommodations).where(eq(t.accommodations.id, stayId)).get();
    if (!s) return {};
    assertMember(s.tripId, user.id);
    db.delete(t.accommodations).where(eq(t.accommodations.id, stayId)).run();
    touch(s.tripId);
    return {};
  });
}

/* ───────── Expenses & budget settings ───────── */

const expenseSchema = z.object({
  categorySlug: z.string().min(1).max(40),
  label: z.string().trim().min(1, "Describe the expense").max(120),
  amountVnd: money,
  costMode: z.enum(["per_person", "total"]),
  participants,
  destinationId: z.string().uuid().nullable().optional(),
  date: isoDate.nullable().optional(),
  isQuote: z.boolean().default(false),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function saveExpense(tripId: string, expenseId: string | null, input: z.input<typeof expenseSchema>) {
  return run(async () => {
    const v = expenseSchema.parse(input);
    const user = await requireUser();
    const { member, trip } = assertMember(tripId, user.id);
    if (!db.select().from(t.budgetCategories).where(eq(t.budgetCategories.slug, v.categorySlug)).get()) throw new UserError("Unknown budget category.");
    if (v.date && (v.date < trip.startDate || v.date > trip.endDate)) throw new UserError("Pick a date within the trip, or leave the date empty.");
    const values = { ...v, participants: cleanParticipants(tripId, v.participants) };
    if (expenseId) {
      const e = db.select().from(t.expenses).where(and(eq(t.expenses.id, expenseId), eq(t.expenses.tripId, tripId))).get();
      if (!e) throw new UserError("Expense not found.");
      if (e.createdBy !== user.id && member.role === "member") throw new UserError("Only the person who added this expense, an editor or the owner can change it.");
      db.update(t.expenses).set(values).where(eq(t.expenses.id, expenseId)).run();
    } else {
      expenseId = db.insert(t.expenses).values({ tripId, ...values, createdBy: user.id }).returning({ id: t.expenses.id }).get().id;
    }
    touch(tripId);
    return { expenseId };
  });
}

export async function deleteExpense(expenseId: string) {
  return run(async () => {
    const user = await requireUser();
    const e = db.select().from(t.expenses).where(eq(t.expenses.id, expenseId)).get();
    if (!e) return {};
    const { member } = assertMember(e.tripId, user.id);
    if (e.createdBy !== user.id && member.role === "member") throw new UserError("Only the person who added this expense, an editor or the owner can delete it.");
    db.delete(t.expenses).where(eq(t.expenses.id, expenseId)).run();
    touch(e.tripId);
    return {};
  });
}

export async function updateBudgetSettings(
  tripId: string,
  input: {
    scenario?: "budget" | "balanced" | "comfortable";
    budgetTargetInr?: number | null;
    insurancePerPersonVnd?: number;
    simPerPersonVnd?: number;
    emergencyReservePct?: number;
    includeInternationalFlights?: boolean;
    overrides?: Record<string, number | null>;
  },
) {
  return run(async () => {
    const v = z
      .object({
        scenario: z.enum(["budget", "balanced", "comfortable"]).optional(),
        budgetTargetInr: z.number().int().min(0).max(10_000_000).nullable().optional(),
        insurancePerPersonVnd: money.optional(),
        simPerPersonVnd: money.optional(),
        emergencyReservePct: z.number().min(0).max(50).optional(),
        includeInternationalFlights: z.boolean().optional(),
        overrides: z.record(z.string(), money.nullable()).optional(),
      })
      .parse(input);
    const user = await requireUser();
    const { trip } = assertMember(tripId, user.id, ["owner", "editor"]);
    const settings = { ...trip.settings };
    if (v.insurancePerPersonVnd !== undefined) settings.insurancePerPersonVnd = v.insurancePerPersonVnd;
    if (v.simPerPersonVnd !== undefined) settings.simPerPersonVnd = v.simPerPersonVnd;
    if (v.emergencyReservePct !== undefined) settings.emergencyReservePct = v.emergencyReservePct;
    if (v.includeInternationalFlights !== undefined) settings.includeInternationalFlights = v.includeInternationalFlights;
    if (v.overrides) {
      const current = { ...(settings.baselines?.overrides ?? {}) };
      for (const [k, val] of Object.entries(v.overrides)) {
        if (val === null) delete current[k];
        else current[k] = val;
      }
      settings.baselines = { ...(settings.baselines ?? {}), overrides: current };
    }
    db.update(t.trips)
      .set({
        settings,
        ...(v.scenario ? { scenario: v.scenario } : {}),
        ...(v.budgetTargetInr !== undefined ? { budgetTargetInr: v.budgetTargetInr } : {}),
      })
      .where(eq(t.trips.id, tripId))
      .run();
    touch(tripId);
    return {};
  });
}

/* ───────── Route templates ───────── */

/** Fills only empty days and adds "idea" transport legs; never overwrites existing plans. */
export async function applyRouteTemplate(tripId: string, slug: string) {
  return run(async () => {
    const user = await requireUser();
    const { trip } = assertMember(tripId, user.id, ["owner", "editor"]);
    const tpl = routeTemplates.find((r) => r.slug === slug);
    if (!tpl) throw new UserError("Route template not found.");
    // The template is a dated plan: only use the days and transfers that fall inside this trip.
    const inTrip = (date: string) => date >= trip.startDate && date <= trip.endDate;
    if (!tpl.days.some((d) => inTrip(d.date)))
      throw new UserError(`This suggested route is planned for ${tpl.days[0]!.date} to ${tpl.days.at(-1)!.date}, which doesn't overlap your trip dates.`);
    const destId = (s: string) => db.select({ id: t.destinations.id, name: t.destinations.name }).from(t.destinations).where(eq(t.destinations.slug, s)).get();
    let daysFilled = 0,
      legsAdded = 0;
    db.transaction((tx) => {
      for (const d of tpl.days) {
        const day = tx.select().from(t.itineraryDays).where(and(eq(t.itineraryDays.tripId, tripId), eq(t.itineraryDays.date, d.date))).get();
        if (!day) continue;
        const dest = destId(d.destination);
        const patch: { destinationId?: string; title?: string } = {};
        if (!day.destinationId && dest) patch.destinationId = dest.id;
        if (!day.title) patch.title = d.title;
        if (Object.keys(patch).length) {
          tx.update(t.itineraryDays).set(patch).where(eq(t.itineraryDays.id, day.id)).run();
          daysFilled++;
        }
      }
    });
    for (const l of tpl.legs) {
      if (!inTrip(l.departAt.slice(0, 10))) continue;
      const from = destId(l.from);
      const to = destId(l.to);
      if (!from || !to) continue;
      const dup = db
        .select()
        .from(t.transportLegs)
        .where(and(eq(t.transportLegs.tripId, tripId), eq(t.transportLegs.fromDestinationId, from.id), eq(t.transportLegs.toDestinationId, to.id)))
        .get();
      if (dup) continue;
      const leg = db
        .insert(t.transportLegs)
        .values({
          tripId,
          fromDestinationId: from.id,
          toDestinationId: to.id,
          fromLabel: from.name,
          toLabel: to.name,
          mode: l.mode,
          departAt: l.departAt,
          arriveAt: computeArrival(l.departAt, l.durationMin),
          durationMin: l.durationMin,
          costVnd: l.costVnd,
          costMode: "costMode" in l ? l.costMode : "per_person",
          overnight: "overnight" in l ? l.overnight : false,
          luggageNote: l.luggage,
          status: "idea",
          notes: "Added from a suggested route. Times and prices are planning estimates, not live schedules or fares.",
        })
        .returning({ id: t.transportLegs.id })
        .get();
      syncLegItem(tripId, leg.id);
      legsAdded++;
    }
    touch(tripId);
    return { daysFilled, legsAdded };
  });
}
