/**
 * Intelligent planning alerts (spec §11). Pure function: takes a plan snapshot, returns
 * recommendations. It never modifies the plan.
 */
import { haversineKm, toMinutes } from "./utils";

export type AlertSeverity = "critical" | "warning" | "info";

export interface PlanAlert {
  id: string;
  kind:
    | "overlap"
    | "overloaded_day"
    | "closed"
    | "weather"
    | "over_budget"
    | "too_many_destinations"
    | "overnight_recovery"
    | "detour"
    | "far_from_base"
    | "fixed_transport_conflict"
    | "season";
  severity: AlertSeverity;
  date?: string;
  itemIds: string[];
  title: string;
  message: string;
  recommendation: string;
}

export interface PlanPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface PlanItem {
  id: string;
  title: string;
  type: string;
  startTime: string | null;
  durationMin: number | null;
  activity?: {
    weatherDependent: boolean;
    decemberStatus: string;
    availability: string;
    months: string;
    intensity: number;
    destination?: PlanPlace | null;
  } | null;
}

export interface PlanDay {
  date: string;
  destination: PlanPlace | null;
  items: PlanItem[];
}

export interface PlanLeg {
  id: string;
  label: string;
  departAt: string | null; // YYYY-MM-DDTHH:MM local
  arriveAt: string | null;
  durationMin: number | null;
  overnight: boolean;
  isFixed: boolean;
}

export interface PlanSnapshot {
  days: PlanDay[];
  legs: PlanLeg[];
  perPersonPlannedVnd?: number;
  targetPerPersonVnd?: number | null;
}

const MAX_ACTIVE_MIN = 12 * 60;

function windowOf(item: PlanItem) {
  const start = toMinutes(item.startTime);
  if (start == null) return null;
  return { start, end: start + (item.durationMin ?? 60) };
}

function legWindowOnDate(leg: PlanLeg, date: string) {
  if (!leg.departAt && !leg.arriveAt) return null;
  const depDate = leg.departAt?.slice(0, 10);
  const arrDate = leg.arriveAt?.slice(0, 10);
  const dep = leg.departAt ? toMinutes(leg.departAt.slice(11, 16)) : null;
  let arr = leg.arriveAt ? toMinutes(leg.arriveAt.slice(11, 16)) : null;
  if (arr == null && dep != null && leg.durationMin) arr = dep + leg.durationMin;
  if (depDate === date && arrDate === date && dep != null && arr != null) return { start: dep, end: arr };
  if (depDate === date && dep != null && arrDate !== date) return { start: dep, end: 24 * 60 };
  if (arrDate === date && arr != null && depDate !== date) return { start: 0, end: arr };
  if (depDate === date && dep != null && arr != null && !arrDate) return { start: dep, end: arr };
  return null;
}

export function computePlanAlerts(plan: PlanSnapshot): PlanAlert[] {
  const alerts: PlanAlert[] = [];

  for (const day of plan.days) {
    const month = Number(day.date.slice(5, 7)) - 1;
    const timed = day.items
      .map((i) => ({ i, w: windowOf(i) }))
      .filter((x): x is { i: PlanItem; w: { start: number; end: number } } => !!x.w)
      .sort((a, b) => a.w.start - b.w.start);

    // 1. Overlaps between timed items.
    for (let a = 0; a < timed.length; a++) {
      for (let b = a + 1; b < timed.length; b++) {
        if (timed[b]!.w.start < timed[a]!.w.end) {
          alerts.push({
            id: `overlap:${timed[a]!.i.id}:${timed[b]!.i.id}`,
            kind: "overlap",
            severity: "critical",
            date: day.date,
            itemIds: [timed[a]!.i.id, timed[b]!.i.id],
            title: "Two plans overlap",
            message: `“${timed[a]!.i.title}” and “${timed[b]!.i.title}” overlap in time.`,
            recommendation: "Move one to a different start time or another day.",
          });
        }
      }
    }

    // 2. Conflicts with fixed / timed transport on this day.
    for (const leg of plan.legs) {
      const lw = legWindowOnDate(leg, day.date);
      if (!lw) continue;
      for (const { i, w } of timed) {
        if (i.type === "transport") continue;
        // Allow a 60-minute buffer around flights.
        const buffer = leg.isFixed ? 120 : 30;
        if (w.start < lw.end + buffer && w.end > lw.start - buffer) {
          alerts.push({
            id: `transport:${leg.id}:${i.id}`,
            kind: "fixed_transport_conflict",
            severity: leg.isFixed ? "critical" : "warning",
            date: day.date,
            itemIds: [i.id],
            title: leg.isFixed ? "Clashes with a booked flight" : "Clashes with a transfer",
            message: `“${i.title}” is too close to ${leg.label}.`,
            recommendation: leg.isFixed
              ? "Keep at least two hours clear around booked flights (more for international departures)."
              : "Adjust the activity or transfer time so they don't overlap.",
          });
        }
      }
    }

    // 3. Overloaded day.
    const activeMin = day.items.reduce((s, i) => s + (i.type === "accommodation" || i.type === "note" ? 0 : i.durationMin ?? 0), 0);
    if (activeMin > MAX_ACTIVE_MIN) {
      alerts.push({
        id: `overload:${day.date}`,
        kind: "overloaded_day",
        severity: "warning",
        date: day.date,
        itemIds: day.items.map((i) => i.id),
        title: "This day looks unrealistic",
        message: `About ${Math.round(activeMin / 60)} hours of activities and travel are planned.`,
        recommendation: "Move something to a lighter day or drop an optional activity.",
      });
    }

    for (const item of day.items) {
      const a = item.activity;
      if (!a) continue;
      const monthScore = Number(a.months[month] ?? "2");
      if (a.availability === "temporarily_closed" || (month === 11 && a.decemberStatus === "closed")) {
        alerts.push({
          id: `closed:${item.id}`,
          kind: "closed",
          severity: "critical",
          date: day.date,
          itemIds: [item.id],
          title: "Likely closed on this date",
          message: `“${item.title}” is not expected to operate at this time of year.`,
          recommendation: "Choose an alternative from the activity page's “Free / paid alternatives”.",
        });
      } else if (monthScore === 0 || (month === 11 && a.decemberStatus === "poor")) {
        alerts.push({
          id: `season:${item.id}`,
          kind: "season",
          severity: "warning",
          date: day.date,
          itemIds: [item.id],
          title: "Poor season for this activity",
          message: `Conditions for “${item.title}” are usually poor in this month.`,
          recommendation: "Keep it optional and have a backup plan.",
        });
      }
      if (a.weatherDependent) {
        alerts.push({
          id: `weather:${item.id}`,
          kind: "weather",
          severity: "info",
          date: day.date,
          itemIds: [item.id],
          title: "Weather-dependent",
          message: `“${item.title}” may be cancelled in bad weather or rough seas.`,
          recommendation: "Avoid scheduling it on the last day in a destination so there is room to reschedule.",
        });
      }
      if (day.destination && a.destination) {
        const km = haversineKm(day.destination, a.destination);
        if (km > 80) {
          alerts.push({
            id: `far:${item.id}`,
            kind: "far_from_base",
            severity: "warning",
            date: day.date,
            itemIds: [item.id],
            title: "Far from the day's base",
            message: `“${item.title}” is in ${a.destination.name}, about ${Math.round(km)} km from ${day.destination.name}.`,
            recommendation: "Move it to a day based in that destination, or plan the transfer time.",
          });
        }
      }
    }
  }

  // 4. Overnight journeys followed by a heavy day.
  for (const leg of plan.legs) {
    if (!leg.overnight || !leg.arriveAt) continue;
    const arrivalDate = leg.arriveAt.slice(0, 10);
    const day = plan.days.find((d) => d.date === arrivalDate);
    if (!day) continue;
    const heavy = day.items.filter((i) => (i.activity?.intensity ?? 0) >= 4);
    const load = day.items.reduce((s, i) => s + (i.durationMin ?? 0), 0);
    if (heavy.length || load > 8 * 60) {
      alerts.push({
        id: `recovery:${leg.id}`,
        kind: "overnight_recovery",
        severity: "warning",
        date: arrivalDate,
        itemIds: heavy.map((h) => h.id),
        title: "Recovery time after an overnight journey",
        message: `You arrive on ${leg.label} after an overnight trip and the day is ${heavy.length ? "physically demanding" : "very full"}.`,
        recommendation: "Keep the morning light or start strenuous activities the next day.",
      });
    }
  }

  // 5. Route shape: too many destinations / detours.
  const sequence: PlanPlace[] = [];
  for (const d of plan.days) {
    if (!d.destination) continue;
    if (sequence.at(-1)?.id !== d.destination.id) sequence.push(d.destination);
  }
  const distinct = new Set(sequence.map((s) => s.id)).size;
  if (plan.days.length > 0 && sequence.length >= 5 && plan.days.length / sequence.length < 2) {
    alerts.push({
      id: "route:too-many",
      kind: "too_many_destinations",
      severity: "warning",
      itemIds: [],
      title: "Too many stops for the time available",
      message: `${distinct} destinations and ${sequence.length - 1} moves in ${plan.days.length} days: under two days per stop on average.`,
      recommendation: "Drop or merge a stop; every move typically costs half a day.",
    });
  }
  for (let i = 1; i < sequence.length - 1; i++) {
    const a = sequence[i - 1]!,
      b = sequence[i]!,
      c = sequence[i + 1]!;
    // Out-and-back excursions (A → B → A) are deliberate, not detours.
    if (a.id === c.id) continue;
    const direct = haversineKm(a, c);
    const via = haversineKm(a, b) + haversineKm(b, c);
    if (via - direct > 350 && via > direct * 1.6) {
      alerts.push({
        id: `detour:${b.id}:${i}`,
        kind: "detour",
        severity: "info",
        itemIds: [],
        title: `${b.name} is a significant detour`,
        message: `Going ${a.name} → ${b.name} → ${c.name} adds roughly ${Math.round(via - direct)} km compared with travelling direct.`,
        recommendation: "Check whether the order of stops can be rearranged to reduce backtracking.",
      });
    }
  }

  // 6. Budget.
  if (plan.targetPerPersonVnd && plan.perPersonPlannedVnd && plan.perPersonPlannedVnd > plan.targetPerPersonVnd) {
    alerts.push({
      id: "budget:over",
      kind: "over_budget",
      severity: "warning",
      itemIds: [],
      title: "Over the per-person budget",
      message: "The current plan is above the target budget per person.",
      recommendation: "Review the budget page: swap paid activities for free alternatives or switch the spending scenario.",
    });
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((x, y) => order[x.severity] - order[y.severity] || (x.date ?? "").localeCompare(y.date ?? ""));
}
