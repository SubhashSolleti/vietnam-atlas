import type { Metadata } from "next";
import { CalendarDays, Wallet } from "lucide-react";
import { and, eq, inArray } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { daysBetween, formatLongDate } from "@/lib/utils";
import { getCatalog } from "@/services/catalog";
import { itineraryData, membersOf, planSnapshot, resolveActiveTrip, tripBudget } from "@/services/trips";
import { routeTemplates } from "@/content/demo-trip";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveRefresh } from "@/components/group/live-refresh";
import { TripSwitcher } from "@/components/group/trip-switcher";
import { ItineraryBuilder } from "@/components/itinerary/builder";
import { Money } from "@/components/catalog/price";
import { myTrips } from "@/services/trips";

export const metadata: Metadata = { title: "My Trip: itinerary builder", robots: { index: false } };

export default async function TripPage() {
  const user = await getCurrentUser();
  const active = await resolveActiveTrip(user?.id);
  if (!active)
    return (
      <div className="container-x max-w-2xl pt-16">
        <EmptyState as="h1"
          title="No trip yet"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/group/new">Create a trip</ButtonLink>
              <ButtonLink href="/group" variant="outline">Join with an invite code</ButtonLink>
            </div>
          }
        >
          The itinerary builder works inside a trip, so the whole group can see and edit the same plan. Create a trip, or join your group's trip with the invite link they shared.
        </EmptyState>
      </div>
    );
  const { trip, member } = active;
  const members = await membersOf(trip.id);
  const { days, items, legs, stays } = await itineraryData(trip.id);
  const { result: budget } = await tripBudget(trip);
  const alerts = await planSnapshot(trip.id, { perPersonPlannedVnd: budget.maxPerPersonVnd, targetPerPersonVnd: budget.targetPerPersonVnd });
  const catalog = await getCatalog();
  const destById = new Map(catalog.destinations.map((d) => [d.id, d]));
  const actById = new Map(catalog.activities.map((a) => [a.id, a]));
  const legById = new Map(legs.map((l) => [l.id, l]));
  const candidates = await db.select().from(t.tripCandidates).where(eq(t.tripCandidates.tripId, trip.id)).all();
  const wish = user
    ? await db.select().from(t.wishlistItems).where(and(eq(t.wishlistItems.userId, user.id), eq(t.wishlistItems.entityType, "activity"))).all()
    : [];
  const scheduled = new Set(items.filter((i) => i.activityId).map((i) => i.activityId!));
  const allTrips = (await myTrips(user!.id)).map((x) => ({ id: x.trip.id, name: x.trip.name }));
  const sourceIds = [...new Set([...candidates.filter((c) => c.status !== "rejected").map((c) => c.activityId), ...wish.map((w) => w.entityId)])];
  const sourceAct = sourceIds.length ? await db.select({ id: t.activities.id }).from(t.activities).where(inArray(t.activities.id, sourceIds)).all() : [];

  return (
    <div className="pt-8">
      <LiveRefresh tripId={trip.id} version={trip.updatedAt} />
      <div className="container-x">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">My trip</p>
              {allTrips.length > 1 && <TripSwitcher trips={allTrips} activeId={trip.id} base="/trip" />}
            </div>
            <h1 className="mt-1 text-4xl md:text-5xl">{trip.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatLongDate(trip.startDate)} – {formatLongDate(trip.endDate)} · {daysBetween(trip.startDate, trip.endDate) + 1} days</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="size-4" />Est. <Money vnd={budget.averagePerPersonVnd} showVnd={false} /> per person{budget.targetPerPersonVnd ? <> of <Money vnd={budget.targetPerPersonVnd} showVnd={false} /></> : null}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/trip/budget" variant="outline">Budget</ButtonLink>
            <ButtonLink href={`/group/${trip.id}?tab=shortlist`} variant="outline">Group shortlist</ButtonLink>
          </div>
        </div>
      </div>
      <ItineraryBuilder
        tripId={trip.id}
        canManage={member.role !== "member"}
        templates={routeTemplates.map((r) => ({ slug: r.slug, name: r.name, description: r.description }))}
        members={members.map((m) => ({ id: m.id, name: m.displayName, color: m.avatarColor }))}
        destinations={catalog.destinations.map((d) => ({ id: d.id, name: d.name, slug: d.slug, lat: d.lat, lng: d.lng }))}
        alerts={alerts}
        byDay={budget.byDay}
        days={days.map((d) => ({
          id: d.id,
          date: d.date,
          destinationId: d.destinationId,
          title: d.title,
          notes: d.notes,
          outOfRange: d.date < trip.startDate || d.date > trip.endDate,
          items: items
            .filter((i) => i.dayId === d.id)
            .map((i) => {
              const a = i.activityId ? actById.get(i.activityId) : null;
              const leg = i.transportLegId ? legById.get(i.transportLegId) : null;
              return {
                id: i.id,
                type: i.type,
                title: i.title,
                startTime: i.startTime,
                durationMin: i.durationMin,
                costVnd: i.costVnd,
                costMode: i.costMode,
                participants: i.participants,
                notes: i.notes,
                activityId: i.activityId,
                activitySlug: a?.slug ?? null,
                destinationName: a?.destinationName ?? null,
                image: a?.image?.src ?? null,
                weatherDependent: a?.weatherDependent ?? false,
                decemberStatus: a?.decemberStatus ?? null,
                transportLegId: i.transportLegId,
                isFixed: leg?.isFixed ?? false,
              };
            }),
        }))}
        legs={legs.map((l) => ({
          ...l,
          fromName: l.fromDestinationId ? destById.get(l.fromDestinationId)?.name ?? l.fromLabel : l.fromLabel,
          toName: l.toDestinationId ? destById.get(l.toDestinationId)?.name ?? l.toLabel : l.toLabel,
        }))}
        stays={stays}
        sources={sourceAct
          .map((s) => actById.get(s.id))
          .filter((a): a is NonNullable<typeof a> => !!a)
          .map((a) => {
            const c = candidates.find((x) => x.activityId === a.id);
            return {
              activityId: a.id,
              title: a.title,
              destinationName: a.destinationName,
              durationMin: Math.round(a.durationHours * 60),
              image: a.image?.src ?? null,
              origin: c ? (c.status === "approved" ? "Group approved" : c.status === "scheduled" ? "Scheduled" : "On shortlist") : "My wishlist",
              scheduled: scheduled.has(a.id),
            };
          })
          .sort((x, y) => Number(x.scheduled) - Number(y.scheduled) || (x.origin === "Group approved" ? -1 : 1))}
      />
    </div>
  );
}
