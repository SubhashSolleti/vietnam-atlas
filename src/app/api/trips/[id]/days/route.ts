import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { assertMember, TripAccessError } from "@/services/trips";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    assertMember(id, user.id);
  } catch (e) {
    if (e instanceof TripAccessError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
  const days = db
    .select({ id: t.itineraryDays.id, date: t.itineraryDays.date, destinationName: t.destinations.name })
    .from(t.itineraryDays)
    .leftJoin(t.destinations, eq(t.destinations.id, t.itineraryDays.destinationId))
    .where(eq(t.itineraryDays.tripId, id))
    .orderBy(asc(t.itineraryDays.date))
    .all();
  return NextResponse.json({ days });
}
