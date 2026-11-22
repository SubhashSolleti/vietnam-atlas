/**
 * One-time data upgrades for databases that were seeded before a content change. Each runs once, inside a
 * transaction, and is recorded in settings.data_upgrades. A freshly seeded database records them as already applied.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../src/db/open";
import * as t from "../src/db/schema";
import { applyBasePlan } from "../src/db/seed/base-plan";
import { BASE_PLAN_VERSION } from "../src/content/base-plan";
import { demoTrip, tripOwner } from "../src/content/demo-trip";
import { NO_PLACEHOLDER_SEATS, UPGRADES_KEY } from "../src/db/upgrade-ids";



const OLD_SEED_FLIGHTS = ["2026-12-11T22:20", "2026-12-25T12:20"];
const OLD_DESCRIPTION =
  "Seven cousins, two weeks, south to north. Balanced pace, best-value stays, safety first, beaches, adventure, food and a few late nights.";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function runDataUpgrades(db: Database) {
  const row = await db.select().from(t.settings).where(eq(t.settings.key, UPGRADES_KEY)).get();
  const applied = new Set((row?.value as string[] | undefined) ?? []);
  const steps: [string, (tx: Tx) => Promise<void>][] = [
    [BASE_PLAN_VERSION, basePlan],
    [NO_PLACEHOLDER_SEATS, removePlaceholderSeats],
  ];
  for (const [id, step] of steps) {
    if (applied.has(id)) continue;
    await db.transaction(async (tx) => {
      await step(tx);
      applied.add(id);
      await tx
        .insert(t.settings)
        .values({ key: UPGRADES_KEY, value: [...applied], updatedBy: "db:setup" })
        .onConflictDoUpdate({ target: t.settings.key, set: { value: [...applied], updatedAt: new Date().toISOString() } })
        .run();
    });
  }
}

/** Subhash's 14-day plan becomes the group trip's base itinerary. */
async function basePlan(tx: Tx) {
  // Subhash's own sign-in replaces the generic admin account (same password).
  const admin = await tx.select().from(t.users).where(eq(t.users.email, "admin@atlas.local")).get();
  const taken = await tx.select({ id: t.users.id }).from(t.users).where(eq(t.users.email, tripOwner.email)).get();
  if (admin && !taken)
    await tx
      .update(t.users)
      .set({ email: tripOwner.email, ...(admin.displayName === "Atlas Admin" ? { displayName: tripOwner.displayName } : {}), updatedAt: new Date().toISOString() })
      .where(eq(t.users.id, admin.id))
      .run();

  const code = process.env.DEMO_INVITE_CODE?.toUpperCase();
  const trip =
    (code ? await tx.select().from(t.trips).where(eq(t.trips.inviteCode, code)).get() : undefined) ??
    (await tx.select().from(t.trips).where(eq(t.trips.name, demoTrip.name)).get());
  if (!trip) {
    console.log("db:setup: no group trip found, base plan not applied.");
  } else {
    const owner = await tx.select().from(t.tripMembers).where(and(eq(t.tripMembers.tripId, trip.id), eq(t.tripMembers.role, "owner"))).get();
    if (owner?.displayName === "Traveller 1") await tx.update(t.tripMembers).set({ displayName: tripOwner.displayName }).where(eq(t.tripMembers.id, owner.id)).run();
    if (trip.description === OLD_DESCRIPTION) await tx.update(t.trips).set({ description: demoTrip.description }).where(eq(t.trips.id, trip.id)).run();
    // The seed's placeholder budget gives way to the base plan's estimate (a budget the group already changed is kept).
    if (trip.budgetMinInr === 55000 && trip.budgetMaxInr === 70000 && trip.budgetTargetInr === 65000)
      await tx
        .update(t.trips)
        .set({ budgetMinInr: demoTrip.budgetMinInr, budgetMaxInr: demoTrip.budgetMaxInr, budgetTargetInr: demoTrip.budgetTargetInr })
        .where(eq(t.trips.id, trip.id))
        .run();
    // The seed's two placeholder flights make way for the booked flights (their itinerary items go with them).
    await tx
      .delete(t.transportLegs)
      .where(and(eq(t.transportLegs.tripId, trip.id), eq(t.transportLegs.isFixed, true), inArray(t.transportLegs.departAt, OLD_SEED_FLIGHTS)))
      .run();
    const members = await tx.select({ id: t.tripMembers.id }).from(t.tripMembers).where(eq(t.tripMembers.tripId, trip.id)).all();
    const plan = await applyBasePlan(tx, trip, owner?.id ?? null, Math.max(members.length, trip.travellersCount));
    await tx.update(t.trips).set({ updatedAt: new Date().toISOString() }).where(eq(t.trips.id, trip.id)).run();
    console.log(`db:setup: base plan added to "${trip.name}": ${plan.items} itinerary items, ${plan.legs} transport legs.`);
  }
}

/**
 * Removes the "Traveller 2…7" seats trips used to start with. Only seats nobody joined and nobody used: a seat with
 * picks, comments or preferences is kept. The trip keeps its expected group size, so budgets are unchanged.
 */
async function removePlaceholderSeats(tx: Tx) {
  const placeholders = (await tx.select().from(t.tripMembers).where(isNull(t.tripMembers.userId)).all()).filter((m) => /^Traveller \d+$/.test(m.displayName));
  let removed = 0;
  for (const m of placeholders) {
    const used =
      (await tx.select({ id: t.groupVotes.id }).from(t.groupVotes).where(eq(t.groupVotes.memberId, m.id)).get()) ??
      (await tx.select({ id: t.comments.id }).from(t.comments).where(eq(t.comments.memberId, m.id)).get());
    const prefs = await tx.select().from(t.tripPreferences).where(eq(t.tripPreferences.memberId, m.id)).get();
    if (used || (prefs && (prefs.interests.length || prefs.preferredDestinations.length || prefs.foodPreferences.length || prefs.avoid || prefs.budgetInr != null))) continue;
    // Out of every cost split first (a list naming them would otherwise keep a share for nobody).
    for (const tbl of [t.expenses, t.itineraryItems, t.transportLegs, t.accommodations, t.tripCandidates] as const) {
      const rows = await tx.select({ id: tbl.id, participants: tbl.participants }).from(tbl).where(eq(tbl.tripId, m.tripId)).all();
      for (const r of rows)
        if (r.participants?.includes(m.id)) await tx.update(tbl).set({ participants: r.participants.filter((x) => x !== m.id) }).where(eq(tbl.id, r.id)).run();
    }
    await tx.delete(t.tripMembers).where(eq(t.tripMembers.id, m.id)).run();
    removed++;
  }
  if (removed) console.log(`db:setup: removed ${removed} unused placeholder seat(s); travellers now join by name.`);
}
