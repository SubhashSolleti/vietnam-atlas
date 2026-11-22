/**
 * Personal plans: turns everyone's picks into one itinerary that says who is doing what. Pure function, no I/O.
 *
 *  - Base-plan activities: everyone is in unless they voted Skip ("not interested"), "Can't participate" or
 *    "Already done". Nobody has to vote on everything: no vote means you're going.
 *  - Extra picks (on the shortlist but not in the itinerary): added for the people who said "Must do" or "I'm in",
 *    on the least busy day at that destination. Picks with no fans, or with no matching day, are reported, not placed.
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
  participants: string[] | null;
}
export interface PlanPick {
  activityId: string;
  title: string;
  /** The activity's destination and its parent region destination (e.g. Ben Tre → Mekong Delta). */
  destinationIds: string[];
  durationMin: number;
  votes: { memberId: string; vote: Vote }[];
}

export interface PlanChanges {
  /** Itinerary items whose participant list changes (null = everyone). */
  updates: { itemId: string; participants: string[] | null; going: number }[];
  /** Extra picks placed on a day. */
  additions: { activityId: string; dayId: string; date: string; title: string; durationMin: number; participants: string[] | null }[];
  /** Picks that couldn't be placed, and why. */
  unplaced: { activityId: string; title: string; reason: "no_day" | "day_full" }[];
  /** Base-plan items nobody is doing any more. Left in place (with nobody going) for the owner to decide. */
  nobodyGoing: string[];
}

/** A day already holding more than this many minutes of plans doesn't take extra picks. */
export const DAY_CAPACITY_MIN = 12 * 60;

const IN: readonly Vote[] = ["must_do", "interested"];

/** Normalise a participant list: null means everyone. */
function asParticipants(ids: string[], members: PlanMember[]) {
  return ids.length === members.length ? null : ids;
}

function sameParticipants(a: string[] | null, b: string[] | null) {
  if (a === null || b === null) return a === b;
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function buildPersonalPlans(input: { members: PlanMember[]; days: PlanDayInput[]; items: PlanItemInput[]; picks: PlanPick[] }): PlanChanges {
  const { members, days, items, picks } = input;
  const votesFor = new Map(picks.map((p) => [p.activityId, new Map(p.votes.map((v) => [v.memberId, v.vote]))]));
  const changes: PlanChanges = { updates: [], additions: [], unplaced: [], nobodyGoing: [] };

  // 1. Activities already in the itinerary: everyone except those sitting it out.
  for (const item of items) {
    if (item.type !== "activity" || !item.activityId) continue;
    const votes = votesFor.get(item.activityId) ?? new Map<string, Vote>();
    const going = members.filter((m) => {
      const v = votes.get(m.id);
      return !v || !SITTING_OUT.includes(v);
    });
    if (!going.length) changes.nobodyGoing.push(item.id);
    const participants = asParticipants(going.map((m) => m.id), members);
    if (!sameParticipants(participants, item.participants)) changes.updates.push({ itemId: item.id, participants, going: going.length });
  }

  // 2. Extra picks: placed on the least busy matching day, for the people who want them.
  const scheduled = new Set(items.filter((i) => i.activityId).map((i) => i.activityId!));
  const load = new Map(days.map((d) => [d.id, 0]));
  for (const i of items) if (i.type !== "note" && i.type !== "accommodation") load.set(i.dayId, (load.get(i.dayId) ?? 0) + (i.durationMin ?? 0));
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
    const day = options
      .filter((d) => (load.get(d.id) ?? 0) + p.durationMin <= DAY_CAPACITY_MIN)
      .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) || a.date.localeCompare(b.date))[0];
    if (!day) {
      changes.unplaced.push({ activityId: p.activityId, title: p.title, reason: "day_full" });
      continue;
    }
    load.set(day.id, (load.get(day.id) ?? 0) + p.durationMin);
    changes.additions.push({
      activityId: p.activityId,
      dayId: day.id,
      date: day.date,
      title: p.title,
      durationMin: p.durationMin,
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
