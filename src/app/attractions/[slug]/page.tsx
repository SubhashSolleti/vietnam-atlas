import { Accessibility, CalendarRange, Clock, ExternalLink, MapPin, Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SaveButton, ShareButton } from "@/components/catalog/actions";
import { ActivityCard } from "@/components/catalog/cards";
import { Gallery } from "@/components/catalog/gallery";
import { DataStatusBadge } from "@/components/catalog/meta";
import { SourceList } from "@/components/catalog/source-list";
import { DestinationMap } from "@/components/map/destination-map";
import { Badge } from "@/components/ui/badge";
import { getAttractionBySlug } from "@/services/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = getAttractionBySlug(slug);
  return d ? { title: `${d.attraction.name}, ${d.destination.name}`, description: d.attraction.description.slice(0, 160), alternates: { canonical: `/attractions/${slug}` } } : { title: "Attraction not found" };
}

export default async function AttractionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getAttractionBySlug(slug);
  if (!data) notFound();
  const { attraction: a, destination: d, images, activities, sources } = data;
  return (
    <article className="container-x pt-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/destinations" className="hover:text-ink">Destinations</Link> / <Link href={`/destinations/${d.slug}`} className="hover:text-ink">{d.name}</Link> / Attractions
      </nav>
      {images.length > 0 ? <Gallery images={images} title={a.name} /> : null}
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="capitalize">{a.kind.replace("_", " ")}</Badge>
            {a.isFree && <Badge tone="good">Free entry</Badge>}
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl">{a.name}</h1>
          {a.localName && <p className="mt-1 text-muted">{a.localName}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-muted"><MapPin className="size-4" /><Link href={`/destinations/${d.slug}`} className="hover:underline">{d.name}</Link> · {a.distanceFromCentre}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <SaveButton entityType="attraction" entityId={a.id} title={a.name} variant="button" />
            <ShareButton title={a.name} path={`/attractions/${a.slug}`} variant="outline" size="md" />
          </div>
          <p className="mt-8 text-[1.05rem]">{a.description}</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div><h2 className="mb-3 text-2xl">What to see</h2><ul className="prose-atlas">{a.whatToSee.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h2 className="mb-3 text-2xl">What to do</h2><ul className="prose-atlas">{a.whatToDo.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          {activities.length > 0 && (
            <>
              <h2 className="mt-12 mb-5 text-2xl">Experiences here</h2>
              <div className="grid gap-5 sm:grid-cols-2">{activities.map((x) => <ActivityCard key={x.id} a={x} ownPhotosOnly />)}</div>
            </>
          )}
          <div className="mt-12"><SourceList sources={sources} /></div>
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-md border border-line bg-surface p-5 text-sm">
            <Row icon={Clock} label="Opening hours" value={a.openingHoursText} status={a.openingHoursStatus} />
            <Row icon={Ticket} label="Entrance fee" value={a.feeText} status={a.feeStatus} />
            <Row icon={Clock} label="Visit duration" value={a.visitDuration} />
            <Row icon={CalendarRange} label="Seasonality" value={a.seasonality} />
            <Row icon={Accessibility} label="Accessibility" value={a.accessibility} />
            <Row icon={Ticket} label="Booking" value={a.booking} />
            <p className="mt-3 text-xs text-muted">Times are local (Vietnam, UTC+7). Holiday exceptions (e.g. Tết) are common: confirm before visiting.</p>
            {a.officialUrl && (
              <a href={a.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
                Official website <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          {a.lat && a.lng && (
            <div className="h-64 overflow-hidden rounded-md border border-line">
              <DestinationMap center={{ lat: a.lat, lng: a.lng, name: a.name }} attractions={[]} />
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function Row({ icon: Icon, label, value, status }: { icon: typeof Clock; label: string; value: string; status?: string }) {
  return (
    <div className="border-b border-line py-3 first:pt-0 last:border-0">
      <p className="flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <span className="flex items-center gap-1.5"><Icon className="size-3.5" />{label}</span>
        {status && <DataStatusBadge status={status} />}
      </p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
