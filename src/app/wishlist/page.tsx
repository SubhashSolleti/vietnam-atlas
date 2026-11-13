import type { Metadata } from "next";
import { eq, inArray } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getCatalog } from "@/services/catalog";
import { imagesFor, heroOf } from "@/services/media";
import { resolveActiveTrip } from "@/services/trips";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { WishlistView, type SavedEntry } from "@/components/wishlist/wishlist-view";
import { Heart } from "lucide-react";

export const metadata: Metadata = { title: "My Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const rows = user ? db.select().from(t.wishlistItems).where(eq(t.wishlistItems.userId, user.id)).all() : [];
  if (!rows.length)
    return (
      <div className="container-x max-w-2xl pt-16">
        <EmptyState as="h1" icon={<Heart />} title="Your wishlist is empty" action={<ButtonLink href="/experiences">Browse experiences</ButtonLink>}>
          Tap the heart on any experience, attraction or destination to save it here. Saved items stay on this device (or your account once you sign up), and you can compare them and propose them to your group.
        </EmptyState>
      </div>
    );
  const catalog = getCatalog();
  const actById = new Map(catalog.activities.map((a) => [a.id, a]));
  const destById = new Map(catalog.destinations.map((d) => [d.id, d]));
  const attrIds = rows.filter((r) => r.entityType === "attraction").map((r) => r.entityId);
  const attrs = attrIds.length
    ? db.select({ a: t.attractions, d: t.destinations }).from(t.attractions).innerJoin(t.destinations, eq(t.destinations.id, t.attractions.destinationId)).where(inArray(t.attractions.id, attrIds)).all()
    : [];
  const attrImg = imagesFor("attraction", attrIds);
  const active = await resolveActiveTrip(user?.id);
  const cands = active ? db.select().from(t.tripCandidates).where(eq(t.tripCandidates.tripId, active.trip.id)).all() : [];

  const entries: SavedEntry[] = rows
    .map((r): SavedEntry | null => {
      const base = { wishId: r.id, entityType: r.entityType, entityId: r.entityId, state: r.state, priority: r.priority, note: r.note, savedAt: r.createdAt };
      if (r.entityType === "activity") {
        const a = actById.get(r.entityId);
        if (!a) return null;
        return { ...base, title: a.title, href: `/experiences/${a.slug}`, destination: a.destinationName, destinationSlug: a.destinationSlug, image: a.image, activity: a, groupStatus: cands.find((c) => c.activityId === a.id)?.status ?? null };
      }
      if (r.entityType === "destination") {
        const d = destById.get(r.entityId);
        if (!d) return null;
        return { ...base, title: d.name, href: `/destinations/${d.slug}`, destination: d.regionName, destinationSlug: d.slug, image: d.image, activity: null, groupStatus: null };
      }
      const x = attrs.find((y) => y.a.id === r.entityId);
      if (!x) return null;
      return { ...base, title: x.a.name, href: `/attractions/${x.a.slug}`, destination: x.d.name, destinationSlug: x.d.slug, image: heroOf(attrImg.get(x.a.id)), activity: null, groupStatus: null, attractionFree: x.a.isFree };
    })
    .filter((e): e is SavedEntry => !!e);

  return (
    <div className="container-x pt-10">
      <p className="eyebrow mb-2">My wishlist</p>
      <h1 className="text-4xl md:text-5xl">Saved for later</h1>
      <p className="mt-2 text-muted">Your personal shortlist. Propose favourites to the group, compare side by side, or drag them onto days in <a href="/trip" className="text-accent underline">My Trip</a>.</p>
      <WishlistView entries={entries} activeTripId={active?.trip.id ?? null} activeTripName={active?.trip.name ?? null} />
    </div>
  );
}
