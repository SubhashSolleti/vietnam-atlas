import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

/** GDPR-style personal data export (JSON). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const memberships = db.select().from(t.tripMembers).where(eq(t.tripMembers.userId, user.id)).all();
  const memberIds = memberships.map((m) => m.id);
  const data = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, isGuest: user.isGuest, createdAt: user.createdAt },
    profile: db.select().from(t.userProfiles).where(eq(t.userProfiles.userId, user.id)).get() ?? null,
    wishlist: db.select().from(t.wishlistItems).where(eq(t.wishlistItems.userId, user.id)).all(),
    comparisons: db.select().from(t.comparisons).where(eq(t.comparisons.userId, user.id)).all(),
    checklist: db.select().from(t.checklistProgress).where(eq(t.checklistProgress.userId, user.id)).all(),
    contacts: db.select().from(t.networkingContacts).where(eq(t.networkingContacts.userId, user.id)).all(),
    tripMemberships: memberships,
    preferences: memberIds.length ? db.select().from(t.tripPreferences).where(inArray(t.tripPreferences.memberId, memberIds)).all() : [],
    votes: memberIds.length ? db.select().from(t.groupVotes).where(inArray(t.groupVotes.memberId, memberIds)).all() : [],
    comments: memberIds.length ? db.select().from(t.comments).where(inArray(t.comments.memberId, memberIds)).all() : [],
    reviews: db.select().from(t.reviews).where(eq(t.reviews.userId, user.id)).all(),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="vietnam-atlas-my-data.json"` },
  });
}
