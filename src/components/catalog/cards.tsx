import {
  Bike,
  Bird,
  Briefcase,
  Camera,
  Clock,
  Landmark,
  MapPin,
  Moon,
  Mountain,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ActivityCardData } from "@/lib/activity-filters";
import type { DestinationCardData } from "@/services/catalog";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, KIND_LABELS, TIER_LABELS } from "@/content/taxonomy";
import { cn } from "@/lib/utils";
import { AddToTripButton, SaveButton } from "./actions";
import { AtlasImage } from "./atlas-image";
import { bestMonths, DecemberBadge, IntensityMeter } from "./meta";
import { Price } from "./price";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  adventure: Mountain,
  water_sports: Waves,
  nature: Trees,
  cultural: Landmark,
  historical: Landmark,
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  nightlife: Moon,
  photography: Camera,
  relaxation: Sparkles,
  wildlife: Bird,
  family: Bike,
  social: PartyPopper,
  networking: Briefcase,
};

/**
 * `ownPhotosOnly` is for pages that already show the destination's or attraction's photos (their gallery):
 * there a borrowed representative photo would only repeat what is above, so the card shows its placeholder.
 */
export function ActivityCard({ a, layout = "grid", className, priority, ownPhotosOnly }: { a: ActivityCardData; layout?: "grid" | "list"; className?: string; priority?: boolean; ownPhotosOnly?: boolean }) {
  const list = layout === "list";
  const category = a.categories[0];
  const Icon = (category && CATEGORY_ICONS[category]) || Sparkles;
  const image = ownPhotosOnly && a.image?.representative ? null : a.image;
  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-card)]",
        list ? "flex-col sm:flex-row" : "flex-col",
        className,
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-surface-2", list ? "aspect-[4/3] sm:aspect-auto sm:w-64" : "aspect-[4/3]")}>
        <AtlasImage
          image={image}
          fallbackLabel={category ? `${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]} · ${a.destinationName}` : a.destinationName}
          placeholderIcon={<Icon className="size-6 opacity-70" aria-hidden />}
          sizes={list ? "(min-width: 640px) 256px, 100vw" : "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-2 left-2 z-[2] flex flex-wrap gap-1">
          <Badge tone={a.priceTier === "free" ? "good" : "dark"}>{TIER_LABELS[a.priceTier]}</Badge>
          {a.availability === "temporarily_closed" && <Badge tone="bad">Temporarily closed</Badge>}
        </div>
        <SaveButton entityType="activity" entityId={a.id} title={a.title} variant="overlay" className="absolute top-2 right-2 z-[2]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="mb-1 flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3" aria-hidden />
          {a.destinationName}
        </p>
        <h3 className="font-sans text-[1.02rem] leading-snug font-semibold">
          <Link href={`/experiences/${a.slug}`} className="after:absolute after:inset-0 after:z-[1] hover:text-accent">
            {a.title}
          </Link>
        </h3>
        <p className={cn("mt-1.5 text-sm text-muted", list ? "line-clamp-2" : "line-clamp-2")}>{a.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {a.durationText}
          </span>
          <IntensityMeter value={a.intensity} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <DecemberBadge status={a.decemberStatus} />
          <span className="text-[0.7rem] text-muted">Best: {bestMonths(a.months)}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <Price tier={a.priceTier} price={a.price} size="sm" />
          <AddToTripButton activityId={a.id} title={a.title} size="xs" variant="outline" className="relative z-[2]" />
        </div>
      </div>
    </article>
  );
}

const SPEND = ["", "₹", "₹₹", "₹₹₹", "₹₹₹₹"];

/** Editorial portrait card (4:5) used on home and directory pages. */
export function DestinationCard({ d, variant = "portrait", priority, className }: { d: DestinationCardData; variant?: "portrait" | "landscape" | "classic"; priority?: boolean; className?: string }) {
  return (
    <article className={cn("group relative overflow-hidden rounded-md bg-charcoal text-white", variant === "portrait" ? "aspect-[4/5]" : variant === "classic" ? "aspect-[4/3]" : "aspect-[3/2]", className)}>
      <AtlasImage image={d.image} fallbackLabel={d.name} priority={priority} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-700 group-hover:scale-[1.04]" />
      <div className="card-fade pointer-events-none absolute inset-0" />
      <SaveButton entityType="destination" entityId={d.id} title={d.name} variant="overlay" className="absolute top-3 right-3 z-[3]" />
      <div className="absolute top-3 left-3 z-[2] flex gap-1">
        <Badge tone="dark">{KIND_LABELS[d.kind as keyof typeof KIND_LABELS] ?? d.kind}</Badge>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[2] p-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-white/75 uppercase">{d.regionName}</p>
        <h3 className="mt-1 text-[1.65rem] leading-tight">
          <Link href={`/destinations/${d.slug}`} className="after:absolute after:inset-0 after:z-[1]">
            {d.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-white/85">{d.tagline}</p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/75">
          <span>{d.activityCount} experiences</span>
          <span>
            {d.daysMin === d.daysMax ? d.daysMin : `${d.daysMin}–${d.daysMax}`} days
          </span>
          <span aria-label={`Spending level ${d.spendingLevel} of 4`}>{SPEND[d.spendingLevel]}</span>
        </p>
      </div>
    </article>
  );
}

/** Compact horizontal destination row (lists, nearby, sidebars). */
export function DestinationRow({ d, note }: { d: DestinationCardData; note?: string }) {
  return (
    <article className="group relative flex items-center gap-4 rounded-md border border-line bg-surface p-2.5 hover:border-line-strong">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-surface-2">
        <AtlasImage image={d.image} fallbackLabel={d.name} sizes="80px" credit="none" />
      </div>
      <div className="min-w-0">
        <h3 className="font-sans font-semibold">
          <Link href={`/destinations/${d.slug}`} className="after:absolute after:inset-0 hover:text-accent">
            {d.name}
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-muted">{note ?? d.tagline}</p>
        <p className="mt-0.5 text-xs text-muted">
          {d.regionName} · {d.activityCount} experiences
        </p>
      </div>
    </article>
  );
}
