"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run, UserError } from "@/lib/action";
import { limitClient, requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isStandIn, STAND_IN_PREFIX, standInIds } from "@/lib/party";
import { daysBetween, isoDate, MAX_TRAVELLERS, MAX_TRIP_DAYS, participantList } from "@/lib/validation";
import { ACTIVE_TRIP_COOKIE, assertMember, ensureItineraryDays, membersOf } from "@/services/trips";

const COLORS = ["#173F35", "#377A61", "#C96F50", "#D6AB59", "#5B6F8F", "#8A5A83", "#6E7B3A", "#3F6E86", "#9A4E3C", "#55705F"];

function newInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function setActiveTripCookie(tripId: string) {
  (await cookies()).set(ACTIVE_TRIP_COOKIE, tripId, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 365 * 86400 });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Rewrites every participant list on a trip (itinerary, transport, stays, expenses, shortlist). `map` returns the new
 * id for an entry, or null to drop it. Used when travellers join or leave, to keep the stand-ins in line (lib/party).
 */
async function rewriteParticipants(tx: Tx, tripId: string, map: (id: string) => string | null) {
  for (const tbl of [t.expenses, t.itineraryItems, t.transportLegs, t.accommodations, t.tripCandidates] as const) {
    const rows = await tx.select({ id: tbl.id, participants: tbl.participants }).from(tbl).where(eq(tbl.tripId, tripId)).all();
    for (const r of rows) {
      if (!r.participants) continue;
      const next = r.participants.map(map).filter((x): x is string => x !== null);
      if (next.length !== r.participants.length || next.some((x, i) => x !== r.participants![i])) await tx.update(tbl).set({ participants: next }).where(eq(tbl.id, r.id)).run();
    }
  }
}

/** A new traveller takes the first stand-in's place wherever the not-yet-joined were counted as going. */
async function takeStandInPlace(tx: Tx, trip: { id: string; travellersCount: number }, membersBefore: number, memberId: string) {
  const standIn = standInIds(membersBefore, trip.travellersCount)[0];
  if (standIn) await rewriteParticipants(tx, trip.id, (id) => (id === standIn ? memberId : id));
}

/** Locks the trip row for the rest of the transaction, so joins to one trip happen one at a time. */
async function lockTrip(tx: Tx, tripId: string) {
  return (await tx.select().from(t.trips).where(eq(t.trips.id, tripId)).for("update"))[0]!;
}

async function touchTrip(tripId: string) {
  await db.update(t.trips).set({ updatedAt: new Date().toISOString() }).where(eq(t.trips.id, tripId)).run();
}

const tripSchema = z
  .object({
    name: z.string().trim().min(3, "Trip name must be at least 3 characters").max(80),
    startDate: isoDate,
    endDate: isoDate,
    travellersCount: z.coerce.number().int().min(1, "At least one traveller").max(30, "Up to 30 travellers"),
    budgetTargetInr: z.coerce.number().int().min(0).max(10_000_000).optional(),
    currency: z.enum(["INR", "VND", "USD"]).default("INR"),
    displayName: z.string().trim().min(1, "Enter your name").max(40),
    description: z.string().trim().max(400).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be after the start date", path: ["endDate"] })
  .refine((v) => daysBetween(v.startDate, v.endDate) <= MAX_TRIP_DAYS, { message: `Trips can be up to ${MAX_TRIP_DAYS} days`, path: ["endDate"] });

export async function createTrip(input: z.input<typeof tripSchema>) {
  return run(async () => {
    const v = tripSchema.parse(input);
    const user = await requireUser();
    // A double submit (two requests for the same trip within seconds) returns the trip already created.
    const recent = (await db
      .select()
      .from(t.trips)
      .where(and(eq(t.trips.createdBy, user.id), eq(t.trips.name, v.name), eq(t.trips.startDate, v.startDate), eq(t.trips.endDate, v.endDate)))
      .all())
      .find((x) => Date.now() - Date.parse(x.createdAt) < 30_000);
    if (recent) {
      await setActiveTripCookie(recent.id);
      return { tripId: recent.id, inviteCode: recent.inviteCode };
    }
    const trip = await db.transaction(async (tx) => {
      const trip = (await tx
        .insert(t.trips)
        .values({
          name: v.name,
          startDate: v.startDate,
          endDate: v.endDate,
          travellersCount: v.travellersCount,
          budgetTargetInr: v.budgetTargetInr || null,
          currency: v.currency,
          description: v.description || null,
          inviteCode: newInviteCode(),
          createdBy: user.id,
          settings: { insurancePerPersonVnd: 650_000, simPerPersonVnd: 250_000, emergencyReservePct: 8 },
        })
        .returning()
        .get())!;
      // Only the owner to start with: everyone else is added as they join from the invite link.
      // travellersCount stays as the expected group size, so shared costs are split the right way from day one.
      const m = (await tx
        .insert(t.tripMembers)
        .values({ tripId: trip.id, userId: user.id, displayName: v.displayName, role: "owner", avatarColor: COLORS[0]!, sort: 0, joinedAt: new Date().toISOString() })
        .returning({ id: t.tripMembers.id })
        .get())!;
      await tx.insert(t.tripPreferences).values({ memberId: m.id }).run();
      return trip;
    });
    await ensureItineraryDays(trip);
    if (user.isGuest && user.displayName.startsWith("Guest "))
      await db.update(t.users).set({ displayName: v.displayName }).where(eq(t.users.id, user.id)).run();
    await setActiveTripCookie(trip.id);
    revalidatePath("/", "layout");
    return { tripId: trip.id, inviteCode: trip.inviteCode };
  });
}

const budgetInr = z.coerce.number().int().min(0).max(10_000_000).nullable().optional();

export async function updateTrip(
  tripId: string,
  input: Partial<Omit<z.input<typeof tripSchema>, "travellersCount" | "budgetTargetInr">> & {
    votePrivacy?: "named" | "anonymous";
    budgetTargetInr?: number | null;
    budgetMinInr?: number | null;
    budgetMaxInr?: number | null;
  },
) {
  return run(async () => {
    const user = await requireUser();
    const { trip } = await assertMember(tripId, user.id, ["owner", "editor"]);
    const v = z
      .object({
        name: z.string().trim().min(3).max(80).optional(),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        // null clears a budget figure; undefined leaves it unchanged.
        budgetTargetInr: budgetInr,
        budgetMinInr: budgetInr,
        budgetMaxInr: budgetInr,
        currency: z.enum(["INR", "VND", "USD"]).optional(),
        description: z.string().trim().max(400).optional(),
        votePrivacy: z.enum(["named", "anonymous"]).optional(),
      })
      .parse(input);
    const start = v.startDate ?? trip.startDate;
    const end = v.endDate ?? trip.endDate;
    if (end < start) throw new UserError("End date must be after the start date.");
    if (daysBetween(start, end) > MAX_TRIP_DAYS) throw new UserError(`Trips can be up to ${MAX_TRIP_DAYS} days.`);
    const pick = <K extends "budgetTargetInr" | "budgetMinInr" | "budgetMaxInr">(k: K) => (v[k] !== undefined ? v[k] : trip[k]);
    const [min, target, max] = [pick("budgetMinInr"), pick("budgetTargetInr"), pick("budgetMaxInr")];
    if (min != null && max != null && min > max) throw new UserError("The minimum budget can't be higher than the maximum.");
    if (target != null && ((min != null && target < min) || (max != null && target > max))) throw new UserError("The target budget must sit between the minimum and maximum.");
    await db.transaction(async (tx) => {
      await tx.update(t.trips)
        .set({ ...v, budgetTargetInr: target ?? null, budgetMinInr: min ?? null, budgetMaxInr: max ?? null, updatedAt: new Date().toISOString() })
        .where(eq(t.trips.id, tripId))
        .run();
      await ensureItineraryDays({ id: tripId, startDate: start, endDate: end }, tx);
      // Remove *empty* days that fall outside the new range; days with plans are kept and flagged in the UI.
      for (const d of await tx.select().from(t.itineraryDays).where(eq(t.itineraryDays.tripId, tripId)).all()) {
        if (d.date >= start && d.date <= end) continue;
        const hasItems = await tx.select({ id: t.itineraryItems.id }).from(t.itineraryItems).where(eq(t.itineraryItems.dayId, d.id)).get();
        if (!hasItems) await tx.delete(t.itineraryDays).where(eq(t.itineraryDays.id, d.id)).run();
      }
    });
    revalidatePath("/", "layout");
    return {};
  });
}

/** Owner only: permanently deletes the trip with its plans, votes, comments and invite code. */
export async function deleteTrip(tripId: string, confirmation: string) {
  return run(async () => {
    const user = await requireUser();
    const { trip } = await assertMember(tripId, user.id, ["owner"]);
    if (confirmation.trim() !== trip.name.trim()) throw new UserError("Type the trip name exactly to confirm.");
    await db.delete(t.trips).where(eq(t.trips.id, tripId)).run();
    (await cookies()).delete(ACTIVE_TRIP_COOKIE);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function regenerateInvite(tripId: string) {
  return run(async () => {
    const user = await requireUser();
    await assertMember(tripId, user.id, ["owner"]);
    const code = newInviteCode();
    await db.update(t.trips).set({ inviteCode: code, updatedAt: new Date().toISOString() }).where(eq(t.trips.id, tripId)).run();
    revalidatePath("/", "layout");
    return { inviteCode: code };
  });
}

export async function setActiveTrip(tripId: string) {
  return run(async () => {
    const user = await requireUser();
    await assertMember(tripId, user.id);
    await setActiveTripCookie(tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

const joinSchema = z.object({
  code: z.string().trim().toUpperCase().min(4).max(16),
  displayName: z.string().trim().min(1, "Enter your name").max(40),
});

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * Join via invite code with just a name. Everyone is added in the order they join, so two people joining at the same
 * moment never compete for anything. The one exception: a traveller the owner added by name (someone who hasn't
 * joined online yet, or whose login was reset) is matched by that name, so their picks carry over.
 */
export async function joinTrip(input: z.input<typeof joinSchema>) {
  return run(async () => {
    const v = joinSchema.parse(input);
    const user = await requireUser();
    // Per person and per network: invite codes are 8 characters from a 32-letter alphabet, so guessing is impractical.
    if (!(await rateLimit(`join:${user.id}`, 20, 10 * 60_000)).ok || !(await limitClient("join", 60, 10 * 60_000)))
      throw new UserError("Too many attempts. Please wait a few minutes and try again.");
    const trip = await db.select().from(t.trips).where(eq(t.trips.inviteCode, v.code)).get();
    if (!trip) throw new UserError("That invite code doesn't match any trip.");
    const already = await db.select().from(t.tripMembers).where(and(eq(t.tripMembers.tripId, trip.id), eq(t.tripMembers.userId, user.id))).get();
    if (already) {
      await setActiveTripCookie(trip.id);
      return { tripId: trip.id, alreadyMember: true };
    }
    const now = new Date().toISOString();
    const owner = (await membersOf(trip.id)).find((m) => m.role === "owner")?.displayName ?? "the trip owner";
    await db.transaction(async (tx) => {
      const locked = await lockTrip(tx, trip.id);
      const members = await tx.select().from(t.tripMembers).where(eq(t.tripMembers.tripId, trip.id)).all();
      const match = members.filter((m) => sameName(m.displayName, v.displayName));
      const waiting = match.find((m) => !m.userId);
      if (waiting) {
        // Conditional on still being unlinked, so a simultaneous join with the same name can't take it twice.
        const claimed = await tx
          .update(t.tripMembers)
          .set({ userId: user.id, joinedAt: now, ...(waiting.role === "owner" ? { role: "member" as const } : {}) })
          .where(and(eq(t.tripMembers.id, waiting.id), isNull(t.tripMembers.userId)))
          .returning({ id: t.tripMembers.id })
          .get();
        if (claimed) return;
      }
      if (match.length)
        throw new UserError(`Someone called ${match[0]!.displayName} has already joined. If that's you on a new phone, ask ${owner} to reset your login under Members. Otherwise add an initial, like "${v.displayName} S".`);
      if (members.length >= MAX_TRAVELLERS) throw new UserError(`This trip already has ${MAX_TRAVELLERS} travellers.`);
      const sort = Math.max(0, ...members.map((m) => m.sort + 1));
      const m = (await tx
        .insert(t.tripMembers)
        .values({ tripId: trip.id, userId: user.id, displayName: v.displayName, avatarColor: COLORS[sort % COLORS.length]!, sort, joinedAt: now })
        .returning({ id: t.tripMembers.id })
        .get())!;
      await tx.insert(t.tripPreferences).values({ memberId: m.id }).run();
      await takeStandInPlace(tx, locked, members.length, m.id);
      // The group size grows if more people join than the owner expected; it never shrinks here.
      await tx.update(t.trips).set({ travellersCount: sql`GREATEST(${t.trips.travellersCount}, ${members.length + 1})` }).where(eq(t.trips.id, trip.id)).run();
    });
    if (user.isGuest && user.displayName.startsWith("Guest "))
      await db.update(t.users).set({ displayName: v.displayName }).where(eq(t.users.id, user.id)).run();
    await setActiveTripCookie(trip.id);
    await touchTrip(trip.id);
    revalidatePath("/", "layout");
    return { tripId: trip.id, alreadyMember: false };
  });
}

export async function leaveTrip(tripId: string) {
  return run(async () => {
    const user = await requireUser();
    const { member } = await assertMember(tripId, user.id);
    if (member.role === "owner") {
      const others = (await membersOf(tripId)).filter((m) => m.userId && m.id !== member.id);
      if (others.length) throw new UserError("Transfer ownership to another member before leaving.");
      throw new UserError("You're the only traveller who has joined. Delete the trip instead, or invite someone and make them owner first.");
    }
    // Keep the traveller (and their picks) but unlink this login, with no special role, so the trip's history stays intact.
    await db.update(t.tripMembers).set({ userId: null, joinedAt: null, role: "member" }).where(eq(t.tripMembers.id, member.id)).run();
    await touchTrip(tripId);
    (await cookies()).delete(ACTIVE_TRIP_COOKIE);
    revalidatePath("/", "layout");
    return {};
  });
}

const memberSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  role: z.enum(["owner", "editor", "member"]).optional(),
  travellerType: z.enum(["couple", "solo"]).optional(),
  coupleGroup: z.string().trim().max(12).nullable().optional(),
});

export async function updateMember(memberId: string, input: z.input<typeof memberSchema>) {
  return run(async () => {
    const v = memberSchema.parse(input);
    const user = await requireUser();
    const target = await db.select().from(t.tripMembers).where(eq(t.tripMembers.id, memberId)).get();
    if (!target) throw new UserError("Member not found.");
    const { member } = await assertMember(target.tripId, user.id);
    const isSelf = target.userId === user.id;
    const canManage = member.role === "owner" || member.role === "editor";
    if (!isSelf && !canManage) throw new UserError("You can only edit your own profile.");
    if (v.role && member.role !== "owner") throw new UserError("Only the owner can change roles.");
    if (v.role === "owner") {
      // Transfer ownership.
      if (!target.userId) throw new UserError("Ownership can only be given to someone who has joined.");
      await db.update(t.tripMembers).set({ role: "editor" }).where(eq(t.tripMembers.id, member.id)).run();
    }
    if (target.role === "owner" && v.role && v.role !== "owner" && isSelf) throw new UserError("Transfer ownership to someone else first.");
    await db.update(t.tripMembers).set(v).where(eq(t.tripMembers.id, memberId)).run();
    await touchTrip(target.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

/** Adds someone by name who won't join online (or not yet). They're linked when they join with the same name. */
export async function addTraveller(tripId: string, displayName: string) {
  return run(async () => {
    const name = z.string().trim().min(1).max(40).parse(displayName);
    const user = await requireUser();
    await assertMember(tripId, user.id, ["owner", "editor"]);
    const members = await membersOf(tripId);
    if (members.length >= MAX_TRAVELLERS) throw new UserError(`A trip can have up to ${MAX_TRAVELLERS} travellers.`);
    if (members.some((m) => sameName(m.displayName, name))) throw new UserError(`${name} is already on this trip.`);
    await db.transaction(async (tx) => {
      const locked = await lockTrip(tx, tripId);
      const count = (await tx.select({ id: t.tripMembers.id }).from(t.tripMembers).where(eq(t.tripMembers.tripId, tripId)).all()).length;
      const sort = Math.max(0, ...members.map((m) => m.sort + 1));
      const m = (await tx
        .insert(t.tripMembers)
        .values({ tripId, displayName: name, avatarColor: COLORS[sort % COLORS.length]!, sort })
        .returning({ id: t.tripMembers.id })
        .get())!;
      await tx.insert(t.tripPreferences).values({ memberId: m.id }).run();
      await takeStandInPlace(tx, locked, count, m.id);
      await tx.update(t.trips).set({ travellersCount: sql`GREATEST(${t.trips.travellersCount}, ${count + 1})` }).where(eq(t.trips.id, tripId)).run();
    });
    await touchTrip(tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function removeMember(memberId: string) {
  return run(async () => {
    const user = await requireUser();
    const target = await db.select().from(t.tripMembers).where(eq(t.tripMembers.id, memberId)).get();
    if (!target) throw new UserError("Member not found.");
    await assertMember(target.tripId, user.id, ["owner"]);
    if (target.role === "owner") throw new UserError("The owner can't be removed.");
    await db.transaction(async (tx) => {
      const trip = await lockTrip(tx, target.tripId);
      const before = (await tx.select({ id: t.tripMembers.id }).from(t.tripMembers).where(eq(t.tripMembers.tripId, target.tripId)).all()).length;
      // The group is one smaller (never below who's left). Take the traveller out of every cost split, so their share
      // isn't silently re-billed to others, and move the stand-ins for people not joined yet down one place.
      const travellers = Math.max(before - 1, trip.travellersCount - 1);
      await rewriteParticipants(tx, target.tripId, (id) => {
        if (id === memberId) return null;
        if (!isStandIn(id)) return id;
        const n = Number(id.slice(STAND_IN_PREFIX.length)) - 1;
        return n > before - 1 && n <= travellers ? `${STAND_IN_PREFIX}${n}` : null;
      });
      await tx.delete(t.tripMembers).where(eq(t.tripMembers.id, memberId)).run();
      await tx.update(t.trips).set({ travellersCount: travellers, updatedAt: new Date().toISOString() }).where(eq(t.trips.id, target.tripId)).run();
    });
    revalidatePath("/", "layout");
    return {};
  });
}

/**
 * Unlinks a traveller from the phone or browser they joined on (owner only), without deleting anything: their picks
 * stay, and joining again from the invite link with the same name links them back.
 */
export async function resetLogin(memberId: string) {
  return run(async () => {
    const user = await requireUser();
    const target = await db.select().from(t.tripMembers).where(eq(t.tripMembers.id, memberId)).get();
    if (!target) throw new UserError("Member not found.");
    await assertMember(target.tripId, user.id, ["owner"]);
    if (target.role === "owner") throw new UserError("The owner's login can't be reset here.");
    if (!target.userId) throw new UserError(`${target.displayName} isn't linked to a login yet.`);
    await db.update(t.tripMembers).set({ userId: null, joinedAt: null }).where(eq(t.tripMembers.id, memberId)).run();
    await touchTrip(target.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

const prefSchema = z.object({
  interests: z.array(z.string().max(40)).max(20),
  preferredDestinations: z.array(z.string().max(60)).max(30),
  adventureTolerance: z.number().int().min(1).max(5),
  fitness: z.number().int().min(1).max(5),
  foodPreferences: z.array(z.string().max(40)).max(12),
  accommodation: z.enum(["shared_property", "hotel", "hostel", "homestay", "no_preference"]),
  nightlife: z.number().int().min(1).max(5),
  budgetInr: z.number().int().min(0).max(10_000_000).nullable(),
  freeVsPaid: z.number().int().min(1).max(5),
  avoid: z.string().trim().max(500).nullable(),
});

export async function savePreferences(memberId: string, input: z.input<typeof prefSchema>) {
  return run(async () => {
    const v = prefSchema.parse(input);
    const user = await requireUser();
    const target = await db.select().from(t.tripMembers).where(eq(t.tripMembers.id, memberId)).get();
    if (!target) throw new UserError("Member not found.");
    const { member } = await assertMember(target.tripId, user.id);
    const proxy = !target.userId && (member.role === "owner" || member.role === "editor");
    if (target.userId !== user.id && !proxy) throw new UserError("You can only edit your own preferences.");
    await db.insert(t.tripPreferences)
      .values({ memberId, ...v })
      .onConflictDoUpdate({ target: t.tripPreferences.memberId, set: v })
      .run();
    await touchTrip(target.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

/* ───────────── Shortlist, votes, comments ───────────── */

export async function addCandidate(tripId: string, activityId: string, note?: string) {
  return run(async () => {
    z.string().uuid().parse(activityId);
    const user = await requireUser();
    const { member } = await assertMember(tripId, user.id);
    const act = await db.select({ id: t.activities.id, title: t.activities.title }).from(t.activities).where(eq(t.activities.id, activityId)).get();
    if (!act) throw new UserError("Activity not found.");
    const existing = await db
      .select()
      .from(t.tripCandidates)
      .where(and(eq(t.tripCandidates.tripId, tripId), eq(t.tripCandidates.activityId, activityId)))
      .get();
    if (existing) return { candidateId: existing.id, created: false };
    const row = (await db
      .insert(t.tripCandidates)
      .values({ tripId, activityId, addedBy: member.id, note: note?.slice(0, 500) || null })
      .returning({ id: t.tripCandidates.id })
      .get())!;
    // Proposing something counts as being interested in it.
    await db.insert(t.groupVotes).values({ candidateId: row.id, memberId: member.id, vote: "interested" }).run();
    await touchTrip(tripId);
    revalidatePath("/", "layout");
    return { candidateId: row.id, created: true };
  });
}

async function candidateWithAccess(candidateId: string, userId: string, roles?: ("owner" | "editor" | "member")[]) {
  const c = await db.select().from(t.tripCandidates).where(eq(t.tripCandidates.id, candidateId)).get();
  if (!c) throw new UserError("That shortlist item no longer exists.");
  const access = await assertMember(c.tripId, userId, roles);
  return { candidate: c, ...access };
}

export async function setCandidateStatus(candidateId: string, status: "discussion" | "approved" | "rejected" | "scheduled" | "completed") {
  return run(async () => {
    const s = z.enum(["discussion", "approved", "rejected", "scheduled", "completed"]).parse(status);
    const user = await requireUser();
    const { candidate } = await candidateWithAccess(candidateId, user.id, ["owner", "editor"]);
    await db.update(t.tripCandidates).set({ status: s }).where(eq(t.tripCandidates.id, candidateId)).run();
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function setCandidateParticipation(
  candidateId: string,
  input: { participants: string[] | null; agreedPriceVnd?: number | null; priceIsQuote?: boolean; participation?: "everyone" | "optional" },
) {
  return run(async () => {
    const v = z
      .object({
        participants: participantList.nullable(),
        agreedPriceVnd: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
        priceIsQuote: z.boolean().optional(),
        participation: z.enum(["everyone", "optional"]).optional(),
      })
      .parse(input);
    const user = await requireUser();
    const { candidate } = await candidateWithAccess(candidateId, user.id, ["owner", "editor"]);
    const memberIds = new Set((await membersOf(candidate.tripId)).map((m) => m.id));
    const participants = v.participants?.filter((p) => memberIds.has(p) || isStandIn(p)) ?? null;
    await db.update(t.tripCandidates)
      .set({
        participants: participants && participants.length === memberIds.size ? null : participants,
        ...(v.agreedPriceVnd !== undefined ? { agreedPriceVnd: v.agreedPriceVnd } : {}),
        ...(v.priceIsQuote !== undefined ? { priceIsQuote: v.priceIsQuote } : {}),
        ...(v.participation ? { participation: v.participation } : {}),
      })
      .where(eq(t.tripCandidates.id, candidateId))
      .run();
    // Keep scheduled itinerary items in sync with the agreed participants.
    await db.update(t.itineraryItems)
      .set({ participants: participants && participants.length === memberIds.size ? null : participants })
      .where(and(eq(t.itineraryItems.tripId, candidate.tripId), eq(t.itineraryItems.activityId, candidate.activityId)))
      .run();
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function removeCandidate(candidateId: string) {
  return run(async () => {
    const user = await requireUser();
    const { candidate, member } = await candidateWithAccess(candidateId, user.id);
    if (candidate.addedBy !== member.id && member.role === "member") throw new UserError("Only the person who added it, an editor or the owner can remove it.");
    // Removing it deletes everyone's picks of it, so once others have picked it, only the owner or an editor can.
    if (member.role === "member") {
      const others = await db.select({ id: t.groupVotes.memberId }).from(t.groupVotes).where(and(eq(t.groupVotes.candidateId, candidateId), ne(t.groupVotes.memberId, member.id))).all();
      if (others.length) throw new UserError(`${others.length === 1 ? "Someone else has" : `${others.length} others have`} picked it too, so only the owner or an editor can remove it. You can remove your own pick.`);
    }
    await db.delete(t.tripCandidates).where(eq(t.tripCandidates.id, candidateId)).run();
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

type VoteValue = (typeof t.voteValues)[number];

/** Who a pick is recorded for: yourself, or (owners and editors) a traveller who hasn't joined online. */
async function resolveVoter(tripId: string, member: { id: string; role: string }, onBehalfOf: string | undefined) {
  if (!onBehalfOf || onBehalfOf === member.id) return member.id;
  const other = await db.select().from(t.tripMembers).where(and(eq(t.tripMembers.id, onBehalfOf), eq(t.tripMembers.tripId, tripId))).get();
  if (!other) throw new UserError("Traveller not found.");
  if (other.userId) throw new UserError(`${other.displayName} has joined: they need to make their own picks.`);
  if (member.role === "member") throw new UserError("Only the owner or an editor can record picks for others.");
  return other.id;
}

async function assertTripDay(tripId: string, dayId: string) {
  const day = await db.select({ id: t.itineraryDays.id }).from(t.itineraryDays).where(and(eq(t.itineraryDays.id, z.string().uuid().parse(dayId)), eq(t.itineraryDays.tripId, tripId))).get();
  if (!day) throw new UserError("That day isn't part of this trip.");
}

/**
 * Records one vote. `dayId`: undefined keeps the day already chosen, null clears it, a day id sets it (the day this
 * person wants to do a pick that isn't in the itinerary yet).
 */
async function writeVote(tripId: string, candidateId: string, voterId: string, vote: VoteValue | null, dayId: string | null | undefined) {
  if (dayId) await assertTripDay(tripId, dayId);
  if (vote === null) {
    await db.delete(t.groupVotes).where(and(eq(t.groupVotes.candidateId, candidateId), eq(t.groupVotes.memberId, voterId))).run();
    return;
  }
  const now = new Date().toISOString();
  await db
    .insert(t.groupVotes)
    .values({ candidateId, memberId: voterId, vote, dayId: dayId ?? null })
    .onConflictDoUpdate({ target: [t.groupVotes.candidateId, t.groupVotes.memberId], set: { vote, updatedAt: now, ...(dayId !== undefined ? { dayId } : {}) } })
    .run();
}

export async function castVote(candidateId: string, vote: VoteValue | null, onBehalfOf?: string, dayId?: string | null) {
  return run(async () => {
    const v = z.enum(t.voteValues).nullable().parse(vote);
    const user = await requireUser();
    const { candidate, member } = await candidateWithAccess(candidateId, user.id);
    const voterId = await resolveVoter(candidate.tripId, member, onBehalfOf);
    await writeVote(candidate.tripId, candidateId, voterId, v, dayId === undefined ? undefined : dayId === null ? null : z.string().uuid().parse(dayId));
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

/**
 * The board's one-step pick: puts the activity on the shortlist if it isn't there yet, then records the vote (and the
 * day it was dropped on) for you or for a traveller you're picking for.
 */
export async function pickActivity(tripId: string, activityId: string, input: { vote: VoteValue | null; dayId?: string | null; onBehalfOf?: string }) {
  return run(async () => {
    z.string().uuid().parse(activityId);
    const v = z.object({ vote: z.enum(t.voteValues).nullable(), dayId: z.string().uuid().nullable().optional(), onBehalfOf: z.string().uuid().optional() }).parse(input);
    const user = await requireUser();
    const { member } = await assertMember(tripId, user.id);
    const voterId = await resolveVoter(tripId, member, v.onBehalfOf);
    let candidate = await db.select().from(t.tripCandidates).where(and(eq(t.tripCandidates.tripId, tripId), eq(t.tripCandidates.activityId, activityId))).get();
    if (!candidate) {
      if (v.vote === null) return { candidateId: null };
      const act = await db.select({ id: t.activities.id }).from(t.activities).where(eq(t.activities.id, activityId)).get();
      if (!act) throw new UserError("Activity not found.");
      await db.insert(t.tripCandidates).values({ tripId, activityId, addedBy: member.id }).onConflictDoNothing().run();
      candidate = (await db.select().from(t.tripCandidates).where(and(eq(t.tripCandidates.tripId, tripId), eq(t.tripCandidates.activityId, activityId))).get())!;
    } else if (candidate.status === "rejected" && v.vote && ["must_do", "interested"].includes(v.vote)) {
      // Someone still wants it: back into discussion so it shows up again.
      await db.update(t.tripCandidates).set({ status: "discussion" }).where(eq(t.tripCandidates.id, candidate.id)).run();
    }
    await writeVote(tripId, candidate.id, voterId, v.vote, v.dayId);
    await touchTrip(tripId);
    revalidatePath("/", "layout");
    return { candidateId: candidate.id };
  });
}

export async function addComment(candidateId: string, body: string) {
  return run(async () => {
    const text = z.string().trim().min(1, "Write a comment first").max(1000).parse(body);
    const user = await requireUser();
    if (!(await rateLimit(`comment:${user.id}`, 30, 60_000)).ok) throw new UserError("You're commenting very quickly: please wait a moment.");
    const { candidate, member } = await candidateWithAccess(candidateId, user.id);
    await db.insert(t.comments).values({ candidateId, memberId: member.id, body: text }).run();
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function deleteComment(commentId: string) {
  return run(async () => {
    const user = await requireUser();
    const c = await db.select().from(t.comments).where(eq(t.comments.id, commentId)).get();
    if (!c) throw new UserError("Comment not found.");
    const { member, candidate } = await candidateWithAccess(c.candidateId, user.id);
    if (c.memberId !== member.id && member.role !== "owner") throw new UserError("You can only delete your own comments.");
    await db.update(t.comments).set({ deletedAt: new Date().toISOString() }).where(eq(t.comments.id, commentId)).run();
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

/** Lightweight change-detection for polling clients. */
export async function tripVersion(tripId: string) {
  return run(async () => {
    const user = await requireUser();
    const { trip } = await assertMember(tripId, user.id);
    const otherMembers = (await db.select({ id: t.tripMembers.id }).from(t.tripMembers).where(and(eq(t.tripMembers.tripId, tripId), ne(t.tripMembers.userId, user.id))).all()).length;
    return { version: trip.updatedAt, otherMembers };
  });
}
