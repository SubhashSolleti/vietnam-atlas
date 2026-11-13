import { Bus, CalendarDays, Clock, Landmark, MapPin, Moon, Plane, Ship, ShieldAlert, Train, Wallet, Wifi } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton, SaveButton } from "@/components/catalog/actions";
import { ActivityBrowser } from "@/components/catalog/activity-browser";
import { AtlasImage } from "@/components/catalog/atlas-image";
import { DestinationRow } from "@/components/catalog/cards";
import { Gallery } from "@/components/catalog/gallery";
import { MonthStrip } from "@/components/catalog/meta";
import { SourceList } from "@/components/catalog/source-list";
import { DestinationMap } from "@/components/map/destination-map";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { KIND_LABELS } from "@/content/taxonomy";
import { absoluteUrl, cn, jsonLdScript } from "@/lib/utils";
import { getDestinationBySlug } from "@/services/catalog";
import { AddDestinationToTrip } from "./add-to-trip";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getDestinationBySlug(slug);
  if (!data) return { title: "Destination not found" };
  const d = data.destination;
  const hero = data.images[0];
  return {
    title: `${d.name} travel guide: things to do, costs & best time`,
    description: d.summary,
    alternates: { canonical: `/destinations/${d.slug}` },
    openGraph: { title: `${d.name} · Vietnam Atlas`, description: d.summary, images: hero ? [{ url: hero.src, alt: hero.alt }] : undefined },
  };
}

const SECTIONS = [
  ["overview", "Overview"],
  ["attractions", "Top attractions"],
  ["experiences", "Experiences"],
  ["food", "Food"],
  ["nightlife", "Nightlife"],
  ["free", "Free"],
  ["practical", "Practical guide"],
  ["nearby", "Nearby"],
  ["sources", "Sources"],
] as const;

const HUB_ICON = { airport: Plane, railway: Train, bus: Bus, port: Ship } as const;
const SPEND = ["", "Very affordable", "Affordable", "Mid-range", "Pricier"];

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getDestinationBySlug(slug);
  if (!data) notFound();
  const { destination: d, region, parent, children, attractions, images, nearby, activities, sources } = data;
  const free = activities.filter((a) => a.priceTier === "free");
  const hero = images[0] ?? null;
  const p = d.practical;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: d.name,
    description: d.summary,
    url: absoluteUrl(`/destinations/${d.slug}`),
    geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
    containedInPlace: { "@type": "AdministrativeArea", name: `${d.province}, Vietnam` },
    image: hero ? absoluteUrl(hero.src) : undefined,
    touristType: d.idealFor,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* A · Hero */}
      <header className="relative isolate min-h-[62svh] overflow-hidden bg-charcoal text-white md:min-h-[72svh]">
        <AtlasImage image={hero} fallbackLabel={d.name} priority sizes="100vw" />
        <div className="hero-fade absolute inset-0" />
        <div className="container-x relative z-10 flex min-h-[62svh] flex-col justify-end pt-24 pb-10 md:min-h-[72svh] md:pb-14">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-white/75">
            <Link href="/destinations" className="hover:text-white">
              Destinations
            </Link>
            {" / "}
            <Link href={`/explore/${region.slug}`} className="hover:text-white">
              {region.name}
            </Link>
            {parent && (
              <>
                {" / "}
                <Link href={`/destinations/${parent.slug}`} className="hover:text-white">
                  {parent.name}
                </Link>
              </>
            )}
          </nav>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="dark">{KIND_LABELS[d.kind as keyof typeof KIND_LABELS] ?? d.kind}</Badge>
            <Badge tone="dark">
              {d.province}
              {d.formerProvince ? ` (formerly ${d.formerProvince})` : ""}
            </Badge>
          </div>
          <h1 className="mt-3 text-5xl md:text-7xl">
            {d.name}
            {d.localName && <span className="ml-3 align-middle font-sans text-base font-normal text-white/70 md:text-lg">{d.localName}</span>}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/85 md:text-xl">{d.tagline}</p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <ButtonLink href="#experiences" variant="light" size="lg">
              Explore {activities.length} experiences
            </ButtonLink>
            <SaveButton entityType="destination" entityId={d.id} title={d.name} variant="button" className="h-12 border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20" />
            <AddDestinationToTrip destinationId={d.id} name={d.name} />
            <ShareButton title={d.name} path={`/destinations/${d.slug}`} text={d.summary} size="md" variant="light" className="h-12" />
          </div>
        </div>
      </header>

      <nav aria-label="On this page" className="sticky top-16 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <ul className="container-x flex gap-1 relative overflow-x-auto py-2 text-sm scrollbar-none">
          {SECTIONS.filter(([id]) => !(id === "nightlife" && !d.nightlife.length)).map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-full px-3 py-1.5 whitespace-nowrap text-muted hover:bg-surface-2 hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* B · Overview */}
      <section id="overview" className="container-x scroll-mt-32 pt-14">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-3">Overview</p>
            <h2 className="font-serif text-2xl leading-snug font-normal md:text-[1.7rem]">{d.summary}</h2>
            <div className="prose-atlas mt-6 text-[1.02rem] text-ink/90">
              <p>{d.intro}</p>
              <h3>What makes it special</h3>
              <p>{d.whySpecial}</p>
              <h3>Why visit</h3>
              <ul>
                {d.whyVisit.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <h3>What makes it unique</h3>
              <p>{d.uniqueText}</p>
            </div>
            {children.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-4 text-2xl">Places within {d.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {children.map((c) => (
                    <DestinationRow key={c.slug} d={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <aside className="space-y-5 lg:col-span-5">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line text-sm">
              <Fact icon={CalendarDays} label="Recommended stay" value={`${d.daysMin === d.daysMax ? d.daysMin : `${d.daysMin}–${d.daysMax}`} days`} />
              <Fact icon={Wallet} label="Spending level" value={`${"₹".repeat(d.spendingLevel)} · ${SPEND[d.spendingLevel]}`} />
              <Fact icon={MapPin} label="Best travel style" value={d.travelStyle} wide />
              <Fact icon={Landmark} label="Ideal for" value={d.idealFor.join(", ")} wide />
            </dl>
            <div className="rounded-md border border-line bg-surface p-4">
              <p className="mb-3 text-sm font-semibold">When to go</p>
              <MonthStrip months={d.months} />
              <p className="mt-3 text-sm text-muted">{d.weather}</p>
              <p className="mt-3 rounded-sm bg-accent-soft px-3 py-2 text-sm text-ink">
                <strong>December:</strong> {d.decemberNote}
              </p>
            </div>
            <div className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="h-56">
                <DestinationMap
                  center={{ lat: d.lat, lng: d.lng, name: d.name }}
                  attractions={attractions.filter((a) => a.lat && a.lng).map((a) => ({ id: a.id, name: a.name, lat: a.lat!, lng: a.lng!, slug: a.slug, kind: a.kind }))}
                />
              </div>
              <ul className="divide-y divide-line text-sm">
                {d.transportHubs.map((h) => {
                  const Icon = HUB_ICON[h.type as keyof typeof HUB_ICON] ?? Bus;
                  return (
                    <li key={h.name} className="flex gap-3 px-4 py-2.5">
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                      <span>
                        <span className="font-medium">
                          {h.name}
                          {h.code && <span className="ml-1 text-muted">({h.code})</span>}
                        </span>
                        {h.distanceKm != null && <span className="text-muted"> · ~{h.distanceKm} km</span>}
                        {h.note && <span className="block text-xs text-muted">{h.note}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* The hero photo is already on screen, so the gallery shows the rest. */}
      {images.length > 2 && (
        <section className="container-x pt-14" aria-label={`${d.name} photo gallery`}>
          <Gallery images={images.slice(1)} title={d.name} />
        </section>
      )}

      {/* C · Attractions */}
      {attractions.length > 0 && (
        <section id="attractions" className="container-x scroll-mt-32 pt-20">
          <SectionTitle eyebrow="Top attractions" title={`The places that define ${d.name}`} />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {attractions.map((a) => (
              <article key={a.id} className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface">
                <div className="relative aspect-[3/2] bg-surface-2">
                  <AtlasImage image={a.images[0] ?? null} fallbackLabel={a.name} sizes="(min-width: 1024px) 33vw, 100vw" />
                  {a.isFree && <span className="absolute top-2 left-2 z-[2] rounded-xs bg-good px-1.5 py-0.5 text-[0.68rem] font-bold text-on-good">FREE ENTRY</span>}
                  <SaveButton entityType="attraction" entityId={a.id} title={a.name} variant="overlay" className="absolute top-2 right-2 z-[3]" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-muted capitalize">{a.kind.replace("_", " ")}</p>
                  <h3 className="font-sans text-lg font-semibold">
                    <Link href={`/attractions/${a.slug}`} className="after:absolute after:inset-0 after:z-[1] hover:text-accent">
                      {a.name}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted">{a.description}</p>
                  <dl className="mt-auto grid grid-cols-2 gap-2 pt-4 text-xs">
                    <div>
                      <dt className="text-muted">Entry</dt>
                      <dd className="font-medium">{a.feeText.length > 42 ? a.feeText.slice(0, 40) + "…" : a.feeText}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Allow</dt>
                      <dd className="font-medium">{a.visitDuration}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* D · Experiences */}
      <section id="experiences" className="scroll-mt-32 pt-20">
        <div className="container-x">
          <SectionTitle eyebrow="Activities & experiences" title={`Everything to do in ${d.name}`} action={<ButtonLink href={`/experiences?destination=${d.slug}`} variant="outline">Open in catalogue</ButtonLink>}>
            {activities.length} experiences: each with estimated prices, December suitability and practical details. Save the ones you like; add them to your trip for the group to vote on.
          </SectionTitle>
          <ActivityBrowser activities={activities} ownPhotosOnly />
        </div>
      </section>

      {/* E · Food */}
      <section id="food" className="mt-20 scroll-mt-32 bg-bg-alt py-16">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionTitle eyebrow="Food & local experiences" title="What to eat here" />
            <ul className="divide-y divide-line rounded-md border border-line bg-surface">
              {d.food.dishes.map((dish) => (
                <li key={dish.name} className="flex gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {dish.name}
                      {dish.localName && dish.localName !== dish.name && <span className="ml-2 font-normal text-muted">{dish.localName}</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{dish.description}</p>
                  </div>
                  <span className="shrink-0">
                    <Badge tone={dish.vegetarian === "yes" ? "good" : dish.vegetarian === "adaptable" ? "warn" : "neutral"}>
                      {dish.vegetarian === "yes" ? "Vegetarian" : dish.vegetarian === "adaptable" ? "Can be vegetarian" : "Not vegetarian"}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">These are dish recommendations, not bookable products. Bookable food tours and classes appear under Experiences → Food.</p>
          </div>
          <div className="space-y-5 lg:col-span-5">
            <InfoCard title="Dietary notes: vegetarian & allergies">{d.food.dietaryNotes}</InfoCard>
            {d.food.markets.length > 0 && <ListCard title="Markets" items={d.food.markets} />}
            {d.food.cafes.length > 0 && <ListCard title="Local cafés" items={d.food.cafes} />}
            {d.food.experiences.length > 0 && <ListCard title="Special food experiences" items={d.food.experiences} />}
          </div>
        </div>
      </section>

      {/* F · Nightlife */}
      {d.nightlife.length > 0 && (
        <section id="nightlife" className="container-x scroll-mt-32 pt-20">
          <SectionTitle eyebrow="Nightlife & social" title="After dark" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {d.nightlife.map((n) => (
              <div key={n.name} className="rounded-md border border-line bg-surface p-5">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Moon className="size-3.5" />
                  <span className="capitalize">{n.type.replace(/_/g, " ")}</span>
                </div>
                <h3 className="mt-1 font-sans text-base font-semibold">{n.name}</h3>
                <p className="mt-1 text-sm text-muted">{n.description}</p>
                {(n.ageNote || n.safetyNote) && (
                  <div className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
                    {n.ageNote && <p>
                      <strong>Age:</strong> {n.ageNote}
                    </p>}
                    {n.safetyNote && (
                      <p className="flex gap-1.5 text-warn">
                        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                        {n.safetyNote}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* G · Free */}
      <section id="free" className="container-x scroll-mt-32 pt-20">
        <div className="rounded-lg border border-good/30 bg-good-soft/60 p-6 md:p-10">
          <SectionTitle eyebrow="Free experiences" title={`${free.length} genuinely free things to do`}>
            Public beaches, viewpoints, walks, markets and cultural streets. Paid attractions are kept separate: if something has an entry fee it is not listed here.
          </SectionTitle>
          {free.length ? (
            // A compact list: these experiences also appear as cards in the browser above.
            <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {free.slice(0, 8).map((a) => (
                <li key={a.id} className="border-b border-good/20 py-3">
                  <Link href={`/experiences/${a.slug}`} className="group flex items-start justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block font-semibold group-hover:text-accent">{a.title}</span>
                      <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{a.summary}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 pt-0.5 text-xs text-muted">
                      <Clock className="size-3.5" aria-hidden />
                      {a.durationText}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No free activities have been catalogued here yet.</p>
          )}
          {free.length > 8 && (
            <p className="mt-6">
              <Link href={`/experiences?destination=${d.slug}&tier=free`} className="font-semibold text-accent hover:underline">
                See all {free.length} free experiences →
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* H · Practical */}
      <section id="practical" className="container-x scroll-mt-32 pt-20">
        <SectionTitle eyebrow="Practical travel guide" title={`Getting to and around ${d.name}`} />
        <div className="grid gap-5 lg:grid-cols-3">
          <InfoCard title="How to reach" icon={Plane}>{p.howToReach}</InfoCard>
          <InfoCard title="Getting around" icon={Bus}>{p.gettingAround}</InfoCard>
          <InfoCard title="Local transport" icon={MapPin}>{p.localTransport}</InfoCard>
          <InfoCard title="Typical travel times" icon={Clock}>{p.travelTimes}</InfoCard>
          <InfoCard title="Connectivity" icon={Wifi}>{p.connectivity}</InfoCard>
          <InfoCard title="Payments" icon={Wallet}>{p.payments}</InfoCard>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-line bg-surface p-5 lg:col-span-2">
            <h3 className="mb-3 font-sans text-base font-semibold">Where to stay</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              {p.accommodationAreas.map((a) => (
                <div key={a.name}>
                  <dt className="font-medium">{a.name}</dt>
                  <dd className="text-sm text-muted">{a.description}</dd>
                </div>
              ))}
            </dl>
          </div>
          <InfoCard title="Accessibility">{p.accessibility}</InfoCard>
          <ListCard title="Safety considerations" items={p.safety} tone="warn" />
          <ListCard title="Packing suggestions" items={p.packing} />
          <ListCard title="Local regulations" items={p.regulations} />
        </div>
      </section>

      {/* I · Nearby */}
      {nearby.length > 0 && (
        <section id="nearby" className="container-x scroll-mt-32 pt-20">
          <SectionTitle eyebrow="Nearby destinations" title="Combine it with" />
          <div className="grid gap-3 md:grid-cols-2">
            {nearby
              .filter((n) => n.card)
              .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
              .map((n) => (
                <DestinationRow key={n.toId} d={n.card!} note={`~${n.distanceKm} km · ${n.travel}`} />
              ))}
          </div>
        </section>
      )}

      {/* J · Sources */}
      <section id="sources" className="container-x scroll-mt-32 pt-20">
        <SourceList sources={sources} title={`Sources for ${d.name}`} />
        <p className="mt-3 text-xs text-muted">
          Spotted something out of date? <Link href={`/contact?page=/destinations/${d.slug}`} className="underline">Send a correction</Link>.
        </p>
      </section>
    </article>
  );
}

function SectionTitle({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="text-3xl md:text-4xl">{title}</h2>
        {children && <p className="mt-3 text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

function Fact({ icon: Icon, label, value, wide }: { icon: typeof MapPin; label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("bg-surface p-4", wide && "col-span-2")}>
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function InfoCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof MapPin }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <h3 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold">
        {Icon && <Icon className="size-4 text-brand-2" aria-hidden />}
        {title}
      </h3>
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone?: "warn" }) {
  return (
    <div className={cn("rounded-md border bg-surface p-5", tone === "warn" ? "border-highlight/50" : "border-line")}>
      <h3 className="mb-2 font-sans text-base font-semibold">{title}</h3>
      <ul className="prose-atlas text-sm text-muted">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

