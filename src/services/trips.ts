import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, t } from "@/db/client";
import { activityCostFromPrice, computeBudget, type BaselineCategory, type BudgetLine, dedupeBundles } from "@/lib/budget-engine";
import { analyseCandidate, suggestShortlist, type Vote } from "@/lib/consensus";
import { computePlanAlerts, type PlanDay, type PlanLeg } from "@/lib/planning-alerts";
import { addDays, dateRange } from "@/lib/utils";
import { getCatalog } from "./catalog";
import { getFx } from "./settings";

export const ACTIVE_TRIP_COOKIE = "atlas_trip";

export type Trip = typeof t.trips.$inferSelect;
export type Member = typeof t.tripMembers.$inferSelect;

export class TripAccessError extends Error {
  constructor(message = "You are not a member of this trip.") {
    super(message);
  }
}

export function myTrips(userId: string) {
  return db
    .select({ trip: t.trips, member: t.tripMembers })
    .from(t.tripMembers)
    .innerJoin(t.trips, eq(t.trips.id, t.tripMembers.tripId))
    .where(eq(t.tripMembers.userId, userId))
    .orderBy(desc(t.trips.updatedAt))
    .all();
}

/** Server-side membership check used by every trip read/write. */
export function assertMember(tripId: string, userId: string, roles?: Member["role"][]) {
  const member = db
    .select()
    .from(t.tripMembers)
    .where(and(eq(t.tripMembers.tripId, tripId), eq(t.tripMembers.userId, userId)))
    .get();
  if (!member) throw new TripAccessError();
  if (roles && !roles.includes(member.role)) throw new TripAccessError("Only the trip owner or an editor can do that.");
  const trip = db.select().from(t.trips).where(eq(t.trips.id, tripId)).get();
  if (!trip) throw new TripAccessError("Trip not found.");
  return { trip, member };
}

export async function resolveActiveTrip(userId: string | null | undefined) {
  if (!userId) return null;
  const trips = myTrips(userId);
  if (!trips.length) return null;
  const jar = await cookies();
  const wanted = jar.get(ACTIVE_TRIP_COOKIE)?.value;
  return trips.find((x) => x.trip.id === wanted) ?? trips[0]!;
}

export function membersOf(tripId: string) {
  return db.select().from(t.tripMembers).where(eq(t.tripMembers.tripId, tripId)).orderBy(asc(t.tripMembers.sort)).all();
}

export function ensureItineraryDays(trip: Pick<Trip, "id" | "startDate" | "endDate">, conn: Pick<typeof db, "select" | "insert"> = db) {
  const existing = new Set(
    conn.select({ date: t.itineraryDays.date }).from(t.itineraryDays).where(eq(t.itineraryDays.tripId, trip.id)).all().map((d) => d.date),
  );
  const missing = dateRange(trip.startDate, trip.endDate).filter((d) => !existing.has(d));
  if (missing.length) conn.insert(t.itineraryDays).values(missing.map((date) => ({ tripId: trip.id, date }))).run();
}

/* ───────────── Group workspace ───────────── */

export function tripWorkspace(tripId: string) {
  const members = membersOf(tripId);
  const candidates = db.select().from(t.tripCandidates).where(eq(t.tripCandidates.tripId, tripId)).orderBy(desc(t.tripCandidates.createdAt)).all();
  const ids = candidates.map((c) => c.id);
  const votes = ids.length ? db.select().from(t.groupVotes).where(inArray(t.groupVotes.candidateId, ids)).all() : [];
  const comments = ids.length
    ? db
        .select()
        .from(t.comments)
        .where(and(inArray(t.comments.candidateId, ids), isNull(t.comments.deletedAt)))
        .orderBy(asc(t.comments.createdAt))
        .all()
    : [];
  const prefs = members.length ? db.select().from(t.tripPreferences).where(inArray(t.tripPreferences.memberId, members.map((m) => m.id))).all() : [];
  const prices = candidates.length
    ? new Map(
        db
          .select()
          .from(t.activityPrices)
          .where(and(inArray(t.activityPrices.activityId, candidates.map((c) => c.activityId)), eq(t.activityPrices.isCurrent, true)))
          .all()
          .map((p) => [p.activityId, p]),
      )
    : new Map();
  const catalog = getCatalog();
  const cardById = new Map(catalog.activities.map((a) => [a.id, a]));
  return {
    members,
    preferences: prefs,
    candidates: candidates.map((c) => {
      // Shared prices are split between the people actually taking part (everyone when not narrowed down).
      const memberIds = new Set(members.map((m) => m.id));
      const party = c.participants ? [...new Set(c.participants)].filter((p) => memberIds.has(p)).length : members.length;
      const est = activityCostFromPrice(prices.get(c.activityId), party);
      const perPersonVnd = c.agreedPriceVnd ?? (est.costMode === "per_person" ? est.amountVnd : party ? Math.round(est.amountVnd / party) : 0);
      return {
        ...c,
        card: cardById.get(c.activityId) ?? null,
        votes: votes.filter((v) => v.candidateId === c.id),
        comments: comments.filter((x) => x.candidateId === c.id),
        perPersonVnd,
        priceIsEstimate: c.agreedPriceVnd == null || !c.priceIsQuote,
      };
    }),
  };
}

export function tripMonths(trip: Pick<Trip, "startDate" | "endDate">) {
  const s = new Set<number>();
  for (const d of dateRange(trip.startDate, trip.endDate)) s.add(Number(d.slice(5, 7)) - 1);
  return [...s];
}

export function consensusFor(trip: Trip, workspace: ReturnType<typeof tripWorkspace>, remainingPerPersonVnd: number | null) {
  const months = tripMonths(trip);
  const analyses = workspace.candidates.map((c) =>
    analyseCandidate(
      {
        id: c.id,
        title: c.card?.title ?? "",
        votes: c.votes.map((v) => ({ memberId: v.memberId, vote: v.vote as Vote })),
        perPersonVnd: c.perPersonVnd,
        seasonScore: c.card ? Math.min(...months.map((m) => Number(c.card!.months[m] ?? "2"))) : 2,
        decemberStatus: months.includes(11) ? c.card?.decemberStatus : undefined,
        availability: c.card?.availability,
        alreadyBudgeted: c.status === "approved" || c.status === "scheduled",
      },
      workspace.members.map((m) => ({ id: m.id, travellerType: m.travellerType })),
      { remainingPerPersonVnd },
    ),
  );
  return { analyses, suggested: suggestShortlist(analyses) };
}

/* ───────────── Itinerary ───────────── */

/** Cached per request: the trip page asks for the itinerary, the plan alerts and the budget. */
export const itineraryData = cache((tripId: string) => {
  const days = db.select().from(t.itineraryDays).where(eq(t.itineraryDays.tripId, tripId)).orderBy(asc(t.itineraryDays.date)).all();
  const items = db.select().from(t.itineraryItems).where(eq(t.itineraryItems.tripId, tripId)).orderBy(asc(t.itineraryItems.sort)).all();
  const legs = db.select().from(t.transportLegs).where(eq(t.transportLegs.tripId, tripId)).orderBy(asc(t.transportLegs.departAt)).all();
  const stays = db.select().from(t.accommodations).where(eq(t.accommodations.tripId, tripId)).orderBy(asc(t.accommodations.checkIn)).all();
  return { days, items, legs, stays };
});

export function planSnapshot(tripId: string, budget?: { perPersonPlannedVnd: number; targetPerPersonVnd: number | null }) {
  const { days, items, legs } = itineraryData(tripId);
  const catalog = getCatalog();
  const destById = new Map(catalog.destinations.map((d) => [d.id, d]));
  const actById = new Map(catalog.activities.map((a) => [a.id, a]));
  const place = (id: string | null | undefined) => {
    const d = id ? destById.get(id) : null;
    return d ? { id: d.id, name: d.name, lat: d.lat, lng: d.lng } : null;
  };
  const planDays: PlanDay[] = days.map((d) => ({
    date: d.date,
    destination: place(d.destinationId),
    items: items
      .filter((i) => i.dayId === d.id)
      .map((i) => {
        const a = i.activityId ? actById.get(i.activityId) : null;
        return {
          id: i.id,
          title: i.title,
          type: i.type,
          startTime: i.startTime,
          durationMin: i.durationMin,
          activity: a
            ? {
                weatherDependent: a.weatherDependent,
                decemberStatus: a.decemberStatus,
                availability: a.availability,
                months: a.months,
                intensity: a.intensity,
                destination: place(a.destinationId),
              }
            : null,
        };
      }),
  }));
  const planLegs: PlanLeg[] = legs.map((l) => ({
    id: l.id,
    label: `${l.fromLabel} → ${l.toLabel}`,
    departAt: l.departAt,
    arriveAt: l.arriveAt,
    durationMin: l.durationMin,
    overnight: l.overnight,
    isFixed: l.isFixed,
  }));
  return computePlanAlerts({
    days: planDays,
    legs: planLegs,
    perPersonPlannedVnd: budget?.perPersonPlannedVnd,
    targetPerPersonVnd: budget?.targetPerPersonVnd,
  });
}

/* ───────────── Budget ───────────── */

export function tripBudget(trip: Trip) {
  const members = membersOf(trip.id);
  const memberIds = members.map((m) => m.id);
  const fx = getFx();
  const { items, legs, stays } = itineraryData(trip.id);
  const days = db.select().from(t.itineraryDays).where(eq(t.itineraryDays.tripId, trip.id)).all();
  const dayById = new Map(days.map((d) => [d.id, d]));
  const expenses = db.select().from(t.expenses).where(eq(t.expenses.tripId, trip.id)).all();
  const candidates = db.select().from(t.tripCandidates).where(eq(t.tripCandidates.tripId, trip.id)).all();
  const catalog = getCatalog();
  const actById = new Map(catalog.activities.map((a) => [a.id, a]));
  const cats = db.select().from(t.budgetCategories).orderBy(asc(t.budgetCategories.sort)).all();
  const baselines: BaselineCategory[] = cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    perDay: c.budgetPerDay != null && c.balancedPerDay != null && c.comfortablePerDay != null ? [c.budgetPerDay, c.balancedPerDay, c.comfortablePerDay] : null,
  }));

  const lines: BudgetLine[] = [];
  const activityOfLine = new Map<string, string>();
  const scheduledActivityIds = new Set<string>();
  for (const i of items) {
    if (i.type === "transport" || i.type === "accommodation") continue; // counted from their own tables
    if (i.activityId) scheduledActivityIds.add(i.activityId);
    if (!i.costVnd) continue;
    const day = dayById.get(i.dayId);
    const act = i.activityId ? actById.get(i.activityId) : null;
    if (i.activityId) activityOfLine.set(`item:${i.id}`, i.activityId);
    lines.push({
      id: `item:${i.id}`,
      source: "activity",
      category: i.type === "restaurant" ? "food" : act?.priceTier === "free" ? "free_activities" : "paid_activities",
      label: i.title,
      amountVnd: i.costVnd,
      costMode: i.costMode,
      participants: i.participants ?? null,
      destinationId: act?.destinationId ?? day?.destinationId ?? null,
      date: day?.date ?? null,
      isQuote: candidates.some((c) => c.activityId === i.activityId && c.priceIsQuote),
    });
  }
  // Group-approved activities not yet placed on a day still count toward the plan.
  const approved = candidates.filter((c) => c.status === "approved" && !scheduledActivityIds.has(c.activityId));
  const approvedPrices = approved.length
    ? new Map(
        db
          .select()
          .from(t.activityPrices)
          .where(and(inArray(t.activityPrices.activityId, approved.map((c) => c.activityId)), eq(t.activityPrices.isCurrent, true)))
          .all()
          .map((p) => [p.activityId, p]),
      )
    : new Map();
  for (const c of approved) {
    const price = approvedPrices.get(c.activityId);
    const party = c.participants ? [...new Set(c.participants)].filter((p) => memberIds.includes(p)).length : memberIds.length;
    const est = activityCostFromPrice(price, party);
    const amount = c.agreedPriceVnd ?? est.amountVnd;
    if (!amount) continue;
    const act = actById.get(c.activityId);
    activityOfLine.set(`candidate:${c.id}`, c.activityId);
    lines.push({
      id: `candidate:${c.id}`,
      source: "candidate",
      category: "paid_activities",
      label: `${act?.title ?? "Activity"} (approved, not yet scheduled)`,
      amountVnd: amount,
      costMode: c.agreedPriceVnd != null ? "per_person" : est.costMode,
      participants: c.participants ?? null,
      destinationId: act?.destinationId ?? null,
      isQuote: c.priceIsQuote,
    });
  }
  // A stay or overnight leg only covers the nights of the people on it.
  const coveredNights: { date: string; participants: string[] | null }[] = [];
  for (const l of legs) {
    if (l.isInternational && !trip.settings.includeInternationalFlights) continue;
    const category = l.mode === "flight" ? "domestic_flights" : l.mode === "train" ? "trains" : l.mode === "sleeper_bus" || l.mode === "cabin_bus" ? "intercity_bus" : "local_transport";
    if (l.overnight && l.departAt) coveredNights.push({ date: l.departAt.slice(0, 10), participants: l.participants ?? null });
    if (!l.costVnd) continue;
    lines.push({
      id: `leg:${l.id}`,
      source: "transport",
      category: l.isInternational ? "international_flights" : category,
      label: `${l.fromLabel} → ${l.toLabel}`,
      amountVnd: l.costVnd,
      costMode: l.costMode,
      participants: l.participants ?? null,
      destinationId: l.toDestinationId,
      date: l.departAt?.slice(0, 10) ?? null,
      isQuote: l.status !== "idea",
    });
  }
  for (const s of stays) {
    for (let d = s.checkIn; d < s.checkOut; d = addDays(d, 1)) coveredNights.push({ date: d, participants: s.participants ?? null });
    if (!s.costVnd) continue;
    lines.push({
      id: `stay:${s.id}`,
      source: "accommodation",
      category: "accommodation",
      label: s.name,
      amountVnd: s.costVnd,
      costMode: s.costMode,
      participants: s.participants ?? null,
      destinationId: s.destinationId,
      date: s.checkIn,
      isQuote: s.status !== "idea",
    });
  }
  for (const e of expenses) {
    lines.push({
      id: `expense:${e.id}`,
      source: "expense",
      category: e.categorySlug,
      label: e.label,
      amountVnd: e.amountVnd,
      costMode: e.costMode,
      participants: e.participants ?? null,
      destinationId: e.destinationId,
      date: e.date,
      isQuote: e.isQuote,
    });
  }

  // Experiences that are one ticket (Ba Na Hills + Golden Bridge, the Hoi An coupon ticket…) are budgeted once.
  const bundleRows = activityOfLine.size
    ? db
        .select({ activityId: t.activityPrices.activityId, bundle: t.activityPrices.ticketBundle })
        .from(t.activityPrices)
        .where(and(inArray(t.activityPrices.activityId, [...new Set(activityOfLine.values())]), eq(t.activityPrices.isCurrent, true)))
        .all()
    : [];
  const bundleByActivity = new Map(bundleRows.map((r) => [r.activityId, r.bundle]));
  const dedupedLines = dedupeBundles(lines, (l) => bundleByActivity.get(activityOfLine.get(l.id) ?? ""), memberIds.length);

  const s = trip.settings;
  const result = computeBudget({
    memberIds,
    startDate: trip.startDate,
    endDate: trip.endDate,
    scenario: trip.scenario,
    baselines,
    lines: dedupedLines,
    coveredNights,
    baselineOverrides: s.baselines?.overrides,
    insurancePerPersonVnd: s.insurancePerPersonVnd,
    simPerPersonVnd: s.simPerPersonVnd,
    emergencyReservePct: s.emergencyReservePct,
    targetPerPersonVnd: trip.budgetTargetInr ? trip.budgetTargetInr * fx.inrToVnd : null,
  });
  return { result, members, fx, categories: cats, expenses };
}
