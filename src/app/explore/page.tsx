import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AtlasImage } from "@/components/catalog/atlas-image";
import { DestinationRow } from "@/components/catalog/cards";
import { DestinationsMap } from "@/components/map/destinations-map";
import { ButtonLink } from "@/components/ui/button";
import { ADVENTURE_TYPES } from "@/content/taxonomy";
import { getCatalog } from "@/services/catalog";
import type { ImageRef } from "@/services/media";

export const metadata: Metadata = {
  title: "Explore Vietnam by region",
  description: "Understand Vietnam's north, centre and south (climate, highlights and destinations) before choosing where to go.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  const { regions, destinations, activities } = getCatalog();
  const top = destinations.filter((d) => !d.parentSlug);
  return (
    <div className="container-x pt-10">
      <header className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-2">Explore Vietnam</p>
          <h1 className="text-4xl md:text-6xl">A country in three acts</h1>
          <p className="mt-4 text-lg text-muted">
            Vietnam is long and narrow: the north has four seasons and mountain winters, the centre has imperial history and a distinct rainy season, the south is tropical and warm all year. Start with the region, then go deeper.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
            <div><dt className="text-xs text-muted">Destinations</dt><dd className="font-serif text-3xl tabular-nums">{top.length}</dd></div>
            <div><dt className="text-xs text-muted">Experiences</dt><dd className="font-serif text-3xl tabular-nums">{activities.length}</dd></div>
            <div><dt className="text-xs text-muted">Free experiences</dt><dd className="font-serif text-3xl tabular-nums">{activities.filter((a) => a.priceTier === "free").length}</dd></div>
          </dl>
        </div>
        <div className="h-[380px] lg:col-span-6 lg:h-[460px]">
          <DestinationsMap items={top.map((d) => ({ id: d.id, slug: d.slug, name: d.name, lat: d.lat, lng: d.lng, tagline: d.tagline, image: d.image?.src ?? null, activityCount: d.activityCount }))} />
        </div>
      </header>

      {regions.map((r, i) => {
        const dests = top.filter((d) => d.regionSlug === r.slug).sort((a, b) => b.popularity - a.popularity);
        return (
          <section key={r.slug} className="mt-24" aria-labelledby={`r-${r.slug}`}>
            <div className={`grid items-center gap-10 lg:grid-cols-12 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-2 lg:col-span-7">
                <AtlasImage image={r.image as ImageRef | null} fallbackLabel={r.name} sizes="(min-width: 1024px) 58vw, 100vw" />
              </div>
              <div className="lg:col-span-5">
                <p className="eyebrow mb-2">{dests.length} destinations</p>
                <h2 id={`r-${r.slug}`} className="text-4xl">{r.name}</h2>
                <p className="mt-2 font-serif text-xl text-muted">{r.tagline}</p>
                <p className="mt-4">{r.description}</p>
                <p className="mt-4 rounded-sm bg-surface-2 px-4 py-3 text-sm"><strong>Climate:</strong> {r.climate}</p>
                <ButtonLink href={`/explore/${r.slug}`} className="mt-6">
                  Explore {r.name} <ArrowRight className="size-4" />
                </ButtonLink>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dests.map((d) => <DestinationRow key={d.slug} d={d} />)}
            </div>
          </section>
        );
      })}

      <section className="mt-24" aria-labelledby="by-type">
        <h2 id="by-type" className="mb-6 text-3xl">Or start with what you love doing</h2>
        <ul className="flex flex-wrap gap-2">
          {ADVENTURE_TYPES.map((t) => (
            <li key={t.slug}>
              <Link href={`/experiences?${new URLSearchParams(t.query)}`} className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-ink">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
