/**
 * Personal plans: turns everyone's picks into one itinerary that says who is doing what. Pure function, no I/O.
 *
 *  - Base-plan activities: everyone is in unless they voted Skip ("not interested"), "Can't participate" or
 *    "Already done". Nobody has to vote on everything: no vote means you're going. Someone who moved it to another
 *    day on their board (an "in" vote with that day) does it there instead: a copy on that day, just for them.
 *  - Extra picks already added (opt-in items): the people in them stay, people who said "Must do" or "I'm in" join,
 *    and people sitting it out leave. No vote doesn't put you in: one person's beach day isn't everyone's.
 *  - Extra picks (on the shortlist but not in the itinerary): added for the people who said "Must do" or "I'm in",
 *    on the day most of them dropped it on (their board), or else their least busy day at that destination. Picks with
 *    no fans, or with no matching day, are reported, not placed.
 *
 * The result is a list of changes; the caller decides whether to write them.
 */
import { SITTING_OUT, type Vote } from "./consensus";

export interface PlanMember {
  id: string;
}
export interface PlanDayInput {
  id: string;
  date: string;
  destinationId: string | null;
}
export interface PlanItemInput {
  id: string;
  dayId: string;
  type: string;
  activityId: string | null;
  durationMin: number | null;
  startTime?: string | null;
  title?: string;
  participants: string[] | null;
  /** An optional extra (added from someone's picks): only the people who want it go, not everyone by default. */
  optIn?: boolean;
}
export interface PlanPick {
  activityId: string;
  title: string;
  /** The activity's destination and its parent region destination (e.g. Ben Tre → Mekong Delta). */
  destinationIds: string[];
  durationMin: number;
  /** dayId: the day this person dropped the pick on, if any. */
  votes: { memberId: string; vote: Vote; dayId?: string | null }[];
}

export interface PlanChanges {
  /** Itinerary items whose participant list changes (null = everyone). */
  updates: { itemId: string; participants: string[] | null; going: number }[];
  /** Extra picks placed on a day. */
  additions: { activityId: string; dayId: string; date: string; title: string; durationMin: number; participants: string[] | null; startTime?: string | null; movedFrom?: string }[];
  /** Picks that couldn't be placed, and why. */
  unplaced: { activityId: string; title: string; reason: "no_day" | "day_full" }[];
  /** Base-plan items nobody is doing any more. Left in place (with nobody going) for the owner to decide. */
  nobodyGoing: string[];
}

/** A day already holding more than this many minutes of plans doesn't take extra picks. */
export const DAY_CAPACITY_MIN = 12 * 60;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Minutes a day can hold: 12 hours, less on the first day (from an hour after landing) and the last (until three
 * hours before the flight home), when those days have a timed transport item.
 */
export function dayCapacity(day: { isFirst: boolean; isLast: boolean }, items: { type: string; startTime?: string | null; durationMin?: number | null }[]) {
  const legs = items.filter((i) => i.type === "transport" && i.startTime).sort((a, b) => toMin(a.startTime!) - toMin(b.startTime!));
  let start = 8 * 60;
  let end = 23 * 60;
  const first = legs[0];
  const last = legs.at(-1);
  // A booked flight is a bare time: free from an hour after landing, until 3 hours before leaving. A transfer with
  // a length (from an itinerary PDF: "9:45 AM–12:30 PM Airport transfer & flight home") already allows for that.
  if (day.isFirst && first) start = Math.max(start, toMin(first.startTime!) + (first.durationMin ? 0 : 60));
  if (day.isLast && last) end = Math.min(end, last.durationMin ? toMin(last.startTime!) + last.durationMin : toMin(last.startTime!) - 180);
  return Math.max(0, Math.min(DAY_CAPACITY_MIN, end - start));
}

/**
 * The first start time (on a 15-minute grid, from `from` to 11 PM) when `durationMin` fits between a day's timed
 * plans, trying `preferred` first. Null when nothing fits. A moved activity keeps its usual time only if that's free.
 */
export function freeSlot(taken: { startTime?: string | null; durationMin?: number | null }[], durationMin: number, preferred?: string | null | (string | null)[], from = "08:00", until = "23:00") {
  const busy = taken.filter((t) => t.startTime).map((t) => [toMin(t.startTime!), toMin(t.startTime!) + Math.max(t.durationMin ?? 0, 1)] as const);
  const first = toMin(from);
  const last = toMin(until);
  const fits = (s: number) => s >= first && s + durationMin <= last && busy.every(([a, b]) => s + durationMin <= a || s >= b);
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  for (const p of preferred ? [preferred].flat() : []) if (p && fits(toMin(p))) return p;
  for (let s = Math.ceil(first / 15) * 15; s + durationMin <= last; s += 15) if (fits(s)) return hhmm(s);
  return null;
}

/**
 * When plans must end on the trip's last day: before the transfer to the flight home (a PDF's "9:45 AM Airport
 * transfer & flight home"), or three hours before a booked flight given as a bare time. 11 PM on other days.
 */
export function dayEndsAt(items: { type: string; startTime?: string | null; durationMin?: number | null }[], isLast: boolean) {
  const last = items.filter((i) => i.type === "transport" && i.startTime).sort((a, b) => toMin(a.startTime!) - toMin(b.startTime!)).at(-1);
  if (!isLast || !last) return "23:00";
  const end = Math.max(0, toMin(last.startTime!) - (last.durationMin ? 0 : 180));
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

/** When a day's plans can start: 8 AM, or the arrival when the day starts with one (a flight in, "Arrival & …"). */
export function dayStartsAt(items: { type: string; title?: string | null; startTime?: string | null }[]) {
  const first = items.filter((i) => i.startTime).sort((a, b) => toMin(a.startTime!) - toMin(b.startTime!))[0];
  return first && (first.type === "transport" || /\b(?:arriv|land)/i.test(first.title ?? "")) && toMin(first.startTime!) > 8 * 60 ? first.startTime! : "08:00";
}

const IN: readonly Vote[] = ["must_do", "interested"];

/** Normalise a participant list: null means everyone. */
function asParticipants(ids: string[], members: PlanMember[]) {
  return ids.length === members.length ? null : ids;
}

/** Whether two participant lists (null = everyone) share anyone. */
function overlaps(a: string[] | null, b: string[] | null) {
  return a === null || b === null || a.some((x) => b.includes(x));
}

function sameParticipants(a: string[] | null, b: string[] | null) {
  if (a === null || b === null) return a === b;
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function buildPersonalPlans(input: { members: PlanMember[]; days: PlanDayInput[]; items: PlanItemInput[]; picks: PlanPick[] }): PlanChanges {
  const { members, days, items, picks } = input;
  const changes: PlanChanges = { updates: [], additions: [], unplaced: [], nobodyGoing: [] };

  // Who is doing each item after this run (null = everyone), for working out how busy each person's day is.
  const partyOf = new Map<string, string[] | null>(items.map((i) => [i.id, i.participants]));

  // 1. Activities already in the itinerary. Each person ends up on one day for each activity (or none).
  const dayIds = new Set(days.map((d) => d.id));
  const voteOf = new Map(picks.map((p) => [p.activityId, new Map(p.votes.map((v) => [v.memberId, v]))]));
  const everyone = members.map((m) => m.id);
  const byActivity = new Map<string, PlanItemInput[]>();
  for (const i of items) if (i.type === "activity" && i.activityId) byActivity.set(i.activityId, [...(byActivity.get(i.activityId) ?? []), i]);
  const moves: PlanChanges["additions"] = [];
  for (const [activityId, list] of byActivity) {
    const votes = voteOf.get(activityId) ?? new Map<string, PlanPick["votes"][number]>();
    // The group plan's own item, if the activity is in the base plan; copies and extras are opt-in.
    const home = list.find((i) => !i.optIn) ?? null;
    const dayFor = (memberId: string): string | null => {
      const v = votes.get(memberId);
      if (v && SITTING_OUT.includes(v.vote)) return null;
      const isIn = !!v && IN.includes(v.vote);
      if (home) return isIn && v!.dayId && v!.dayId !== home.dayId && dayIds.has(v!.dayId) ? v!.dayId : home.dayId;
      // An extra already added: you stay where you are, or join it if you said you're in.
      const now = list.find((i) => (i.participants ?? everyone).includes(memberId));
      return now?.dayId ?? (isIn ? list[0]!.dayId : null);
    };
    const onDay = new Map<string, string[]>();
    for (const m of members) {
      const d = dayFor(m.id);
      if (d) onDay.set(d, [...(onDay.get(d) ?? []), m.id]);
    }
    const seen = new Set<string>();
    for (const item of list) {
      // One item per day carries the people; a duplicate on the same day is left as it is.
      if (seen.has(item.dayId)) continue;
      seen.add(item.dayId);
      const going = onDay.get(item.dayId) ?? [];
      if (!going.length) changes.nobodyGoing.push(item.id);
      const participants = asParticipants(going, members);
      partyOf.set(item.id, participants);
      if (!sameParticipants(participants, item.participants)) changes.updates.push({ itemId: item.id, participants, going: going.length });
    }
    // Days people moved it to that don't have it yet: a copy for them.
    for (const [dayId, who] of onDay) {
      if (seen.has(dayId) || !home) continue;
      const day = days.find((d) => d.id === dayId)!;
      moves.push({ activityId, dayId, date: day.date, title: home.title ?? picks.find((p) => p.activityId === activityId)?.title ?? "Activity", durationMin: home.durationMin ?? 60, participants: asParticipants(who, members), startTime: home.startTime ?? null, movedFrom: home.dayId });
    }
  }
  // A moved activity keeps its usual time if that's free in its people's day, else takes the first gap that fits
  // around what they're doing (not what they skipped), never before they arrive.
  const doing = (who: string[] | null, dayId: string) => [
    ...items.filter((x) => x.dayId === dayId && x.type !== "note" && x.type !== "accommodation" && overlaps(partyOf.get(x.id) ?? null, who)),
    ...changes.additions.filter((x) => x.dayId === dayId && overlaps(x.participants, who)),
  ];
  // A day's plans run from the arrival (if it starts with one) until the trip's last day's departure.
  const lastDayId = [...days].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.id;
  const windowOf = (dayId: string) => {
    const on = items.filter((x) => x.dayId === dayId);
    return [dayStartsAt(on), dayEndsAt(on, dayId === lastDayId)] as const;
  };
  for (const mv of moves) {
    mv.startTime = freeSlot(doing(mv.participants, mv.dayId), mv.durationMin, mv.startTime, ...windowOf(mv.dayId));
    changes.additions.push(mv);
  }

  // 2. Extra picks: placed on the least busy matching day, for the people who want them.
  const scheduled = new Set(items.filter((i) => i.activityId).map((i) => i.activityId!));
  // Minutes each person is busy each day. An extra only needs room in its fans' days: skipping VinWonders frees yours.
  const busy = new Map<string, Map<string, number>>(days.map((d) => [d.id, new Map()]));
  const addBusy = (dayId: string, who: string[], minutes: number) => {
    const day = busy.get(dayId);
    if (day) for (const id of who) day.set(id, (day.get(id) ?? 0) + minutes);
  };
  for (const i of items) if (i.type !== "note" && i.type !== "accommodation") addBusy(i.dayId, partyOf.get(i.id) ?? members.map((m) => m.id), i.durationMin ?? 0);
  for (const a of moves) addBusy(a.dayId, a.participants ?? everyone, a.durationMin);
  const loadFor = (dayId: string, who: string[]) => Math.max(0, ...who.map((id) => busy.get(dayId)?.get(id) ?? 0));
  const capacity = new Map(days.map((d, i) => [d.id, dayCapacity({ isFirst: i === 0, isLast: i === days.length - 1 }, items.filter((x) => x.dayId === d.id))]));
  const memberIds = new Set(members.map((m) => m.id));
  const wanted = picks
    .filter((p) => !scheduled.has(p.activityId))
    .map((p) => ({ p, fans: p.votes.filter((v) => IN.includes(v.vote) && memberIds.has(v.memberId)) }))
    .filter((x) => x.fans.length > 0)
    // Most wanted first, so they get the roomiest days.
    .sort((a, b) => b.fans.filter((v) => v.vote === "must_do").length - a.fans.filter((v) => v.vote === "must_do").length || b.fans.length - a.fans.length || a.p.title.localeCompare(b.p.title));
  for (const { p, fans } of wanted) {
    const options = days.filter((d) => d.destinationId && p.destinationIds.includes(d.destinationId));
    if (!options.length) {
      changes.unplaced.push({ activityId: p.activityId, title: p.title, reason: "no_day" });
      continue;
    }
    // Fans' chosen days first (most chosen wins), then the least busy, then the earliest.
    const chosen = new Map<string, number>();
    for (const f of fans) if (f.dayId) chosen.set(f.dayId, (chosen.get(f.dayId) ?? 0) + 1);
    const fanIds = fans.map((f) => f.memberId);
    const day = options
      .filter((d) => loadFor(d.id, fanIds) + p.durationMin <= (capacity.get(d.id) ?? DAY_CAPACITY_MIN))
      .sort((a, b) => (chosen.get(b.id) ?? 0) - (chosen.get(a.id) ?? 0) || loadFor(a.id, fanIds) - loadFor(b.id, fanIds) || a.date.localeCompare(b.date))[0];
    if (!day) {
      changes.unplaced.push({ activityId: p.activityId, title: p.title, reason: "day_full" });
      continue;
    }
    addBusy(day.id, fanIds, p.durationMin);
    changes.additions.push({
      activityId: p.activityId,
      dayId: day.id,
      date: day.date,
      title: p.title,
      durationMin: p.durationMin,
      // The first gap that fits in its fans' day (the owner can change it).
      startTime: freeSlot(doing(fanIds, day.id), p.durationMin, null, ...windowOf(day.id)),
      participants: asParticipants(
        members.filter((m) => fans.some((f) => f.memberId === m.id)).map((m) => m.id),
        members,
      ),
    });
  }
  return changes;
}

/** Items in one person's plan: everything for everyone, plus what they're going to. */
export function isInPlan(participants: string[] | null, memberId: string) {
  return participants === null || participants.includes(memberId);
}
