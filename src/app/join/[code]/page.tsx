import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/utils";
import { membersOf } from "@/services/trips";
import { Avatar } from "@/components/ui/avatar";
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
  const joined = members.filter((m) => m.userId);
  const mine = user ? await db.select().from(t.tripMembers).where(and(eq(t.tripMembers.tripId, trip.id), eq(t.tripMembers.userId, user.id))).get() : null;
  return (
    <div className="container-x max-w-2xl pt-12">
      <p className="eyebrow mb-2">You're invited</p>
      <h1 className="text-4xl md:text-5xl">{trip.name}</h1>
      <p className="mt-2 text-muted">{formatLongDate(trip.startDate)} – {formatLongDate(trip.endDate)} · {Math.max(trip.travellersCount, members.length)} travellers</p>
      {trip.description && <p className="mt-4">{trip.description}</p>}
      {joined.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Already in">
          {joined.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-sm">
              <Avatar name={m.displayName} color={m.avatarColor} size={26} />
              {m.displayName}
            </span>
          ))}
          <span className="text-sm text-muted">already in</span>
        </div>
      )}
      <JoinForm
        code={trip.inviteCode}
        tripId={trip.id}
        alreadyMember={!!mine}
        addActivityId={add ?? null}
        defaultName={user && !user.displayName.startsWith("Guest ") ? user.displayName : ""}
      />
    </div>
  );
}
