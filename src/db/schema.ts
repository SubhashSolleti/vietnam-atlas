/**
 * Vietnam Atlas relational schema (SQLite via Drizzle).
 *
 * Conventions
 *  - UUID text primary keys, ISO-8601 text timestamps.
 *  - Small nested lists (bullets, packing lists) are JSON columns on their owning row;
 *    everything that is queried, filtered, joined or edited independently is its own table.
 *  - Money is stored as integer VND. INR is always derived from the FX settings at read time.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const now = () => new Date().toISOString();
const createdAt = () => text("created_at").notNull().$defaultFn(now);
const updatedAt = () => text("updated_at").notNull().$defaultFn(now).$onUpdateFn(now);
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

/* ───────────────────────────── Identity ───────────────────────────── */

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email"),
    passwordHash: text("password_hash"),
    displayName: text("display_name").notNull(),
    avatarColor: text("avatar_color").notNull().default("#377A61"),
    /** Platform role. Trip roles (owner/member) live on trip_members. */
    role: text("role", { enum: ["super_admin", "content_editor", "member", "visitor"] })
      .notNull()
      .default("visitor"),
    isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(true),
    theme: text("theme", { enum: ["system", "light", "dark"] }).notNull().default("system"),
    disabledAt: text("disabled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  headline: text("headline"),
  introduction: text("introduction"),
  linkedinUrl: text("linkedin_url"),
  interests: json<string[]>("interests").notNull().default(sql`'[]'`),
  updatedAt: updatedAt(),
});

/* ───────────────────────────── Catalogue ───────────────────────────── */

export const publishStatus = ["draft", "published", "archived"] as const;

export const regions = sqliteTable("regions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  climate: text("climate").notNull(),
  highlights: json<string[]>("highlights").notNull(),
  sort: integer("sort").notNull().default(0),
  imageQuery: text("image_query"),
});

export const destinations = sqliteTable(
  "destinations",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    localName: text("local_name"),
    kind: text("kind").notNull(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id),
    parentId: text("parent_id"),
    province: text("province").notNull(),
    formerProvince: text("former_province"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    tagline: text("tagline").notNull(),
    summary: text("summary").notNull(),
    intro: text("intro").notNull(),
    whySpecial: text("why_special").notNull(),
    whyVisit: json<string[]>("why_visit").notNull(),
    uniqueText: text("unique_text").notNull(),
    idealFor: json<string[]>("ideal_for").notNull(),
    daysMin: integer("days_min").notNull(),
    daysMax: integer("days_max").notNull(),
    travelStyle: text("travel_style").notNull(),
    spendingLevel: integer("spending_level").notNull(),
    adventureLevel: integer("adventure_level").notNull(),
    popularity: integer("popularity").notNull().default(50),
    highlights: json<string[]>("highlights").notNull(),
    /** 12 digits 0–3, Jan..Dec */
    months: text("months").notNull(),
    weather: text("weather").notNull(),
    decemberNote: text("december_note").notNull(),
    transportHubs: json<
      { name: string; type: string; code?: string; distanceKm?: number; note?: string }[]
    >("transport_hubs").notNull(),
    food: json<{
      dishes: { name: string; localName?: string; description: string; vegetarian: string }[];
      markets: string[];
      cafes: string[];
      experiences: string[];
      dietaryNotes: string;
    }>("food").notNull(),
    nightlife: json<{ name: string; type: string; description: string; ageNote?: string; safetyNote?: string }[]>(
      "nightlife",
    ).notNull(),
    practical: json<{
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
    }>("practical").notNull(),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: publishStatus }).notNull().default("published"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by"),
  },
  (t) => [
    uniqueIndex("destinations_slug_uq").on(t.slug),
    index("destinations_region_idx").on(t.regionId),
    index("destinations_status_idx").on(t.status),
  ],
);

export const destinationRelationships = sqliteTable(
  "destination_relationships",
  {
    fromId: text("from_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    toId: text("to_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    distanceKm: integer("distance_km"),
    travel: text("travel").notNull(),
  },
  (t) => [primaryKey({ columns: [t.fromId, t.toId] })],
);

export const attractions = sqliteTable(
  "attractions",
  {
    id: id(),
    slug: text("slug").notNull(),
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    localName: text("local_name"),
    kind: text("kind").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    description: text("description").notNull(),
    whatToSee: json<string[]>("what_to_see").notNull(),
    whatToDo: json<string[]>("what_to_do").notNull(),
    openingHoursText: text("opening_hours_text").notNull(),
    openingHoursStatus: text("opening_hours_status").notNull(),
    feeText: text("fee_text").notNull(),
    feeMinVnd: integer("fee_min_vnd"),
    feeMaxVnd: integer("fee_max_vnd"),
    feeStatus: text("fee_status").notNull(),
    visitDuration: text("visit_duration").notNull(),
    accessibility: text("accessibility").notNull(),
    distanceFromCentre: text("distance_from_centre").notNull(),
    seasonality: text("seasonality").notNull(),
    officialUrl: text("official_url"),
    booking: text("booking").notNull(),
    isFree: integer("is_free", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: publishStatus }).notNull().default("published"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by"),
  },
  (t) => [uniqueIndex("attractions_slug_uq").on(t.slug), index("attractions_dest_idx").on(t.destinationId)],
);

export const activityCategories = sqliteTable("activity_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** "category" = functional filter; "theme" = discovery theme. */
  kind: text("kind", { enum: ["category", "theme"] }).notNull(),
  description: text("description"),
  sort: integer("sort").notNull().default(0),
});

export const activities = sqliteTable(
  "activities",
  {
    id: id(),
    slug: text("slug").notNull(),
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    attractionId: text("attraction_id").references(() => attractions.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    priceTier: text("price_tier", { enum: ["free", "low", "paid"] }).notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    whatYouDo: json<string[]>("what_you_do").notNull(),
    steps: json<string[]>("steps").notNull(),
    durationBucket: text("duration_bucket").notNull(),
    durationText: text("duration_text").notNull(),
    durationHours: real("duration_hours").notNull(),
    difficulty: text("difficulty").notNull(),
    intensity: integer("intensity").notNull(),
    minAge: text("min_age"),
    skills: text("skills").notNull(),
    safety: json<string[]>("safety").notNull(),
    availability: text("availability").notNull(),
    months: text("months").notNull(),
    decemberStatus: text("december_status").notNull(),
    decemberNote: text("december_note").notNull(),
    weatherDependent: integer("weather_dependent", { mode: "boolean" }).notNull(),
    minParticipants: text("min_participants"),
    suitability: json<string[]>("suitability").notNull(),
    groupNote: text("group_note").notNull(),
    booking: text("booking").notNull(),
    cancellation: text("cancellation"),
    bring: json<string[]>("bring").notNull(),
    wear: json<string[]>("wear").notNull(),
    transport: text("transport").notNull(),
    accessibility: text("accessibility").notNull(),
    providerLinks: json<{ name: string; url: string }[]>("provider_links").notNull(),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: publishStatus }).notNull().default("published"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by"),
  },
  (t) => [
    uniqueIndex("activities_slug_uq").on(t.slug),
    index("activities_dest_idx").on(t.destinationId),
    index("activities_status_idx").on(t.status),
    index("activities_tier_idx").on(t.priceTier),
    index("activities_attraction_idx").on(t.attractionId),
  ],
);

export const activityCategoryLinks = sqliteTable(
  "activity_category_links",
  {
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => activityCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.categoryId] }), index("acl_cat_idx").on(t.categoryId)],
);

export const activityPrices = sqliteTable(
  "activity_prices",
  {
    id: id(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    minVnd: integer("min_vnd").notNull(),
    maxVnd: integer("max_vnd").notNull(),
    unit: text("unit").notNull(),
    basis: text("basis").notNull(),
    status: text("status").notNull(),
    audience: text("audience").notNull().default("adult"),
    includes: json<string[]>("includes").notNull(),
    excludes: json<string[]>("excludes").notNull(),
    extras: json<string[]>("extras").notNull(),
    validity: text("validity"),
    /** Travellers one unit covers for per_boat / per_vehicle prices (an estimate; null = one unit for the party). */
    unitCapacity: integer("unit_capacity"),
    /** Experiences sharing a bundle are the same ticket/tour: a trip budget counts the bundle once. */
    ticketBundle: text("ticket_bundle"),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
    verifiedAt: text("verified_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("prices_activity_idx").on(t.activityId),
    uniqueIndex("prices_current_uq").on(t.activityId).where(sql`is_current = 1`),
    check("prices_range_ck", sql`min_vnd >= 0 AND max_vnd >= min_vnd`),
  ],
);

export const activityAlternatives = sqliteTable(
  "activity_alternatives",
  {
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    alternativeId: text("alternative_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["free", "paid"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.alternativeId, t.type] })],
);

/* Media */

export const media = sqliteTable("media", {
  id: id(),
  /** Public path under /public, e.g. /media/phu-quoc/hero.webp, or an https URL. */
  src: text("src").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt").notNull(),
  title: text("title"),
  author: text("author"),
  license: text("license"),
  licenseUrl: text("license_url"),
  sourceUrl: text("source_url"),
  /** True when the image is a representative image, not of the exact operator/venue. */
  representative: integer("representative", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const entityMedia = sqliteTable(
  "entity_media",
  {
    id: id(),
    entityType: text("entity_type", { enum: ["region", "destination", "attraction", "activity"] }).notNull(),
    entityId: text("entity_id").notNull(),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["hero", "gallery", "card"] }).notNull().default("gallery"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("entity_media_idx").on(t.entityType, t.entityId), uniqueIndex("entity_media_uq").on(t.entityType, t.entityId, t.mediaId)],
);

/* Sources & verification */

export const sources = sqliteTable(
  "sources",
  {
    id: id(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    publisher: text("publisher").notNull(),
    kind: text("kind").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sources_url_title_uq").on(t.url, t.title)],
);

export const sourceVerifications = sqliteTable(
  "source_verifications",
  {
    id: id(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    checked: text("checked").notNull(),
    status: text("status").notNull(),
    confidence: text("confidence").notNull(),
    verifiedAt: text("verified_at").notNull(),
    verifiedBy: text("verified_by"),
  },
  (t) => [index("sv_entity_idx").on(t.entityType, t.entityId), index("sv_source_idx").on(t.sourceId)],
);

/* ───────────────────────── Personal wishlist ───────────────────────── */

export const wishlistItems = sqliteTable(
  "wishlist_items",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ["activity", "attraction", "destination"] }).notNull(),
    entityId: text("entity_id").notNull(),
    /** Personal state. Group states live on trip_candidates. */
    state: text("state", { enum: ["interested", "wishlist", "must_do", "completed", "rejected"] })
      .notNull()
      .default("wishlist"),
    priority: integer("priority").notNull().default(2),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("wishlist_uq").on(t.userId, t.entityType, t.entityId),
    index("wishlist_user_idx").on(t.userId),
  ],
);

export const comparisons = sqliteTable(
  "comparisons",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.activityId] })],
);

/* ───────────────────────────── Trips ───────────────────────────── */

export type TripSettings = {
  /** Illustrative per-person/day baselines in VND, keyed by scenario then category slug. */
  baselines?: Record<string, Record<string, number>>;
  insurancePerPersonVnd?: number;
  simPerPersonVnd?: number;
  emergencyReservePct?: number;
  includeInternationalFlights?: boolean;
};

export const trips = sqliteTable(
  "trips",
  {
    id: id(),
    name: text("name").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    travellersCount: integer("travellers_count").notNull(),
    budgetMinInr: integer("budget_min_inr"),
    budgetMaxInr: integer("budget_max_inr"),
    budgetTargetInr: integer("budget_target_inr"),
    currency: text("currency").notNull().default("INR"),
    scenario: text("scenario", { enum: ["budget", "balanced", "comfortable"] }).notNull().default("balanced"),
    votePrivacy: text("vote_privacy", { enum: ["named", "anonymous"] }).notNull().default("named"),
    inviteCode: text("invite_code").notNull(),
    description: text("description"),
    settings: json<TripSettings>("settings").notNull().default(sql`'{}'`),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("trips_invite_uq").on(t.inviteCode),
    check("trips_dates_ck", sql`end_date >= start_date`),
    check("trips_budget_ck", sql`budget_min_inr IS NULL OR budget_max_inr IS NULL OR budget_min_inr <= budget_max_inr`),
    check("trips_travellers_ck", sql`travellers_count BETWEEN 1 AND 30`),
  ],
);

export const tripMembers = sqliteTable(
  "trip_members",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    /** Null = an unclaimed seat (invited traveller who hasn't joined yet). */
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    avatarColor: text("avatar_color").notNull().default("#377A61"),
    role: text("role", { enum: ["owner", "editor", "member"] }).notNull().default("member"),
    travellerType: text("traveller_type", { enum: ["couple", "solo"] }).notNull().default("solo"),
    coupleGroup: text("couple_group"),
    sort: integer("sort").notNull().default(0),
    joinedAt: text("joined_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("members_trip_idx").on(t.tripId),
    index("members_user_idx").on(t.userId),
    uniqueIndex("members_trip_user_uq").on(t.tripId, t.userId),
  ],
);

export const tripPreferences = sqliteTable("trip_preferences", {
  memberId: text("member_id")
    .primaryKey()
    .references(() => tripMembers.id, { onDelete: "cascade" }),
  interests: json<string[]>("interests").notNull().default(sql`'[]'`),
  preferredDestinations: json<string[]>("preferred_destinations").notNull().default(sql`'[]'`),
  adventureTolerance: integer("adventure_tolerance").notNull().default(3),
  fitness: integer("fitness").notNull().default(3),
  foodPreferences: json<string[]>("food_preferences").notNull().default(sql`'[]'`),
  accommodation: text("accommodation").notNull().default("shared_property"),
  nightlife: integer("nightlife").notNull().default(3),
  budgetInr: integer("budget_inr"),
  freeVsPaid: integer("free_vs_paid").notNull().default(3),
  avoid: text("avoid"),
  updatedAt: updatedAt(),
});

export const tripCandidates = sqliteTable(
  "trip_candidates",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    addedBy: text("added_by").references(() => tripMembers.id, { onDelete: "set null" }),
    status: text("status", { enum: ["discussion", "approved", "rejected", "scheduled", "completed"] })
      .notNull()
      .default("discussion"),
    participation: text("participation", { enum: ["everyone", "optional"] }).notNull().default("optional"),
    /** Member ids taking part; null means "everyone". Drives per-person cost maths. */
    participants: json<string[] | null>("participants"),
    /** Agreed per-person price override in VND (e.g. an actual quotation). */
    agreedPriceVnd: integer("agreed_price_vnd"),
    priceIsQuote: integer("price_is_quote", { mode: "boolean" }).notNull().default(false),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("candidates_trip_activity_uq").on(t.tripId, t.activityId)],
);

export const voteValues = ["must_do", "interested", "neutral", "not_interested", "cannot"] as const;

export const groupVotes = sqliteTable(
  "group_votes",
  {
    id: id(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => tripCandidates.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => tripMembers.id, { onDelete: "cascade" }),
    vote: text("vote", { enum: voteValues }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("votes_uq").on(t.candidateId, t.memberId), index("votes_member_idx").on(t.memberId)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: id(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => tripCandidates.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => tripMembers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
    deletedAt: text("deleted_at"),
  },
  (t) => [index("comments_candidate_idx").on(t.candidateId)],
);

export const itineraryDays = sqliteTable(
  "itinerary_days",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    destinationId: text("destination_id").references(() => destinations.id, { onDelete: "set null" }),
    title: text("title"),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("days_trip_date_uq").on(t.tripId, t.date)],
);

export const transportModes = [
  "flight",
  "sleeper_bus",
  "cabin_bus",
  "train",
  "private_transfer",
  "rental_vehicle",
  "ride_hailing",
  "boat",
  "ferry",
] as const;

export const transportLegs = sqliteTable(
  "transport_legs",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    fromDestinationId: text("from_destination_id").references(() => destinations.id, { onDelete: "set null" }),
    toDestinationId: text("to_destination_id").references(() => destinations.id, { onDelete: "set null" }),
    fromLabel: text("from_label").notNull(),
    toLabel: text("to_label").notNull(),
    mode: text("mode", { enum: transportModes }).notNull(),
    /** Local wall-clock ISO without zone, e.g. 2026-12-12T15:30 (times shown in the place's local zone). */
    departAt: text("depart_at"),
    arriveAt: text("arrive_at"),
    durationMin: integer("duration_min"),
    costVnd: integer("cost_vnd").notNull().default(0),
    costMode: text("cost_mode", { enum: ["per_person", "total"] }).notNull().default("per_person"),
    participants: json<string[] | null>("participants"),
    overnight: integer("overnight", { mode: "boolean" }).notNull().default(false),
    luggageNote: text("luggage_note"),
    bookingRef: text("booking_ref"),
    /** Fixed legs (pre-booked international flights) are protected from casual edits. */
    isFixed: integer("is_fixed", { mode: "boolean" }).notNull().default(false),
    isInternational: integer("is_international", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["idea", "quoted", "booked"] }).notNull().default("idea"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("legs_trip_idx").on(t.tripId),
    check("legs_times_ck", sql`depart_at IS NULL OR arrive_at IS NULL OR arrive_at > depart_at`),
    check("legs_cost_ck", sql`cost_vnd >= 0`),
  ],
);

export const accommodations = sqliteTable(
  "accommodations",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    destinationId: text("destination_id").references(() => destinations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("airbnb"),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    costVnd: integer("cost_vnd").notNull().default(0),
    costMode: text("cost_mode", { enum: ["per_person", "total"] }).notNull().default("total"),
    participants: json<string[] | null>("participants"),
    status: text("status", { enum: ["idea", "quoted", "booked"] }).notNull().default("idea"),
    url: text("url"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("acc_trip_idx").on(t.tripId), check("acc_dates_ck", sql`check_out > check_in`), check("acc_cost_ck", sql`cost_vnd >= 0`)],
);

export const itineraryItems = sqliteTable(
  "itinerary_items",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    dayId: text("day_id")
      .notNull()
      .references(() => itineraryDays.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
    type: text("type", { enum: ["activity", "transport", "accommodation", "restaurant", "note", "free_time"] }).notNull(),
    activityId: text("activity_id").references(() => activities.id, { onDelete: "set null" }),
    transportLegId: text("transport_leg_id").references(() => transportLegs.id, { onDelete: "cascade" }),
    accommodationId: text("accommodation_id").references(() => accommodations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startTime: text("start_time"),
    durationMin: integer("duration_min"),
    costVnd: integer("cost_vnd").notNull().default(0),
    costMode: text("cost_mode", { enum: ["per_person", "total"] }).notNull().default("per_person"),
    participants: json<string[] | null>("participants"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("items_day_idx").on(t.dayId), index("items_trip_idx").on(t.tripId)],
);

export const budgetCategories = sqliteTable("budget_categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  /** Illustrative per-person per-day VND estimates by scenario; null = not a per-day category. */
  budgetPerDay: integer("budget_per_day"),
  balancedPerDay: integer("balanced_per_day"),
  comfortablePerDay: integer("comfortable_per_day"),
  sort: integer("sort").notNull().default(0),
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: id(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => budgetCategories.slug),
    label: text("label").notNull(),
    amountVnd: integer("amount_vnd").notNull(),
    costMode: text("cost_mode", { enum: ["per_person", "total"] }).notNull().default("total"),
    participants: json<string[] | null>("participants"),
    destinationId: text("destination_id").references(() => destinations.id, { onDelete: "set null" }),
    date: text("date"),
    isQuote: integer("is_quote", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("expenses_trip_idx").on(t.tripId)],
);

/* ──────────────────────── Guide & checklists ──────────────────────── */

export const guideSections = sqliteTable("guide_sections", {
  id: id(),
  slug: text("slug").notNull().unique(),
  letter: text("letter").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  icon: text("icon").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const travelGuides = sqliteTable(
  "travel_guides",
  {
    id: id(),
    sectionId: text("section_id")
      .notNull()
      .references(() => guideSections.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    keyFacts: json<{ label: string; value: string; status: string }[]>("key_facts").notNull(),
    warnings: json<string[]>("warnings").notNull(),
    lastVerified: text("last_verified").notNull(),
    sort: integer("sort").notNull().default(0),
    status: text("status", { enum: publishStatus }).notNull().default("published"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("guides_slug_uq").on(t.slug), index("guides_section_idx").on(t.sectionId)],
);

export const preparationChecklists = sqliteTable("preparation_checklists", {
  id: id(),
  list: text("list", { enum: ["preparation", "packing"] }).notNull(),
  group: text("group_slug").notNull(),
  label: text("label").notNull(),
  detail: text("detail"),
  dueDaysBefore: integer("due_days_before"),
  sort: integer("sort").notNull().default(0),
});

export const checklistProgress = sqliteTable(
  "checklist_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => preparationChecklists.id, { onDelete: "cascade" }),
    doneAt: text("done_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

/* ───────────────────────── Work & Connect ───────────────────────── */

export const eventOrganisers = sqliteTable("event_organisers", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  city: text("city").notNull(),
  description: text("description").notNull(),
  organiser: text("organiser").notNull(),
  url: text("url"),
  howToEngage: text("how_to_engage").notNull(),
  cadence: text("cadence").notNull(),
  price: text("price").notNull(),
  status: text("status").notNull(),
  publishStatus: text("publish_status", { enum: publishStatus }).notNull().default("published"),
  updatedAt: updatedAt(),
});

export const professionalEvents = sqliteTable("professional_events", {
  id: id(),
  slug: text("slug").notNull().unique(),
  organiserId: text("organiser_id").references(() => eventOrganisers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  city: text("city").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  venue: text("venue").notNull(),
  price: text("price").notNull(),
  registrationUrl: text("registration_url").notNull(),
  description: text("description").notNull(),
  organiser: text("organiser").notNull(),
  lastVerified: text("last_verified").notNull(),
  publishStatus: text("publish_status", { enum: publishStatus }).notNull().default("published"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const networkingContacts = sqliteTable(
  "networking_contacts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    role: text("role"),
    metAt: text("met_at"),
    notes: text("notes"),
    followUpDate: text("follow_up_date"),
    followedUp: integer("followed_up", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("contacts_user_idx").on(t.userId)],
);

/* ───────────────────────── Platform ───────────────────────── */

/** Community reviews. Never seeded with fabricated content. */
export const reviews = sqliteTable(
  "reviews",
  {
    id: id(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    visitedOn: text("visited_on"),
    status: text("status", { enum: ["pending", "published", "rejected"] }).notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [
    index("reviews_activity_idx").on(t.activityId),
    uniqueIndex("reviews_user_activity_uq").on(t.activityId, t.userId),
    check("reviews_rating_ck", sql`rating BETWEEN 1 AND 5`),
  ],
);

export const feedback = sqliteTable("feedback", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type", { enum: ["feedback", "correction", "group_report"] }).notNull(),
  page: text("page"),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
  createdAt: createdAt(),
});

export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: id(),
    actorId: text("actor_id"),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    diff: json<Record<string, unknown>>("diff"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
  updatedAt: updatedAt(),
  updatedBy: text("updated_by"),
});
