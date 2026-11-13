import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AtlasImage } from "@/components/catalog/atlas-image";
import { ActivityCard, DestinationCard } from "@/components/catalog/cards";
import { ButtonLink } from "@/components/ui/button";
import { getCatalog } from "@/services/catalog";
import type { ImageRef } from "@/services/media";

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region } = await params;
  const r = getCatalog().regions.find((x) => x.slug === region);
  return r ? { title: `${r.name}destinations & experiences`, description: r.summary, alternates: { canonical: `/explore/${r.slug}` } } : { title: "Region not found" };
}

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const { regions, destinations, activities } = getCatalog();
  const r = regions.find((x) => x.slug === region);
  if (!r) notFound();
  const dests = destinations.filter((d) => d.regionSlug === r.slug && !d.parentSlug).sort((a, b) => b.popularity - a.popularity);
  const acts = activities.filter((a) => a.regionSlug === r.slug);
  const featured = acts.filter((a) => a.featured).slice(0, 8);
  return (
    <>
      <header className="relative isolate min-h-[56svh] overflow-hidden bg-charcoal text-white">
        <AtlasImage image={r.image as ImageRef | null} fallbackLabel={r.name} priority sizes="100vw" />
        <div className="hero-fade absolute inset-0" />
        <div className="container-x relative z-10 flex min-h-[56svh] flex-col justify-end pt-24 pb-12">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/75 uppercase">{dests.length} destinations · {acts.length} experiences</p>
          <h1 className="mt-2 text-5xl md:text-7xl">{r.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/85">{r.tagline}</p>
        </div>
      </header>
      <div className="container-x pt-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <p className="text-lg lg:col-span-7">{r.description}</p>
          <div className="space-y-3 lg:col-span-5">
            <p className="rounded-md border border-line bg-surface p-4 text-sm"><strong>Climate:</strong> {r.climate}</p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/experiences?region=${r.slug}`}>All {acts.length} experiences</ButtonLink>
              <ButtonLink href={`/destinations?region=${r.slug}&view=map`} variant="outline">See on map</ButtonLink>
            </div>
          </div>
        </div>
        <h2 className="mt-16 mb-6 text-3xl">Destinations in {r.name}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dests.map((d) => <DestinationCard key={d.slug} d={d} />)}
        </div>
        {featured.length > 0 && (
          <>
            <h2 className="mt-16 mb-6 text-3xl">Signature experiences</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((a) => <ActivityCard key={a.id} a={a} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
