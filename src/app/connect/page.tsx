import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/utils";
import { sourcesFor } from "@/services/catalog";
import { DataStatusBadge } from "@/components/catalog/meta";
import { Badge } from "@/components/ui/badge";
import { NetworkingPrep } from "@/components/connect/networking-prep";
import { CommunityBrowser } from "@/components/connect/community-browser";

export const metadata: Metadata = {
  title: "Work & Connect: Vietnam tech communities",
  description: "Optional professional networking for travelling tech professionals: developer communities, cloud and AI groups, startup hubs and coworking in Hanoi, Ho Chi Minh City and Da Nang.",
  alternates: { canonical: "/connect" },
};

const CITY: Record<string, string> = { hanoi: "Hanoi", "ho-chi-minh-city": "Ho Chi Minh City", "da-nang": "Da Nang", nationwide: "Nationwide" };

export default async function ConnectPage() {
  const orgs = await db.select().from(t.eventOrganisers).where(eq(t.eventOrganisers.publishStatus, "published")).orderBy(asc(t.eventOrganisers.name)).all();
  const events = await db.select().from(t.professionalEvents).where(eq(t.professionalEvents.publishStatus, "published")).orderBy(asc(t.professionalEvents.startDate)).all();
  const evSources = await sourcesFor("event", events.map((e) => e.id));
  const user = await getCurrentUser();
  const profile = user ? await db.select().from(t.userProfiles).where(eq(t.userProfiles.userId, user.id)).get() : null;
  const contacts = user ? await db.select().from(t.networkingContacts).where(eq(t.networkingContacts.userId, user.id)).orderBy(asc(t.networkingContacts.followUpDate)).all() : [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="container-x pt-10">
      <header className="max-w-3xl">
        <p className="eyebrow mb-2">Work &amp; Connect: Vietnam</p>
        <h1 className="text-4xl md:text-5xl">Meet Vietnam's tech community</h1>
        <p className="mt-4 text-lg text-muted">
          An optional space for travellers working in software, AI, cloud and startups. Join a meetup or drop into a coworking space while the rest of the group does something else, nothing here is added to the group plan unless you choose to.
        </p>
      </header>

      <section className="mt-12" aria-labelledby="events-h">
        <h2 id="events-h" className="text-3xl">Verified events</h2>
        <p className="mt-2 text-sm text-muted">Only events with an authoritative public listing are shown. We never imply an event is happening without one. Always re-check the organiser's page before travelling.</p>
        {events.length ? (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-md border border-line bg-surface p-5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand">{CITY[e.city] ?? e.city}</Badge>
                  {e.startDate < today && <Badge tone="neutral">Past</Badge>}
                </div>
                <h3 className="mt-2 font-sans text-lg font-semibold">{e.name}</h3>
                <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{formatLongDate(e.startDate)}{e.endDate && e.endDate !== e.startDate ? ` – ${formatLongDate(e.endDate)}` : ""}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{e.venue}</span>
                </p>
                <p className="mt-3 text-sm">{e.description}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-muted">Organiser</dt><dd>{e.organiser}</dd></div>
                  <div><dt className="text-muted">Price</dt><dd>{e.price}</dd></div>
                  <div><dt className="text-muted">Last verified</dt><dd>{formatLongDate(e.lastVerified)}</dd></div>
                  <div><dt className="text-muted">Source</dt><dd>{evSources.filter((s) => s.entityId === e.id).map((s) => <DataStatusBadge key={s.id} status={s.status} />)}</dd></div>
                </dl>
                <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">Registration &amp; details <ExternalLink className="size-3.5" /></a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-md border border-dashed border-line-strong p-6 text-sm text-muted">No verified events during the trip window yet. Check the communities below: most publish meetups a few weeks ahead.</p>
        )}
      </section>

      <section className="mt-16" aria-labelledby="comm-h">
        <h2 id="comm-h" className="text-3xl">Communities, hubs &amp; coworking</h2>
        <p className="mt-2 text-sm text-muted">Recurring groups and places. Dates are never invented: follow the organiser for current schedules.</p>
        <CommunityBrowser orgs={orgs.map((o) => ({ id: o.id, name: o.name, type: o.type, city: o.city, description: o.description, organiser: o.organiser, url: o.url, howToEngage: o.howToEngage, cadence: o.cadence, price: o.price, status: o.status }))} />
      </section>

      <section className="mt-16" aria-labelledby="prep-h">
        <h2 id="prep-h" className="text-3xl">Your networking prep</h2>
        <p className="mt-2 text-sm text-muted">Private to you. Write a short introduction, keep track of people you meet and set follow-up reminders.</p>
        <NetworkingPrep
          profile={{ headline: profile?.headline ?? "", introduction: profile?.introduction ?? "", linkedinUrl: profile?.linkedinUrl ?? "", interests: profile?.interests ?? [] }}
          contacts={contacts.map((c) => ({ id: c.id, name: c.name, company: c.company, role: c.role, metAt: c.metAt, notes: c.notes, followUpDate: c.followUpDate, followedUp: c.followedUp }))}
          today={today}
        />
      </section>
    </div>
  );
}
