"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run, UserError } from "@/lib/action";
import { limitClient, requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
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
      for (let i = 0; i < v.travellersCount; i++) {
        const m = (await tx
          .insert(t.tripMembers)
          .values({
            tripId: trip.id,
            userId: i === 0 ? user.id : null,
            displayName: i === 0 ? v.displayName : `Traveller ${i + 1}`,
            role: i === 0 ? "owner" : "member",
            avatarColor: COLORS[i % COLORS.length]!,
            sort: i,
            joinedAt: i === 0 ? new Date().toISOString() : null,
          })
          .returning({ id: t.tripMembers.id })
          .get())!;
        await tx.insert(t.tripPreferences).values({ memberId: m.id }).run();
      }
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
  seatId: z.string().uuid().optional(),
  displayName: z.string().trim().min(1, "Enter your name").max(40).optional(),
});

/** Join via invite code: claim an unclaimed seat or add yourself as a new member. */
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
    await db.transaction(async (tx) => {
      if (v.seatId) {
        const seat = await tx
          .select()
          .from(t.tripMembers)
          .where(and(eq(t.tripMembers.id, v.seatId), eq(t.tripMembers.tripId, trip.id), isNull(t.tripMembers.userId)))
          .get();
        if (!seat) throw new UserError("That seat has already been claimed.");
        // An invite never confers ownership: an unclaimed owner seat is claimed as a member.
        const claimed = await tx
          .update(t.tripMembers)
          .set({ userId: user.id, joinedAt: now, ...(seat.role === "owner" ? { role: "member" as const } : {}), ...(v.displayName ? { displayName: v.displayName } : {}) })
          .where(and(eq(t.tripMembers.id, seat.id), isNull(t.tripMembers.userId)))
          .returning({ id: t.tripMembers.id })
          .get();
        if (!claimed) throw new UserError("That seat has already been claimed.");
      } else {
        if (!v.displayName) throw new UserError("Enter your name to join.");
        const count = (await tx.select({ id: t.tripMembers.id }).from(t.tripMembers).where(eq(t.tripMembers.tripId, trip.id)).all()).length;
        if (count >= MAX_TRAVELLERS) throw new UserError(`This trip already has ${MAX_TRAVELLERS} travellers. Ask the owner to free up a seat.`);
        const m = (await tx
          .insert(t.tripMembers)
          .values({ tripId: trip.id, userId: user.id, displayName: v.displayName, avatarColor: COLORS[count % COLORS.length]!, sort: count, joinedAt: now })
          .returning({ id: t.tripMembers.id })
          .get())!;
        await tx.insert(t.tripPreferences).values({ memberId: m.id }).run();
        await tx.update(t.trips).set({ travellersCount: count + 1 }).where(eq(t.trips.id, trip.id)).run();
      }
    });
    if (user.isGuest && v.displayName && user.displayName.startsWith("Guest "))
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
    // Keep the seat (and its votes) but release it, with no special role, so the trip's history stays intact.
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

export async function addSeat(tripId: string, displayName: string) {
  return run(async () => {
    const name = z.string().trim().min(1).max(40).parse(displayName);
    const user = await requireUser();
    await assertMember(tripId, user.id, ["owner", "editor"]);
    const members = await membersOf(tripId);
    if (members.length >= MAX_TRAVELLERS) throw new UserError(`A trip can have up to ${MAX_TRAVELLERS} travellers.`);
    const m = (await db
      .insert(t.tripMembers)
      .values({ tripId, displayName: name, avatarColor: COLORS[members.length % COLORS.length]!, sort: members.length })
      .returning({ id: t.tripMembers.id })
      .get())!;
    await db.insert(t.tripPreferences).values({ memberId: m.id }).run();
    await db.update(t.trips).set({ travellersCount: members.length + 1 }).where(eq(t.trips.id, tripId)).run();
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
      // Take the traveller out of every cost split first, so their share isn't silently re-billed to others.
      const strip = <T extends { id: string; participants: string[] | null }>(rows: T[], update: (id: string, p: string[]) => void) => {
        for (const r of rows) if (r.participants?.includes(memberId)) update(r.id, r.participants.filter((x) => x !== memberId));
      };
      const byTrip = async (tbl: typeof t.expenses | typeof t.itineraryItems | typeof t.transportLegs | typeof t.accommodations | typeof t.tripCandidates) =>
        await tx.select({ id: tbl.id, participants: tbl.participants }).from(tbl).where(eq(tbl.tripId, target.tripId)).all();
      strip(await byTrip(t.expenses), async (id, p) => await tx.update(t.expenses).set({ participants: p }).where(eq(t.expenses.id, id)).run());
      strip(await byTrip(t.itineraryItems), async (id, p) => await tx.update(t.itineraryItems).set({ participants: p }).where(eq(t.itineraryItems.id, id)).run());
      strip(await byTrip(t.transportLegs), async (id, p) => await tx.update(t.transportLegs).set({ participants: p }).where(eq(t.transportLegs.id, id)).run());
      strip(await byTrip(t.accommodations), async (id, p) => await tx.update(t.accommodations).set({ participants: p }).where(eq(t.accommodations.id, id)).run());
      strip(await byTrip(t.tripCandidates), async (id, p) => await tx.update(t.tripCandidates).set({ participants: p }).where(eq(t.tripCandidates.id, id)).run());
      await tx.delete(t.tripMembers).where(eq(t.tripMembers.id, memberId)).run();
      const remaining = (await tx.select({ id: t.tripMembers.id }).from(t.tripMembers).where(eq(t.tripMembers.tripId, target.tripId)).all()).length;
      await tx.update(t.trips).set({ travellersCount: remaining, updatedAt: new Date().toISOString() }).where(eq(t.trips.id, target.tripId)).run();
    });
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
    const participants = v.participants?.filter((p) => memberIds.has(p)) ?? null;
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
    await db.delete(t.tripCandidates).where(eq(t.tripCandidates.id, candidateId)).run();
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
  });
}

export async function castVote(candidateId: string, vote: "must_do" | "interested" | "neutral" | "not_interested" | "cannot" | null, onBehalfOf?: string) {
  return run(async () => {
    const v = z.enum(["must_do", "interested", "neutral", "not_interested", "cannot"]).nullable().parse(vote);
    const user = await requireUser();
    const { candidate, member } = await candidateWithAccess(candidateId, user.id);
    let voterId = member.id;
    if (onBehalfOf && onBehalfOf !== member.id) {
      // Owners/editors may record votes for seats that haven't been claimed yet (e.g. collected offline).
      const seat = await db.select().from(t.tripMembers).where(and(eq(t.tripMembers.id, onBehalfOf), eq(t.tripMembers.tripId, candidate.tripId))).get();
      if (!seat) throw new UserError("Traveller not found.");
      if (seat.userId) throw new UserError(`${seat.displayName} has joined: they need to vote themselves.`);
      if (member.role === "member") throw new UserError("Only the owner or an editor can record votes for others.");
      voterId = seat.id;
    }
    if (v === null) {
      await db.delete(t.groupVotes).where(and(eq(t.groupVotes.candidateId, candidateId), eq(t.groupVotes.memberId, voterId))).run();
    } else {
      await db.insert(t.groupVotes)
        .values({ candidateId, memberId: voterId, vote: v })
        .onConflictDoUpdate({ target: [t.groupVotes.candidateId, t.groupVotes.memberId], set: { vote: v, updatedAt: new Date().toISOString() } })
        .run();
    }
    await touchTrip(candidate.tripId);
    revalidatePath("/", "layout");
    return {};
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
