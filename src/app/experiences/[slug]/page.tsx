import { AlertTriangle, Backpack, Bus, CalendarRange, CheckCircle2, CircleDollarSign, Clock, CloudRain, ExternalLink, Gauge, Info, MapPin, Shirt, ShieldCheck, Users, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ActivityCard } from "@/components/catalog/cards";
import { Gallery } from "@/components/catalog/gallery";
import { DataStatusBadge, DecemberBadge, IntensityMeter, MonthStrip, bestMonths } from "@/components/catalog/meta";
import { Price } from "@/components/catalog/price";
import { SourceList } from "@/components/catalog/source-list";
import { DestinationMap } from "@/components/map/destination-map";
import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_LABELS, DIFFICULTY_LABELS, DURATION_LABELS, SUITABILITY_LABELS, TIER_LABELS } from "@/content/taxonomy";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { absoluteUrl, cn, jsonLdScript } from "@/lib/utils";
import { getActivityBySlug } from "@/services/catalog";
import { resolveActiveTrip } from "@/services/trips";
import { ActivityActionPanel } from "./action-panel";
import { ReviewForm } from "./review-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getActivityBySlug(slug);
  if (!data) return { title: "Experience not found" };
  const img = data.images.own[0] ?? data.card?.image ?? null;
  return {
    title: `${data.activity.title}${data.destination.name}`,
    description: data.activity.summary,
    alternates: { canonical: `/experiences/${slug}` },
    openGraph: { title: data.activity.title, description: data.activity.summary, images: img ? [{ url: img.src, alt: img.alt }] : undefined },
  };
}

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getActivityBySlug(slug);
  if (!data) notFound();
  const { activity: a, destination: d, region, attraction, price, categories, images, freeAlternatives, paidAlternatives, related, nearbyAttractions, reviews, sources, card } = data;

  // Gallery: own photos first, then attraction/destination imagery clearly labelled as representative.
  // The representative photo shown on this experience's card leads, so card and page match.
  const cardImage = !images.own.length && card?.image ? [{ ...card.image, representative: true }] : [];
  const borrowed = [
    ...cardImage,
    ...images.attraction.map((i) => ({ ...i, representative: true, alt: `${i.alt} (representative of the area)` })),
    ...images.destination.slice(0, 4).map((i) => ({ ...i, representative: true, alt: `${i.alt} (representative of ${d.name})` })),
  ];
  const gallery = [...images.own, ...borrowed].filter((img, i, all) => all.findIndex((o) => o.src === img.src) === i);

  const user = await getCurrentUser();
  const active = await resolveActiveTrip(user?.id);
  let candidateId: string | null = null;
  let myVote: string | null = null;
  if (active) {
    const c = await db.select().from(t.tripCandidates).where(and(eq(t.tripCandidates.tripId, active.trip.id), eq(t.tripCandidates.activityId, a.id))).get();
    if (c) {
      candidateId = c.id;
      myVote = (await db.select().from(t.groupVotes).where(and(eq(t.groupVotes.candidateId, c.id), eq(t.groupVotes.memberId, active.member.id))).get())?.vote ?? null;
    }
  }

  const themes = categories.filter((c) => c.kind === "theme");
  const cats = categories.filter((c) => c.kind === "category");
  const lat = attraction?.lat ?? d.lat;
  const lng = attraction?.lng ?? d.lng;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: a.title,
    description: a.summary,
    url: absoluteUrl(`/experiences/${a.slug}`),
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    isAccessibleForFree: a.priceTier === "free",
    containedInPlace: { "@type": "TouristDestination", name: d.name },
  };

  return (
    <article className="container-x pt-6 pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/experiences" className="hover:text-ink">Experiences</Link>
        {" / "}
        <Link href={`/explore/${region.slug}`} className="hover:text-ink">{region.name}</Link>
        {" / "}
        <Link href={`/destinations/${d.slug}`} className="hover:text-ink">{d.name}</Link>
      </nav>

      {/* 1 · Gallery */}
      <Gallery images={gallery} title={a.title} />
      {!images.own.length && (
        <p className="mt-2 text-xs text-muted">
          No verified photo of this specific experience yet; the images above are representative of{" "}
          {attraction && images.attraction.length ? `${attraction.name} and ${d.name}` : d.name}.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          {/* 2–4 · Name, destination, category */}
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={a.priceTier === "free" ? "good" : "neutral"}>{TIER_LABELS[a.priceTier]}</Badge>
            {cats.map((c) => (
              <Link key={c.slug} href={`/experiences?category=${c.slug}`}>
                <Badge>{c.name}</Badge>
              </Link>
            ))}
            {themes.map((c) => (
              <Link key={c.slug} href={`/experiences?theme=${c.slug}`}>
                <Badge tone="accent">{c.name}</Badge>
              </Link>
            ))}
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl">{a.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted">
            <MapPin className="size-4 shrink-0" />
            <Link href={`/destinations/${d.slug}`} className="hover:text-ink hover:underline">{d.name}</Link>
            {attraction && (
              <>
                <span>·</span>
                <Link href={`/attractions/${attraction.slug}`} className="hover:text-ink hover:underline">{attraction.name}</Link>
              </>
            )}
          </p>

          {/* Key facts strip */}
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
            <KeyFact icon={Clock} label="Duration" value={a.durationText} sub={DURATION_LABELS[a.durationBucket as keyof typeof DURATION_LABELS]} />
            <KeyFact icon={Gauge} label="Difficulty" value={DIFFICULTY_LABELS[a.difficulty as keyof typeof DIFFICULTY_LABELS] ?? a.difficulty} sub={<IntensityMeter value={a.intensity} />} />
            <KeyFact icon={CalendarRange} label="Best months" value={bestMonths(a.months)} sub={AVAILABILITY_LABELS[a.availability as keyof typeof AVAILABILITY_LABELS]} />
            <KeyFact icon={Users} label="Recommended age" value={a.minAge ?? "No stated minimum"} sub={a.minParticipants ? `Min. ${a.minParticipants}` : undefined} />
          </dl>

          {/* 5–8 · Overview */}
          <Section title="Overview" id="overview">
            <p className="font-serif text-xl leading-snug">{a.summary}</p>
            <p className="mt-4">{a.description}</p>
          </Section>

          <div className="grid gap-8 md:grid-cols-2">
            <Section title="What you'll actually do" id="what">
              <ul className="prose-atlas">{a.whatYouDo.map((x) => <li key={x}>{x}</li>)}</ul>
            </Section>
            <Section title="Step by step" id="steps">
              <ol className="space-y-3">
                {a.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-ink tabular-nums">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {/* 11–17 · Safety, skills, season, weather, group */}
          <Section title="Safety & requirements" id="safety">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-4">
                <h3 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold"><ShieldCheck className="size-4 text-brand-2" /> Safety requirements</h3>
                <ul className="prose-atlas text-sm">{a.safety.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div className="space-y-3">
                <InfoRow label="Physical difficulty" value={`${DIFFICULTY_LABELS[a.difficulty as keyof typeof DIFFICULTY_LABELS] ?? a.difficulty} · intensity ${a.intensity}/5`} />
                <InfoRow label="Skills needed" value={a.skills} />
                <InfoRow label="Recommended age" value={a.minAge ?? "Not specified by providers we reviewed"} />
                <InfoRow label="Minimum participants" value={a.minParticipants ?? "Not specified"} />
              </div>
            </div>
          </Section>

          <Section title="Seasonal availability & weather" id="season">
            <div className="rounded-md border border-line bg-surface p-4">
              <MonthStrip months={a.months} />
              <div className="mt-4 flex flex-wrap gap-2">
                <DecemberBadge status={a.decemberStatus} />
                <Badge>{AVAILABILITY_LABELS[a.availability as keyof typeof AVAILABILITY_LABELS] ?? a.availability}</Badge>
                {a.weatherDependent && <Badge icon={<CloudRain className="size-3" />}>Weather-dependent</Badge>}
              </div>
              <p className="mt-3 text-sm"><strong>December:</strong> {a.decemberNote}</p>
              {a.availability !== "year_round" && (
                <p className="mt-2 flex gap-2 text-sm text-warn"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Availability isn't guaranteed: confirm with the operator close to the date.</p>
              )}
            </div>
          </Section>

          <Section title="Group suitability" id="group">
            <div className="flex flex-wrap gap-1.5">{a.suitability.map((s) => <Badge key={s} tone="good">{SUITABILITY_LABELS[s as keyof typeof SUITABILITY_LABELS] ?? s}</Badge>)}</div>
            <p className="mt-3">{a.groupNote}</p>
          </Section>

          {/* 18–22 · Price & booking */}
          <Section title="Price, inclusions & booking" id="price">
            <div className="rounded-md border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
                <div>
                  <Price tier={a.priceTier} price={price ? { minVnd: price.minVnd, maxVnd: price.maxVnd, unit: price.unit, status: price.status } : null} size="lg" />
                  {price && <p className="mt-2 max-w-lg text-sm text-muted">{price.basis}</p>}
                </div>
                {price && (
                  <div className="text-right">
                    <DataStatusBadge status={price.status} />
                    <p className="mt-1 text-xs text-muted capitalize">{price.audience === "all" ? "All ages" : `${price.audience} price`}</p>
                    {price.validity && <p className="text-xs text-muted">{price.validity}</p>}
                  </div>
                )}
              </div>
              {price && (price.includes.length > 0 || price.excludes.length > 0 || price.extras.length > 0) && (
                <div className="grid gap-5 p-5 md:grid-cols-3">
                  <PriceList title="Usually included" items={price.includes} icon={CheckCircle2} tone="text-good" />
                  <PriceList title="Not included" items={price.excludes} icon={XCircle} tone="text-bad" />
                  <PriceList title="Possible extra charges" items={price.extras} icon={CircleDollarSign} tone="text-warn" />
                </div>
              )}
              <div className="grid gap-4 border-t border-line p-5 md:grid-cols-2">
                <InfoRow label="Booking" value={a.booking} />
                <InfoRow label="Cancellation" value={a.cancellation ?? "Cancellation terms vary by operator and haven't been sourced. Ask before paying."} />
              </div>
              <p className="flex gap-2 border-t border-line bg-surface-2 px-5 py-3 text-xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Vietnam Atlas doesn't sell bookings. Prices are planning estimates unless marked verified; INR is converted at the reference rate shown in the travel guide.
              </p>
            </div>
          </Section>

          {/* 23–26 · Bring, wear, location, transport */}
          <div className="grid gap-8 md:grid-cols-2">
            <Section title="What to bring" id="bring">
              <IconList icon={Backpack} items={a.bring} />
            </Section>
            <Section title="What to wear" id="wear">
              <IconList icon={Shirt} items={a.wear} />
            </Section>
          </div>

          <Section title="Location, transport & accessibility" id="location">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="h-64 overflow-hidden rounded-md border border-line">
                <DestinationMap
                  center={{ lat, lng, name: attraction?.name ?? d.name }}
                  attractions={nearbyAttractions.filter((n) => n.lat && n.lng).map((n) => ({ id: n.id, name: n.name, lat: n.lat!, lng: n.lng!, slug: n.slug, kind: n.kind }))}
                />
              </div>
              <div className="space-y-3">
                <InfoRow icon={Bus} label="Getting there" value={a.transport} />
                <InfoRow label="Accessibility" value={a.accessibility} />
              </div>
            </div>
          </Section>

          {/* 27 · Nearby attractions */}
          {nearbyAttractions.length > 0 && (
            <Section title={`Nearby in ${d.name}`} id="nearby">
              <ul className="grid gap-2 sm:grid-cols-2">
                {nearbyAttractions.map((n) => (
                  <li key={n.id}>
                    <Link href={`/attractions/${n.slug}`} className="flex items-center justify-between rounded-sm border border-line bg-surface px-3 py-2.5 text-sm hover:border-ink">
                      <span>{n.name}</span>
                      <span className="text-xs text-muted">{n.isFree ? "Free" : n.distanceFromCentre}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 31 · Reviews */}
          <Section title="Reviews & ratings" id="reviews">
            {reviews.length ? (
              <ul className="space-y-3">
                {reviews.map(({ r, name }) => (
                  <li key={r.id} className="rounded-md border border-line bg-surface p-4 text-sm">
                    <p className="font-semibold">{"★".repeat(r.rating)}<span className="text-line-strong">{"★".repeat(5 - r.rating)}</span> · {name}</p>
                    <p className="mt-1">{r.body}</p>
                    <p className="mt-1 text-xs text-muted">Community review{r.visitedOn ? ` · visited ${r.visitedOn}` : ""} · moderated, not verified</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No reviews yet. Vietnam Atlas never shows ratings it can't source, and never fabricates reviews.</p>
            )}
            <ReviewForm activityId={a.id} />
          </Section>

          {/* 32–33 · Providers & sources */}
          <Section title="Official provider links" id="providers">
            {a.providerLinks.length ? (
              <ul className="flex flex-wrap gap-2">
                {a.providerLinks.map((p) => (
                  <li key={p.url}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-ink">
                      {p.name} <ExternalLink className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No verified official provider is listed. Book through licensed local operators or your accommodation, and check reviews independently.</p>
            )}
          </Section>
          <div className="mt-10">
            <SourceList sources={sources} />
          </div>
        </div>

        {/* Sticky purchase-style panel */}
        <aside className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-md border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <Price tier={a.priceTier} price={card?.price ?? null} size="lg" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                <DecemberBadge status={a.decemberStatus} />
                {a.weatherDependent && <Badge icon={<CloudRain className="size-3" />}>Weather-dependent</Badge>}
              </div>
              <p className="mt-3 text-sm text-muted">{a.durationText} · {DIFFICULTY_LABELS[a.difficulty as keyof typeof DIFFICULTY_LABELS]}</p>
              <div className="mt-5">
                <ActivityActionPanel activityId={a.id} title={a.title} slug={a.slug} summary={a.summary} myVote={(myVote as never) ?? null} candidateId={candidateId} />
              </div>
            </div>
            {freeAlternatives.length > 0 && (
              <div className="rounded-md border border-good/30 bg-good-soft/50 p-4">
                <p className="mb-2 text-sm font-semibold">Free alternatives</p>
                <ul className="space-y-1.5 text-sm">
                  {freeAlternatives.map((f) => (
                    <li key={f.id}><Link href={`/experiences/${f.slug}`} className="hover:underline">{f.title}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 28–29 · Alternatives */}
      {(paidAlternatives.length > 0 || related.length > 0) && (
        <section className="mt-16">
          <h2 className="mb-6 text-3xl">{paidAlternatives.length ? "Related paid alternatives" : `More in ${d.name}`}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(paidAlternatives.length ? paidAlternatives : related).slice(0, 4).map((x) => <ActivityCard key={x.id} a={x} />)}
          </div>
        </section>
      )}
      {freeAlternatives.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-3xl">Free alternative experiences</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {freeAlternatives.slice(0, 4).map((x) => <ActivityCard key={x.id} a={x} />)}
          </div>
        </section>
      )}
    </article>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="mb-4 text-2xl">{title}</h2>
      <div className="text-[0.98rem] text-ink/90">{children}</div>
    </section>
  );
}

function KeyFact({ icon: Icon, label, value, sub }: { icon: typeof Clock; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-surface p-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted"><Icon className="size-3.5" />{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
      {sub && <dd className="mt-1 text-xs text-muted">{sub}</dd>}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Clock }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{Icon && <Icon className="size-3.5" />}{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function PriceList({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: typeof Clock; tone: string }) {
  if (!items.length) return <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-muted">Not specified</p></div>;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><Icon className={cn("mt-0.5 size-4 shrink-0", tone)} />{i}</li>
        ))}
      </ul>
    </div>
  );
}

function IconList({ items, icon: Icon }: { items: string[]; icon: typeof Clock }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2.5 text-sm"><Icon className="mt-0.5 size-4 shrink-0 text-brand-2" />{i}</li>
      ))}
    </ul>
  );
}
