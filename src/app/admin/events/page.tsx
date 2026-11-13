import { asc } from "drizzle-orm";
import { db, t } from "@/db/client";
import { EventsAdmin } from "@/components/admin/events-admin";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminEvents() {
  await requireAdminPage(undefined, "/admin/events");
  const events = await db.select().from(t.professionalEvents).orderBy(asc(t.professionalEvents.startDate)).all();
  const orgs = await db.select().from(t.eventOrganisers).orderBy(asc(t.eventOrganisers.name)).all();
  return (
    <div>
      <h1 className="text-3xl">Events &amp; communities</h1>
      <p className="mt-2 text-sm text-muted">Only add dated events from an authoritative listing (organiser page, Meetup, Luma, official site). Record when you last checked it.</p>
      <EventsAdmin events={events} orgs={orgs.map((o) => ({ id: o.id, name: o.name, city: o.city, status: o.status, publishStatus: o.publishStatus }))} />
    </div>
  );
}
