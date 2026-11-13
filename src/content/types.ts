/**
 * Seed-content contract for Vietnam Atlas.
 *
 * These types describe the *seed files* in src/content/catalog/*.ts.
 * The seed script normalises them into relational SQLite tables
 * (destinations, attractions, activities, activity_prices, sources, ...).
 * After seeding, the admin CMS is the source of truth, nothing in the
 * application logic depends on these literal values.
 *
 * ACCURACY RULES (non-negotiable):
 *  - Never present an unverified price, opening hour, rating or event date as verified.
 *  - Prices are ESTIMATED RANGES in VND unless status says otherwise.
 *  - If you do not know an opening hour / fee, say so in `text` and set status "needs_verification".
 *  - Only cite URLs you are highly confident exist (official domains). Do not guess deep links;
 *    prefer the official homepage of the authority/operator.
 */

export type RegionSlug = "south" | "central" | "north";

export type DestinationKind =
  | "city"
  | "province"
  | "island"
  | "archipelago"
  | "region"
  | "bay"
  | "national_park"
  | "town"
  | "rural_area";

/** Data status vocabulary from the product spec (section 18). */
export type DataStatus =
  | "verified_official"
  | "verified_provider"
  /** An authoritative source used for background; the specific details shown were not individually verified. */
  | "reference"
  | "estimated"
  | "community"
  | "needs_verification"
  | "temporarily_unavailable";

export type Confidence = "high" | "medium" | "low";

export type SourceKind =
  | "official_tourism"
  | "government"
  | "attraction_official"
  | "national_park"
  | "transport"
  | "provider"
  | "publisher"
  | "reference";

export interface SourceRef {
  title: string;
  url: string;
  publisher: string;
  kind: SourceKind;
  /** What information this source was used for, e.g. "Destination overview" or "Cable car operator". */
  checked: string;
  status: DataStatus;
  confidence: Confidence;
}

/** 0 = avoid, 1 = poor, 2 = good, 3 = excellent. Always exactly 12 entries, Jan..Dec. */
export type MonthScore = 0 | 1 | 2 | 3;

export type VegetarianFriendliness = "yes" | "no" | "adaptable";

export interface DishSeed {
  name: string;
  /** Vietnamese name with diacritics if known. */
  localName?: string;
  description: string;
  vegetarian: VegetarianFriendliness;
}

export type NightlifeType =
  | "night_market"
  | "walking_street"
  | "rooftop_bar"
  | "live_music"
  | "club"
  | "pub_crawl"
  | "social_hostel"
  | "evening_show"
  | "bar_street";

export interface NightlifeSeed {
  name: string;
  type: NightlifeType;
  description: string;
  ageNote?: string;
  safetyNote?: string;
}

export interface TransportHubSeed {
  name: string;
  type: "airport" | "railway" | "bus" | "port";
  /** IATA code for airports, if applicable. */
  code?: string;
  /** Approximate road distance to the destination centre, km. */
  distanceKm?: number;
  note?: string;
}

export interface DestinationSeed {
  slug: string;
  name: string;
  localName?: string;
  kind: DestinationKind;
  region: RegionSlug;
  /** For sub-destinations (e.g. Can Tho inside Mekong Delta). */
  parentSlug?: string;
  /** Province / centrally-run city AFTER the July 2025 administrative merger. */
  province: string;
  /** Former province name if it changed in 2025, else omit. */
  formerProvince?: string;
  lat: number;
  lng: number;
  /** ≤ 90 chars. */
  tagline: string;
  /** 1–2 sentences, used on cards. */
  summary: string;
  /** 1 rich paragraph for the hero/overview. */
  intro: string;
  whySpecial: string;
  whyVisit: string[];
  unique: string;
  idealFor: string[];
  recommendedDays: { min: number; max: number };
  travelStyle: string;
  /** 1 = very cheap … 4 = expensive (relative within Vietnam). */
  spendingLevel: 1 | 2 | 3 | 4;
  /** 1 = gentle … 4 = extreme adventure focus. */
  adventureLevel: 1 | 2 | 3 | 4;
  /** Editorial popularity 1–100 used for sorting only (not a rating). */
  popularity: number;
  highlights: string[];
  transportHubs: TransportHubSeed[];
  months: MonthScore[];
  weather: string;
  decemberNote: string;
  food: {
    dishes: DishSeed[];
    markets: string[];
    cafes: string[];
    experiences: string[];
    dietaryNotes: string;
  };
  nightlife: NightlifeSeed[];
  practical: {
    howToReach: string;
    gettingAround: string;
    localTransport: string;
    travelTimes: string;
    accommodationAreas: { name: string; description: string }[];
    safety: string[];
    packing: string[];
    regulations: string[];
    connectivity: string;
    payments: string;
    accessibility: string;
  };
  nearby: { slug: string; distanceKm: number; travel: string }[];
  /** Wikimedia Commons search phrases. First one is the hero. Provide 4–6. */
  imageQueries: string[];
  sources: SourceRef[];
}

export type AttractionKind =
  | "landmark"
  | "museum"
  | "temple"
  | "pagoda"
  | "church"
  | "beach"
  | "viewpoint"
  | "market"
  | "park"
  | "lake"
  | "cave"
  | "waterfall"
  | "heritage_site"
  | "nature_reserve"
  | "theme_park"
  | "village"
  | "island"
  | "street"
  | "bridge"
  | "mountain"
  | "farm"
  | "other";

export interface AttractionSeed {
  slug: string;
  destinationSlug: string;
  name: string;
  localName?: string;
  kind: AttractionKind;
  lat?: number;
  lng?: number;
  description: string;
  whatToSee: string[];
  whatToDo: string[];
  openingHours: { text: string; status: DataStatus };
  entranceFee: { text: string; minVnd?: number; maxVnd?: number; status: DataStatus };
  visitDuration: string;
  accessibility: string;
  distanceFromCentre: string;
  seasonality: string;
  officialUrl?: string;
  booking: string;
  isFree: boolean;
  imageQuery: string;
  sources: SourceRef[];
}

export type ActivityCategory =
  | "adventure"
  | "water_sports"
  | "nature"
  | "cultural"
  | "historical"
  | "food"
  | "shopping"
  | "nightlife"
  | "photography"
  | "relaxation"
  | "wildlife"
  | "family"
  | "social"
  | "networking";

/** Discovery themes used on the homepage “Find your type of adventure” and map filters. */
export type ThemeTag =
  | "water"
  | "mountain"
  | "island"
  | "beach"
  | "extreme"
  | "scenic"
  | "hidden_gem"
  | "heritage";

export type DurationBucket = "under_1h" | "1_3h" | "half_day" | "full_day" | "overnight" | "multi_day";
export type Difficulty = "easy" | "moderate" | "challenging" | "extreme";
export type PriceTier = "free" | "low" | "paid";
export type Availability = "year_round" | "seasonal" | "weather_dependent" | "temporarily_closed" | "not_verified";
export type Suitability = "couples" | "groups" | "solo" | "social" | "adventure_seekers";
export type PriceUnit = "per_person" | "per_group" | "per_boat" | "per_vehicle";
export type DecemberStatus = "good" | "variable" | "poor" | "closed" | "unknown";
export type ActivityKind = "activity" | "attraction_visit" | "food" | "nightlife" | "tour" | "show" | "shopping";

export interface ActivitySeed {
  slug: string;
  destinationSlug: string;
  attractionSlug?: string;
  title: string;
  kind: ActivityKind;
  categories: ActivityCategory[];
  themes: ThemeTag[];
  priceTier: PriceTier;
  /** For free activities use 0/0 with status "estimated" and basis "Free public access". */
  price: {
    minVnd: number;
    maxVnd: number;
    unit: PriceUnit;
    /** Plain-English explanation, e.g. "Typical shared-tour range seen across operators; adult price". */
    basis: string;
    status: DataStatus;
    audience?: "adult" | "child" | "all";
    includes?: string[];
    excludes?: string[];
    extras?: string[];
    validity?: string;
  };
  /** ≤ 160 chars. */
  summary: string;
  /** 3–6 sentences. */
  description: string;
  whatYouDo: string[];
  steps: string[];
  duration: { bucket: DurationBucket; text: string; hours: number };
  difficulty: Difficulty;
  /** Adventure intensity 1 (gentle) … 5 (extreme). */
  intensity: 1 | 2 | 3 | 4 | 5;
  minAge?: string;
  skills: string;
  safety: string[];
  availability: Availability;
  months: MonthScore[];
  decemberStatus: DecemberStatus;
  decemberNote: string;
  weatherDependent: boolean;
  minParticipants?: string;
  suitability: Suitability[];
  groupNote: string;
  booking: string;
  cancellation?: string;
  bring: string[];
  wear: string[];
  transport: string;
  accessibility: string;
  /** Slugs of other activities (any destination) that are free alternatives. */
  freeAlternatives: string[];
  /** Slugs of related paid alternatives. */
  paidAlternatives: string[];
  providerLinks: { name: string; url: string }[];
  /** Wikimedia Commons search phrase for a representative image. */
  imageQuery: string;
  sources: SourceRef[];
  featured?: boolean;
}

export interface DestinationBundle {
  destinations: DestinationSeed[];
  attractions: AttractionSeed[];
  activities: ActivitySeed[];
}

/** One reviewed photograph in src/content/media-manifest.json (maintained with `npm run media`). */
export interface MediaManifestEntry {
  /** "<entityType>:<slug>:<index>"index 0 (the lowest) is the entity's hero image. */
  key: string;
  /** Public path under /media. */
  file: string;
  width: number;
  height: number;
  /** Wikimedia Commons file title (without the extension). */
  title: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  /** Commons file description page. */
  sourceUrl: string;
  /** How the photo was found (Wikidata, category or search), for provenance. */
  query: string;
}
