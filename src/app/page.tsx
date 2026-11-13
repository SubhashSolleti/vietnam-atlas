import { ArrowRight, BedDouble, Bus, Coins, FileCheck2, HandHeart, ShieldCheck, Smartphone, Soup, UserPlus, Users, Vote, ListChecks, Route } from "lucide-react";
import Link from "next/link";
import { AtlasImage } from "@/components/catalog/atlas-image";
import { ActivityCard, DestinationCard } from "@/components/catalog/cards";
import { Price } from "@/components/catalog/price";
import { HeroParallax, HeroSearch, SeasonExplorer } from "@/components/home/home-client";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { ADVENTURE_TYPES } from "@/content/taxonomy";
import { getCatalog } from "@/services/catalog";
import type { ImageRef } from "@/services/media";
import { getSetting } from "@/services/settings";

type SiteImage = { src: string; width: number; height: number; alt: string; author: string; license: string; sourceUrl: string } | null;

const FEATURED_DESTINATIONS = ["phu-quoc", "hanoi", "ha-long-bay", "sa-pa", "ninh-binh", "da-lat", "da-nang", "hoi-an", "ho-chi-minh-city"];

/** Spec §5.5: find the named signature experiences by keyword, falling back to featured ones. */
const SIGNATURE = [
  { dest: "phu-quoc", kw: ["snorkel"] },
  { dest: "da-lat", kw: ["canyon"] },
  { dest: "phong-nha", kw: ["paradise", "cave"] },
  { dest: "sa-pa", kw: ["trek"] },
  { dest: "lan-ha-bay", kw: ["kayak"] },
  { dest: "ninh-binh", kw: ["trang-an"] },
  { dest: "ha-giang", kw: ["loop"] },
  { dest: "hoi-an", kw: ["basket"] },
];

const SMARTER = [
  { title: "Visa", text: "E-visa steps for Indian passports, ports of entry and the Phu Quoc exemption trap.", icon: FileCheck2, href: "/guide/visa-and-immigration" },
  { title: "Transportation", text: "Grab, sleeper buses, trains, domestic flights and why you shouldn't ride a motorbike.", icon: Bus, href: "/guide/transportation" },
  { title: "SIM cards", text: "Viettel, Vinaphone and Mobifone, eSIMs and passport registration.", icon: Smartphone, href: "/guide/sim-and-connectivity" },
  { title: "Currency", text: "Dong denominations, ATMs, cards and live INR/VND conversion.", icon: Coins, href: "/guide/currency-and-payments" },
  { title: "Safety", text: "Scams, traffic, adventure-operator checks and emergency numbers.", icon: ShieldCheck, href: "/guide/safety" },
  { title: "Accommodation", text: "Booking a whole property for seven, neighbourhoods and homestays.", icon: BedDouble, href: "/guide/accommodation" },
  { title: "Food", text: "What to eat, vegetarian strategies, street-food and water safety.", icon: Soup, href: "/guide/food" },
  { title: "Local etiquette", text: "Temples, photography, alcohol, drones and protected wildlife.", icon: HandHeart, href: "/guide/local-rules-and-etiquette" },
];

export default async function HomePage() {
  const { destinations, activities, regions } = await getCatalog();
  const media = await getSetting<{ hero: SiteImage; themes: Record<string, SiteImage> }>("site_media", { hero: null, themes: {} });
  const bySlug = new Map(destinations.map((d) => [d.slug, d]));
  const featuredDest = FEATURED_DESTINATIONS.map((s) => bySlug.get(s)).filter((d): d is NonNullable<typeof d> => !!d);
  const signature = SIGNATURE.map(({ dest, kw }) => activities.find((a) => a.destinationSlug === dest && kw.some((k) => a.slug.includes(k))))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .slice(0, 8);
  const sigIds = new Set(signature.map((s) => s.id));
  // Editorial rows show experiences with their own photograph and never the same picture twice.
  const shown = new Set<string>();
  const pickWithPhotos = (list: typeof activities, n: number) => {
    const out: typeof activities = [];
    for (const a of list) {
      if (out.length >= n) break;
      if (!a.image || a.image.representative || shown.has(a.image.src)) continue;
      shown.add(a.image.src);
      out.push(a);
    }
    return out;
  };
  signature.forEach((a) => a.image && shown.add(a.image.src));
  const extra = pickWithPhotos(activities.filter((a) => a.featured && !sigIds.has(a.id)), 8 - signature.length);
  const worth = [...signature, ...extra];
  const free = activities.filter((a) => a.priceTier === "free");
  const freePicks = pickWithPhotos(free.filter((a) => a.featured || a.themes.includes("scenic")), 6);
  const lowCost = activities.filter((a) => a.priceTier === "low").slice(0, 4);
  const themeCount = (q: Record<string, string>) =>
    activities.filter((a) => (q.theme ? a.themes.includes(q.theme) : q.category ? a.categories.includes(q.category) : q.price === "free" ? a.priceTier === "free" : true)).length;
  const topLevel = destinations.filter((d) => !d.parentSlug);
  const heroImg = media.hero;

  return (
    <>
      {/* 1 · Hero */}
      <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-charcoal text-white md:min-h-[92svh]" aria-labelledby="hero-title">
        <HeroParallax>
          <AtlasImage
            image={heroImg ? { ...heroImg, alt: `Limestone karsts rising from the sea in northern Vietnam, ${heroImg.alt}` } : null}
            fallbackLabel="Vietnam"
            priority
            sizes="100vw"
            credit="none"
          />
        </HeroParallax>
        <div className="hero-fade absolute inset-0" />
        <div className="container-x relative z-10 pt-32 pb-14 md:pb-20">
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-white/80 uppercase">Vietnam Atlas · {topLevel.length} destinations · {activities.length} experiences</p>
          <h1 id="hero-title" className="max-w-4xl text-[2.6rem] leading-[1.02] sm:text-6xl md:text-7xl lg:text-[5.4rem]">
            Discover the Extraordinary Vietnam.
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] text-white/85 md:text-lg">
            From island reefs to mountain passes and lantern-lit old towns, explore every region, see what things really cost and when to go, then plan the trip together with your group.
          </p>
          <div className="mt-8 flex flex-col gap-5">
            <HeroSearch />
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/explore" variant="light" size="lg">
                Explore Vietnam <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/trip" size="lg" className="border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20">
                Plan your trip
              </ButtonLink>
            </div>
          </div>
        </div>
        {heroImg && (
          <a href={heroImg.sourceUrl} target="_blank" rel="noopener noreferrer" className="absolute right-4 bottom-3 z-10 text-[0.65rem] text-white/60 hover:text-white">
            Photo: {heroImg.author} · {heroImg.license}
          </a>
        )}
      </section>

      {/* 2 · Regions */}
      <section className="container-x pt-20 md:pt-28" aria-labelledby="regions">
        <SectionHeading id="regions" eyebrow="Explore by region" title="Three regions, three very different Vietnams" action={<ButtonLink href="/explore" variant="outline">All regions</ButtonLink>}>
          Vietnam stretches 1,650 km from the Chinese border to the Gulf of Thailand. Weather, food and landscapes change completely as you travel.
        </SectionHeading>
        <div className="grid gap-5 lg:grid-cols-12">
          {regions.map((r, i) => (
            <article key={r.slug} className={`group relative overflow-hidden rounded-md bg-charcoal text-white ${i === 0 ? "aspect-[4/5] lg:col-span-5 lg:row-span-2 lg:aspect-auto" : "aspect-[16/10] lg:col-span-7"}`}>
              <AtlasImage image={r.image as ImageRef | null} fallbackLabel={r.name} sizes="(min-width: 1024px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="card-fade absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 z-[2] p-6 md:p-8">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/75 uppercase">{r.destinationCount} destinations</p>
                <h3 className="mt-1 text-3xl md:text-4xl">
                  <Link href={`/explore/${r.slug}`} className="after:absolute after:inset-0">
                    {r.name}
                  </Link>
                </h3>
                <p className="mt-2 max-w-lg text-sm text-white/85 md:text-[0.95rem]">{r.summary}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {r.highlights.slice(0, 4).map((h) => (
                    <li key={h} className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs backdrop-blur">
                      {h}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                  Explore {r.name.split(" ")[0]} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3 · Popular destinations */}
      <section className="container-x pt-24" aria-labelledby="popular">
        <SectionHeading id="popular" eyebrow="Popular destinations" title="Where travellers fall for Vietnam" action={<ButtonLink href="/destinations" variant="outline">All {topLevel.length} destinations</ButtonLink>} />
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 relative overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-6 md:gap-5 md:overflow-visible md:px-0">
          {featuredDest.map((d, i) => (
            <DestinationCard
              key={d.slug}
              d={d}
              variant={i < 3 ? "classic" : "portrait"}
              className="w-[78vw] shrink-0 snap-start sm:w-[46vw] md:col-span-2 md:w-auto"
            />
          ))}
        </div>
      </section>

      {/* 4 · Adventure types */}
      <section className="container-x pt-24" aria-labelledby="types">
        <SectionHeading id="types" eyebrow="Find your type of adventure" title="What kind of trip are you after?" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ADVENTURE_TYPES.map((t) => {
            const matches = (a: (typeof activities)[number]) =>
              t.query.theme ? a.themes.includes(t.query.theme) : t.query.category ? a.categories.includes(t.query.category) : a.priceTier === "free";
            // Fall back to a real photo from a matching experience when no theme image is configured.
            const fallback = media.themes[t.slug] ? null : pickWithPhotos(activities.filter(matches), 1)[0]?.image;
            const img = media.themes[t.slug] ?? (fallback ? { ...fallback, alt: `${t.label}${fallback.alt}` } : null);
            const qs = new URLSearchParams(t.query).toString();
            return (
              <li key={t.slug}>
                <Link href={`/experiences?${qs}`} className="group relative block aspect-[5/4] overflow-hidden rounded-md bg-charcoal text-white">
                  <AtlasImage image={img} fallbackLabel={t.label} sizes="(min-width: 1024px) 20vw, 50vw" credit="none" className="opacity-80 transition-[transform,opacity] duration-500 group-hover:scale-105 group-hover:opacity-95" />
                  <span className="card-fade absolute inset-0" />
                  <span className="absolute inset-x-0 bottom-0 p-3.5">
                    <span className="block font-serif text-lg leading-tight">{t.label}</span>
                    <span className="mt-0.5 block text-xs text-white/75">{themeCount(t.query)} experiences</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 5 · Experiences worth travelling for */}
      <section className="mt-24 bg-bg-alt py-20" aria-labelledby="worth">
        <div className="container-x">
          <SectionHeading id="worth" eyebrow="Experiences worth travelling for" title="The ones people plan whole trips around" action={<ButtonLink href="/experiences" variant="outline">Browse all experiences</ButtonLink>}>
            Each comes with honest seasonality for December, estimated prices in rupees and dong, and what you actually do on the day.
          </SectionHeading>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {worth.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* 6 · Budget */}
      <section className="container-x pt-24" aria-labelledby="budget">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-2">Discover Vietnam on a budget</p>
            <h2 id="budget" className="text-3xl md:text-[2.6rem]">
              {free.length} things to do that cost nothing
            </h2>
            <p className="mt-4 text-muted">
              Public beaches, viewpoints, night markets, walking streets and pagodas. We separate genuinely free activities from paid attractions, and show an affordable alternative on every paid experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/experiences?tier=free">All free experiences</ButtonLink>
              <ButtonLink href="/experiences?price=under-500" variant="outline">
                Under ₹500
              </ButtonLink>
            </div>
            {lowCost.length > 0 && (
              <div className="mt-8 rounded-md border border-line bg-surface p-4">
                <p className="mb-3 text-sm font-semibold">Low-cost favourites</p>
                <ul className="space-y-2.5">
                  {lowCost.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                      <Link href={`/experiences/${a.slug}`} className="hover:text-accent">
                        {a.title} <span className="text-muted">· {a.destinationName}</span>
                      </Link>
                      <Price tier={a.priceTier} price={a.price} size="sm" showStatus={false} className="shrink-0 text-right" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
            {freePicks.map((a) => (
              <li key={a.id}>
                <Link href={`/experiences/${a.slug}`} className="group block">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface-2">
                    <AtlasImage image={a.image} fallbackLabel={a.title} sizes="(min-width: 1024px) 22vw, 50vw" className="transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-2 left-2 rounded-xs bg-good px-1.5 py-0.5 text-[0.68rem] font-bold text-on-good">FREE</span>
                  </div>
                  <p className="mt-2 font-semibold group-hover:text-accent">{a.title}</p>
                  <p className="text-sm text-muted">{a.destinationName}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7 · Seasons */}
      <section className="container-x pt-24" aria-labelledby="seasons">
        <SectionHeading id="seasons" eyebrow="Seasonal travel insights" title="Where to go, month by month">
          Vietnam has several climates at once. Pick a month to see which destinations are at their best, December is pre-selected for the Cousins Trip.
        </SectionHeading>
        <SeasonExplorer destinations={topLevel.map((d) => ({ slug: d.slug, name: d.name, region: d.regionName.replace(" Vietnam", ""), months: d.months, image: d.image?.src ?? null }))} />
      </section>

      {/* 8 · Travel smarter */}
      <section className="container-x pt-24" aria-labelledby="smarter">
        <SectionHeading id="smarter" eyebrow="Travel smarter" title="Everything to sort out before you fly" action={<ButtonLink href="/guide" variant="outline">Open the A–Z guide</ButtonLink>} />
        <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {SMARTER.map((s) => (
            <li key={s.title} className="bg-surface">
              <Link href={s.href} className="group flex h-full flex-col p-5 hover:bg-surface-2">
                <s.icon className="size-6 text-brand-2" aria-hidden />
                <span className="mt-4 font-semibold">{s.title}</span>
                <span className="mt-1 text-sm text-muted">{s.text}</span>
                <span className="mt-auto pt-4 text-sm font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">Read guide →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 9 · Collaborative planning */}
      <section className="container-x pt-24" aria-labelledby="together">
        <div className="overflow-hidden rounded-lg bg-forest text-white">
          <div className="grid gap-10 p-8 md:p-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-ochre uppercase">Plan together</p>
              <h2 id="together" className="text-3xl md:text-[2.6rem]">
                Seven people. One trip. No endless group chat.
              </h2>
              <p className="mt-4 text-white/80">
                Create a trip, invite everyone with a link or code, and let each person save what excites them. Vote on the shortlist, see what's popular with couples and solo travellers, split costs by who actually takes part, and turn the decisions into a day-by-day plan.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/group/new" variant="light" size="lg">
                  Create a trip
                </ButtonLink>
                <ButtonLink href="/group" size="lg" className="border border-white/30 bg-transparent text-white hover:bg-white/10">
                  Join with an invite code
                </ButtonLink>
              </div>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {[
                { icon: UserPlus, t: "Invite the group", d: "Share a link or code. Everyone claims their seat and sets their own preferences." },
                { icon: ListChecks, t: "Shortlist", d: "Anyone can add experiences from the catalogue to the group shortlist." },
                { icon: Vote, t: "Vote & discuss", d: "Must do, interested, neutral or not for me, with comments on each option." },
                { icon: Users, t: "Find consensus", d: "See what everyone loves, what's divisive, over budget or out of season." },
                { icon: Coins, t: "Fair budgets", d: "Costs are split by who's actually going, not blindly divided by seven." },
                { icon: Route, t: "Build the itinerary", d: "Drag activities onto days, add transport and stays, catch clashes early." },
              ].map((s, i) => (
                <li key={s.t} className="rounded-md border border-white/15 bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-white/10 text-sm font-semibold tabular-nums">{i + 1}</span>
                    <s.icon className="size-5 text-ochre" aria-hidden />
                  </div>
                  <p className="mt-3 font-semibold">{s.t}</p>
                  <p className="mt-1 text-sm text-white/75">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
