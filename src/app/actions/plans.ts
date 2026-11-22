"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { activityCostFromPrice } from "@/lib/budget-engine";
import type { Vote } from "@/lib/consensus";
import { partyIds } from "@/lib/party";
import { buildPersonalPlans, type PlanChanges } from "@/lib/personal-plans";
import { getCatalog } from "@/services/catalog";
import { assertMember, membersOf } from "@/services/trips";

export type PlanSummary = {
  /** Everyone sharing the trip, joined or not. */
  total: number;
  /** who: the names of the people going (or, when most are, of those not going), for the owner to check. */
  updated: { title: string; date: string; going: number; who: string }[];
  added: { title: string; date: string; going: number; who: string; movedFrom: string | null }[];
  unplaced: { title: string; reason: "no_day" | "day_full" }[];
  nobodyGoing: { title: string; date: string }[];
  applied: boolean;
};

/**
 * Builds everyone's personal plan from their picks (see lib/personal-plans). With `apply: false` it only reports
 * what would change, so the owner can review it first. Owners and editors only.
 */
export async function generatePersonalPlans(tripId: string, input: { apply: boolean }) {
  return run(async () => {
    const { apply } = z.object({ apply: z.boolean() }).parse(input);
    const user = await requireUser();
    const { trip } = await assertMember(z.string().uuid().parse(tripId), user.id, ["owner", "editor"]);
    const members = await membersOf(trip.id);
    const days = await db.select().from(t.itineraryDays).where(eq(t.itineraryDays.tripId, trip.id)).orderBy(asc(t.itineraryDays.date)).all();
    const items = await db.select().from(t.itineraryItems).where(eq(t.itineraryItems.tripId, trip.id)).orderBy(asc(t.itineraryItems.sort)).all();
    const candidates = (await db.select().from(t.tripCandidates).where(eq(t.tripCandidates.tripId, trip.id)).all()).filter((c) => c.status !== "rejected");
    const votes = candidates.length ? await db.select().from(t.groupVotes).where(inArray(t.groupVotes.candidateId, candidates.map((c) => c.id))).all() : [];
    const catalog = await getCatalog();
    const actById = new Map(catalog.activities.map((a) => [a.id, a]));
    const destBySlug = new Map(catalog.destinations.map((d) => [d.slug, d]));

    // Travellers expected but not joined yet count as going (they haven't said otherwise): see lib/party.
    const party = partyIds(members.map((m) => m.id), trip.travellersCount);
    const changes: PlanChanges = buildPersonalPlans({
      members: party.map((id) => ({ id })),
      days,
      // Extras added from picks (optional on the shortlist) are opt-in; base-plan activities are for everyone.
      items: items.map((i) => ({ ...i, optIn: candidates.find((c) => c.activityId === i.activityId)?.participation === "optional" })),
      picks: candidates.flatMap((c) => {
        const a = actById.get(c.activityId);
        if (!a) return [];
        const parent = destBySlug.get(a.destinationSlug)?.parentSlug;
        const parentId = parent ? destBySlug.get(parent)?.id : undefined;
        return [
          {
            activityId: a.id,
            title: a.title,
            destinationIds: [a.destinationId, ...(parentId ? [parentId] : [])],
            durationMin: Math.max(30, Math.round(a.durationHours * 60)),
            votes: votes.filter((v) => v.candidateId === c.id).map((v) => ({ memberId: v.memberId, vote: v.vote as Vote, dayId: v.dayId })),
          },
        ];
      }),
    });

    const dateOf = new Map(days.map((d) => [d.id, d.date]));
    const itemById = new Map(items.map((i) => [i.id, i]));
    const nameOf = new Map(members.map((m) => [m.id, m.displayName]));
    const names = (ids: string[]) => {
      const joined = ids.filter((id) => nameOf.has(id)).map((id) => nameOf.get(id)!);
      const others = ids.length - joined.length;
      return [...joined, ...(others ? [`${others} not joined yet`] : [])].join(", ");
    };
    // Name whichever side is shorter: "everyone except Priya" reads better than six names.
    const who = (participants: string[] | null) => {
      const going = participants ?? party;
      if (going.length === party.length) return "everyone";
      const out = party.filter((id) => !going.includes(id));
      return going.length <= out.length ? names(going) : `everyone except ${names(out)}`;
    };
    const byDate = <T extends { date: string }>(xs: T[]) => xs.sort((a, b) => a.date.localeCompare(b.date));
    const summary: PlanSummary = {
      total: party.length,
      updated: byDate(changes.updates.map((u) => ({ title: itemById.get(u.itemId)!.title, date: dateOf.get(itemById.get(u.itemId)!.dayId)!, going: u.going, who: who(u.participants) }))),
      added: byDate(
        changes.additions.map((a) => {
          // The day most fans chose, if the builder had to use another one.
          const chosen = votes.filter((v) => candidates.find((c) => c.id === v.candidateId)?.activityId === a.activityId && v.dayId).map((v) => v.dayId!);
          const top = chosen.sort((x, y) => chosen.filter((c) => c === y).length - chosen.filter((c) => c === x).length)[0];
          return { title: a.title, date: a.date, going: a.participants?.length ?? party.length, who: who(a.participants), movedFrom: top && top !== a.dayId ? (dateOf.get(top) ?? null) : null };
        }),
      ),
      unplaced: changes.unplaced.map((u) => ({ title: u.title, reason: u.reason })),
      nobodyGoing: byDate(changes.nobodyGoing.map((id) => ({ title: itemById.get(id)!.title, date: dateOf.get(itemById.get(id)!.dayId)! }))),
      applied: false,
    };
    if (!apply || (!changes.updates.length && !changes.additions.length)) return summary;

    const prices = changes.additions.length
      ? new Map(
          (await db
            .select()
            .from(t.activityPrices)
            .where(and(inArray(t.activityPrices.activityId, changes.additions.map((a) => a.activityId)), eq(t.activityPrices.isCurrent, true)))
            .all()).map((p) => [p.activityId, p]),
        )
      : new Map();
    await db.transaction(async (tx) => {
      const now = new Date().toISOString();
      for (const u of changes.updates) await tx.update(t.itineraryItems).set({ participants: u.participants, updatedAt: now }).where(eq(t.itineraryItems.id, u.itemId)).run();
      const nextSort = new Map<string, number>();
      for (const i of items) nextSort.set(i.dayId, Math.max(nextSort.get(i.dayId) ?? 0, i.sort + 1));
      for (const a of changes.additions) {
        const cand = candidates.find((c) => c.activityId === a.activityId)!;
        const est = activityCostFromPrice(prices.get(a.activityId), a.participants?.length ?? party.length);
        const sort = nextSort.get(a.dayId) ?? 0;
        nextSort.set(a.dayId, sort + 1);
        await tx
          .insert(t.itineraryItems)
          .values({
            tripId: trip.id,
            dayId: a.dayId,
            sort,
            type: "activity",
            activityId: a.activityId,
            title: a.title,
            durationMin: a.durationMin,
            costVnd: cand.agreedPriceVnd ?? est.amountVnd,
            costMode: cand.agreedPriceVnd != null ? "per_person" : est.costMode,
            participants: a.participants,
            notes: "Added from the group's picks: set a time.",
          })
          .run();
        await tx.update(t.tripCandidates).set({ status: "scheduled", participants: a.participants, updatedAt: now }).where(eq(t.tripCandidates.id, cand.id)).run();
      }
      await tx.update(t.trips).set({ updatedAt: now }).where(eq(t.trips.id, trip.id)).run();
    });
    revalidatePath("/", "layout");
    return { ...summary, applied: true };
  });
}
