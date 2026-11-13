import "server-only";
import { eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import type { CurrentUser } from "@/lib/auth";
import { myTrips, resolveActiveTrip } from "./trips";

export interface UserState {
  user: { id: string; displayName: string; avatarColor: string; isGuest: boolean; role: string } | null;
  saved: Record<string, { id: string; state: string; note: string | null; priority: number }>;
  compareIds: string[];
  trips: { id: string; name: string; role: string; memberId: string }[];
  activeTripId: string | null;
  /** activityId -> candidate status in the active trip */
  activeTripCandidates: Record<string, string>;
}

export async function getUserState(user: CurrentUser | null): Promise<UserState> {
  if (!user) return { user: null, saved: {}, compareIds: [], trips: [], activeTripId: null, activeTripCandidates: {} };
  const saved = Object.fromEntries(
    (await db
      .select()
      .from(t.wishlistItems)
      .where(eq(t.wishlistItems.userId, user.id))
      .all())
      .map((w) => [`${w.entityType}:${w.entityId}`, { id: w.id, state: w.state, note: w.note, priority: w.priority }]),
  );
  const compareIds = (await db.select({ id: t.comparisons.activityId }).from(t.comparisons).where(eq(t.comparisons.userId, user.id)).all()).map((c) => c.id);
  const trips = (await myTrips(user.id)).map((x) => ({ id: x.trip.id, name: x.trip.name, role: x.member.role, memberId: x.member.id }));
  const active = await resolveActiveTrip(user.id);
  const activeTripCandidates = active
    ? Object.fromEntries(
        (await db
          .select({ a: t.tripCandidates.activityId, s: t.tripCandidates.status })
          .from(t.tripCandidates)
          .where(eq(t.tripCandidates.tripId, active.trip.id))
          .all())
          .map((c) => [c.a, c.s]),
      )
    : {};
  return {
    user: { id: user.id, displayName: user.displayName, avatarColor: user.avatarColor, isGuest: user.isGuest, role: user.role },
    saved,
    compareIds,
    trips,
    activeTripId: active?.trip.id ?? null,
    activeTripCandidates,
  };
}
