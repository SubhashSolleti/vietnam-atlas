import type { PlanAlert } from "@/lib/planning-alerts";

export type ItemVM = {
  id: string;
  type: "activity" | "transport" | "accommodation" | "restaurant" | "note" | "free_time";
  title: string;
  startTime: string | null;
  durationMin: number | null;
  costVnd: number;
  costMode: "per_person" | "total";
  participants: string[] | null;
  notes: string | null;
  activityId: string | null;
  activitySlug: string | null;
  destinationName: string | null;
  image: string | null;
  weatherDependent: boolean;
  decemberStatus: string | null;
  transportLegId: string | null;
  isFixed: boolean;
};

export type DayVM = {
  id: string;
  date: string;
  destinationId: string | null;
  title: string | null;
  notes: string | null;
  outOfRange: boolean;
  items: ItemVM[];
};

export type LegVM = {
  id: string;
  fromDestinationId: string | null;
  toDestinationId: string | null;
  fromLabel: string;
  toLabel: string;
  fromName: string;
  toName: string;
  mode: string;
  departAt: string | null;
  arriveAt: string | null;
  durationMin: number | null;
  costVnd: number;
  costMode: "per_person" | "total";
  participants: string[] | null;
  overnight: boolean;
  luggageNote: string | null;
  bookingRef: string | null;
  isFixed: boolean;
  isInternational: boolean;
  status: "idea" | "quoted" | "booked";
  notes: string | null;
};

export type StayVM = {
  id: string;
  destinationId: string | null;
  name: string;
  type: string;
  checkIn: string;
  checkOut: string;
  costVnd: number;
  costMode: "per_person" | "total";
  participants: string[] | null;
  status: "idea" | "quoted" | "booked";
  url: string | null;
  notes: string | null;
};

export type SourceVM = { activityId: string; title: string; destinationName: string; durationMin: number; image: string | null; origin: string; scheduled: boolean };
export type MemberVM = { id: string; name: string; color: string };
export type DestVM = { id: string; name: string; slug: string; lat: number; lng: number };

export interface BuilderProps {
  tripId: string;
  canManage: boolean;
  days: DayVM[];
  legs: LegVM[];
  stays: StayVM[];
  sources: SourceVM[];
  members: MemberVM[];
  destinations: DestVM[];
  alerts: PlanAlert[];
  byDay: Record<string, number>;
  templates: { slug: string; name: string; description: string }[];
}
