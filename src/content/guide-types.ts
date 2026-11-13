import type { DataStatus, SourceRef } from "./types";

/** "official_requirement" = law/regulation; "travel_advice" = practical guidance; "mixed" = both, clearly separated in body. */
export type GuideArticleKind = "official_requirement" | "travel_advice" | "mixed";

export interface GuideKeyFact {
  label: string;
  value: string;
  status: DataStatus;
}

export interface GuideArticle {
  slug: string;
  title: string;
  kind: GuideArticleKind;
  /** ≤ 200 chars. */
  summary: string;
  /**
   * Body in a tiny markdown subset: paragraphs separated by blank lines, "- " bullet lines,
   * "### " sub-headings, **bold**. No links in body: put links in `sources`.
   */
  body: string;
  keyFacts?: GuideKeyFact[];
  /** Optional "common mistakes" / "do & don't" bullets. */
  warnings?: string[];
  sources: SourceRef[];
  /** ISO date the content was last checked by the author, e.g. "2026-11-12". */
  lastVerified: string;
}

export interface GuideSectionSeed {
  slug: string;
  /** "A" … "J" */
  letter: string;
  title: string;
  summary: string;
  /** lucide-react icon name in PascalCase, e.g. "Plane", "Wallet", "Smartphone". */
  icon: string;
  articles: GuideArticle[];
}

export type ChecklistGroup =
  | "documents"
  | "money"
  | "health"
  | "connectivity"
  | "bookings"
  | "packing_clothing"
  | "packing_rain"
  | "packing_cold"
  | "packing_footwear"
  | "packing_swim"
  | "packing_electronics"
  | "packing_medicine";

export interface ChecklistItemSeed {
  group: ChecklistGroup;
  label: string;
  detail?: string;
  /** Days before departure this should be done, if it is a preparation task. */
  dueDaysBefore?: number;
}

export type CommunityType =
  | "developer_meetup"
  | "gdg"
  | "cloud_group"
  | "ai_ml"
  | "startup_community"
  | "hackathon"
  | "coworking"
  | "incubator"
  | "conference"
  | "founder_community"
  | "engineering_community"
  | "university";

export interface CommunitySeed {
  slug: string;
  name: string;
  type: CommunityType;
  city: "hanoi" | "ho-chi-minh-city" | "da-nang" | "nationwide";
  description: string;
  organiser: string;
  /** Official homepage / community page you are confident exists, else omit. */
  url?: string;
  howToEngage: string;
  /** e.g. "Recurring meetups: check the organiser's page for current dates". Never invent dates. */
  cadence: string;
  price: string;
  status: DataStatus;
  sources: SourceRef[];
}

/**
 * A dated event. ONLY create these from an authoritative listing you have actually read.
 * If none can be verified, export an empty array; the admin CMS can add events later.
 */
export interface ProfessionalEventSeed {
  slug: string;
  name: string;
  type: CommunityType;
  city: "hanoi" | "ho-chi-minh-city" | "da-nang" | "nationwide";
  startDate: string;
  endDate?: string;
  venue: string;
  price: string;
  registrationUrl: string;
  description: string;
  organiser: string;
  sources: SourceRef[];
  lastVerified: string;
}
