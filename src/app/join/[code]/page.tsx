import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/utils";
import { membersOf } from "@/services/trips";
import { JoinForm } from "@/components/group/join-form";

export const metadata: Metadata = { title: "Join a trip", robots: { index: false } };

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ add?: string }> }) {
  const { code } = await params;
  const { add } = await searchParams;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* malformed escape: treat as an unknown code */
  }
  const trip = await db.select().from(t.trips).where(eq(t.trips.inviteCode, decoded.toUpperCase().slice(0, 16))).get();
  if (!trip) notFound();
  const user = await getCurrentUser();
  const members = await membersOf(trip.id);
  const mine = user ? await db.select().from(t.tripMembers).where(and(eq(t.tripMembers.tripId, trip.id), eq(t.tripMembers.userId, user.id))).get() : null;
  return (
    <div className="container-x max-w-2xl pt-12">
      <p className="eyebrow mb-2">You're invited</p>
      <h1 className="text-4xl md:text-5xl">{trip.name}</h1>
      <p className="mt-2 text-muted">{formatLongDate(trip.startDate)} – {formatLongDate(trip.endDate)} · {members.length} travellers</p>
      {trip.description && <p className="mt-4">{trip.description}</p>}
      <JoinForm
        code={trip.inviteCode}
        tripId={trip.id}
        alreadyMember={!!mine}
        addActivityId={add ?? null}
        defaultName={user && !user.displayName.startsWith("Guest ") ? user.displayName : ""}
        seats={members.map((m) => ({ id: m.id, name: m.displayName, color: m.avatarColor, claimed: !!m.userId, type: m.travellerType, role: m.role }))}
      />
    </div>
  );
}
