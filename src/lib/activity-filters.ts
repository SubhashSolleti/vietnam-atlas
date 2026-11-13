/**
 * Pure activity filtering/sorting used by /experiences, destination pages, wishlist and map.
 * All filters compose (AND across groups, OR within a multi-select group).
 */
import { PRICE_BUCKETS } from "@/content/taxonomy";
import { vndToInr } from "./money";

export interface ActivityCardData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: string;
  destinationId: string;
  destinationSlug: string;
  destinationName: string;
  regionSlug: string;
  priceTier: "free" | "low" | "paid";
  price: { minVnd: number; maxVnd: number; unit: string; status: string } | null;
  durationText: string;
  durationBucket: string;
  durationHours: number;
  difficulty: string;
  intensity: number;
  availability: string;
  decemberStatus: string;
  months: string;
  weatherDependent: boolean;
  categories: string[];
  themes: string[];
  suitability: string[];
  featured: boolean;
  lat: number | null;
  lng: number | null;
  image: { src: string; alt: string; width: number | null; height: number | null; representative: boolean; author: string | null; license: string | null; sourceUrl: string | null } | null;
}

export interface ActivityFilters {
  q?: string;
  destination?: string[];
  region?: string[];
  category?: string[];
  theme?: string[];
  price?: string[]; // PRICE_BUCKETS slugs
  tier?: string[];
  duration?: string[];
  difficulty?: string[];
  availability?: string[];
  suitability?: string[];
  month?: number | null; // 1..12 → suitability ≥ 2
  sort?: "recommended" | "price_asc" | "price_desc" | "duration" | "alpha" | "season";
}

export function normalise(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

function matchesPrice(a: ActivityCardData, buckets: string[], inrToVnd: number) {
  const minInr = a.priceTier === "free" || !a.price ? 0 : vndToInr(a.price.minVnd, { inrToVnd });
  return buckets.some((slug) => {
    const b = PRICE_BUCKETS.find((x) => x.slug === slug);
    if (!b) return false;
    if (b.slug === "free") return a.priceTier === "free";
    if (a.priceTier === "free") return false;
    return minInr >= b.minInr && (b.maxInr == null || minInr < b.maxInr);
  });
}

const any = (want: string[] | undefined, have: string[]) => !want?.length || want.some((w) => have.includes(w));
const one = (want: string[] | undefined, have: string) => !want?.length || want.includes(have);

export function filterActivities(items: ActivityCardData[], f: ActivityFilters, inrToVnd: number) {
  const terms = f.q ? normalise(f.q).split(/\s+/).filter(Boolean) : [];
  const out = items.filter((a) => {
    if (terms.length) {
      const hay = normalise(`${a.title} ${a.summary} ${a.destinationName} ${a.categories.join(" ")} ${a.themes.join(" ")}`);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    if (!one(f.destination, a.destinationSlug)) return false;
    if (!one(f.region, a.regionSlug)) return false;
    if (!any(f.category, a.categories)) return false;
    if (!any(f.theme, a.themes)) return false;
    if (!one(f.tier, a.priceTier)) return false;
    if (f.price?.length && !matchesPrice(a, f.price, inrToVnd)) return false;
    if (!one(f.duration, a.durationBucket)) return false;
    if (!one(f.difficulty, a.difficulty)) return false;
    if (f.availability?.length) {
      const tags = [a.availability];
      if (a.weatherDependent) tags.push("weather_dependent");
      if (!f.availability.some((x) => tags.includes(x))) return false;
    }
    if (!any(f.suitability, a.suitability)) return false;
    if (f.month && Number(a.months[f.month - 1] ?? "0") < 2) return false;
    return true;
  });
  return sortActivities(out, f.sort ?? "recommended", f.month ?? null);
}

export function sortActivities(items: ActivityCardData[], sort: NonNullable<ActivityFilters["sort"]>, month: number | null) {
  const priceOf = (a: ActivityCardData) => (a.priceTier === "free" || !a.price ? 0 : a.price.minVnd);
  const season = (a: ActivityCardData) => Number(a.months[(month ?? 12) - 1] ?? "0");
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => priceOf(a) - priceOf(b));
    case "price_desc":
      return copy.sort((a, b) => priceOf(b) - priceOf(a));
    case "duration":
      return copy.sort((a, b) => a.durationHours - b.durationHours);
    case "alpha":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "season":
      return copy.sort((a, b) => season(b) - season(a) || Number(b.featured) - Number(a.featured));
    default:
      return copy.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || season(b) - season(a) || a.title.localeCompare(b.title),
      );
  }
}

/** Parse URLSearchParams-like record into filters. */
export function parseActivityFilters(sp: Record<string, string | string[] | undefined>): ActivityFilters {
  const list = (k: string) => {
    const v = sp[k];
    if (!v) return undefined;
    return (Array.isArray(v) ? v : v.split(",")).filter(Boolean);
  };
  const month = Number(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) as ActivityFilters["sort"];
  return {
    q: (Array.isArray(sp.q) ? sp.q[0] : sp.q) || undefined,
    destination: list("destination"),
    region: list("region"),
    category: list("category"),
    theme: list("theme"),
    price: list("price"),
    tier: list("tier"),
    duration: list("duration"),
    difficulty: list("difficulty"),
    availability: list("availability"),
    suitability: list("suitability"),
    month: month >= 1 && month <= 12 ? month : null,
    sort: sort && ["recommended", "price_asc", "price_desc", "duration", "alpha", "season"].includes(sort) ? sort : "recommended",
  };
}
