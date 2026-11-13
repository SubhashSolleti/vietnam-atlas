/**
 * Labels and descriptions for enumerations used across the catalogue.
 * Pure data: safe to import from client and server components.
 */
import type {
  ActivityCategory,
  Availability,
  DecemberStatus,
  DestinationKind,
  Difficulty,
  DurationBucket,
  PriceTier,
  Suitability,
  ThemeTag,
} from "./types";

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  adventure: "Adventure",
  water_sports: "Water sports",
  nature: "Nature",
  cultural: "Cultural",
  historical: "Historical",
  food: "Food",
  shopping: "Shopping",
  nightlife: "Nightlife",
  photography: "Photography",
  relaxation: "Relaxation",
  wildlife: "Wildlife",
  family: "Family",
  social: "Social",
  networking: "Professional networking",
};

export const THEME_LABELS: Record<ThemeTag, string> = {
  water: "Water",
  mountain: "Mountain",
  island: "Island",
  beach: "Beach",
  extreme: "Extreme",
  scenic: "Scenic",
  hidden_gem: "Hidden gem",
  heritage: "Heritage",
};

/** Homepage “Find your type of adventure”; each maps to a filter on /experiences. */
export const ADVENTURE_TYPES: {
  slug: string;
  label: string;
  description: string;
  query: Record<string, string>;
  imageQuery: string;
}[] = [
  { slug: "water", label: "Water adventures", description: "Snorkelling, kayaking, diving and island boats", query: { theme: "water" }, imageQuery: "kayak Lan Ha Bay" },
  { slug: "mountain", label: "Mountain adventures", description: "Passes, peaks, terraces and treks", query: { theme: "mountain" }, imageQuery: "Ma Pi Leng Pass" },
  { slug: "nature", label: "Nature & wildlife", description: "National parks, forests and waterfalls", query: { category: "nature" }, imageQuery: "Cuc Phuong National Park" },
  { slug: "culture", label: "Cultural experiences", description: "Temples, crafts, villages and heritage", query: { category: "cultural" }, imageQuery: "Temple of Literature Hanoi" },
  { slug: "food", label: "Food experiences", description: "Street food, markets and cooking classes", query: { category: "food" }, imageQuery: "Vietnamese street food stall" },
  { slug: "nightlife", label: "Nightlife", description: "Night markets, rooftops and live music", query: { category: "nightlife" }, imageQuery: "Bui Vien street night" },
  { slug: "island", label: "Island experiences", description: "Beaches, island-hopping and coral", query: { theme: "island" }, imageQuery: "Phu Quoc island boat" },
  { slug: "scenic", label: "Scenic photography", description: "Viewpoints, sunrises and landscapes", query: { theme: "scenic" }, imageQuery: "Hang Mua viewpoint Ninh Binh" },
  { slug: "extreme", label: "Extreme adventures", description: "Canyoning, caving and expeditions", query: { theme: "extreme" }, imageQuery: "Hang Son Doong" },
  { slug: "free", label: "Free experiences", description: "Beaches, walks, markets and viewpoints", query: { price: "free" }, imageQuery: "Hoan Kiem Lake" },
];

export const KIND_LABELS: Record<DestinationKind, string> = {
  city: "City",
  province: "Province / area",
  island: "Island",
  archipelago: "Archipelago",
  region: "Region",
  bay: "Bay",
  national_park: "National park",
  town: "Town",
  rural_area: "Rural area",
};

export const DURATION_LABELS: Record<DurationBucket, string> = {
  under_1h: "Under 1 hour",
  "1_3h": "1–3 hours",
  half_day: "Half day",
  full_day: "Full day",
  overnight: "Overnight",
  multi_day: "Multi-day",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
  extreme: "Extreme",
};

export const TIER_LABELS: Record<PriceTier, string> = {
  free: "Free",
  low: "Low-cost",
  paid: "Paid",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  year_round: "Year-round",
  seasonal: "Seasonal",
  weather_dependent: "Weather-dependent",
  temporarily_closed: "Temporarily closed",
  not_verified: "Not yet verified",
};

export const SUITABILITY_LABELS: Record<Suitability, string> = {
  couples: "Couples",
  groups: "Groups",
  solo: "Solo",
  social: "Social",
  adventure_seekers: "Adventure seekers",
};

export const DECEMBER_LABELS: Record<DecemberStatus, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  good: { label: "Good in December", tone: "good" },
  variable: { label: "Variable in December", tone: "warn" },
  poor: { label: "Poor in December", tone: "bad" },
  closed: { label: "Not operating in December", tone: "bad" },
  unknown: { label: "December status unknown", tone: "neutral" },
};

export const DATA_STATUS_LABELS: Record<string, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  verified_official: { label: "Verified · official", tone: "good" },
  verified_provider: { label: "Verified · provider", tone: "good" },
  reference: { label: "Official reference", tone: "neutral" },
  estimated: { label: "Estimate", tone: "warn" },
  community: { label: "Community source", tone: "neutral" },
  needs_verification: { label: "Needs verification", tone: "warn" },
  temporarily_unavailable: { label: "Temporarily unavailable", tone: "bad" },
};

/** INR price filter buckets (spec §16). Converted from VND at the current reference rate. */
export const PRICE_BUCKETS: { slug: string; label: string; minInr: number; maxInr: number | null }[] = [
  { slug: "free", label: "Completely free", minInr: 0, maxInr: 0 },
  { slug: "under-500", label: "Under ₹500", minInr: 1, maxInr: 500 },
  { slug: "500-1000", label: "₹500–₹1,000", minInr: 500, maxInr: 1000 },
  { slug: "1000-2500", label: "₹1,000–₹2,500", minInr: 1000, maxInr: 2500 },
  { slug: "2500-5000", label: "₹2,500–₹5,000", minInr: 2500, maxInr: 5000 },
  { slug: "5000-10000", label: "₹5,000–₹10,000", minInr: 5000, maxInr: 10000 },
  { slug: "above-10000", label: "Above ₹10,000", minInr: 10000, maxInr: null },
];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTH_SCORE_LABELS = ["Avoid", "Poor", "Good", "Excellent"] as const;

export const VOTE_LABELS = {
  must_do: "Must do",
  interested: "Interested",
  neutral: "Neutral",
  not_interested: "Not interested",
  cannot: "Can't participate",
} as const;

export const TRANSPORT_LABELS: Record<string, string> = {
  flight: "Flight",
  sleeper_bus: "Sleeper bus",
  cabin_bus: "Cabin bus",
  train: "Train",
  private_transfer: "Private transfer",
  rental_vehicle: "Rental vehicle (with driver)",
  ride_hailing: "Ride-hailing",
  boat: "Boat",
  ferry: "Ferry",
};
