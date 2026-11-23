/**
 * Where everything sits on one person's board, from the itinerary and their picks. Shared by the board, the list
 * and the personal plan, so they always agree. Pure.
 *
 *  - Base-plan activities sit on their own day, or on the day this person moved them to (an "in" pick with a day at
 *    the same place). Skipped ones ("not doing") go to Not doing.
 *  - Activities already added from picks (opt-in) sit where this person is in them; otherwise they're offered to
 *    join on their day.
 *  - Extra picks not in the itinerary yet sit on the day this person chose (or the first day at that place).
 */
import type { Pick, PickDay, PickExtra, PickItem, Vote } from "./picks-panel";
import { dayStartsAt, freeSlot } from "@/lib/personal-plans";

export const OUT_VOTES: Vote[] = ["not_interested", "cannot", "done_before"];
export const IN_VOTES: Vote[] = ["must_do", "interested"];
const isOut = (v: Vote | undefined) => !!v && OUT_VOTES.includes(v);
const isIn = (v: Vote | undefined) => !!v && IN_VOTES.includes(v);

export type PlacedActivity = {
  item: PickItem;
  /** The day it's on in the group plan. */
  homeDayId: string;
  /** Set when this person moved it here from its group-plan day. */
  movedFrom: string | null;
  /** Someone else's extra this person isn't in: offered to join. */
  joinable: boolean;
  /** When it is on this person's board: its own time, or for a moved activity the first free slot that day. */
  time: string | null;
};
export type OutActivity = { activityId: string; title: string; slug: string | null; homeDayId: string | null; destinationId: string | null; vote: Vote };
export type BoardDay = { day: PickDay; fixed: PickItem[]; activities: PlacedActivity[]; extras: PickExtra[] };

export function boardFor(days: PickDay[], extras: PickExtra[], personId: string, pickOf: (activityId: string, memberId: string) => Pick | undefined) {
  const byId = new Map(days.map((d) => [d.id, d]));
  const out: OutActivity[] = [];
  const placed = new Map<string, BoardDay>(days.map((d) => [d.id, { day: d, fixed: [], activities: [], extras: [] }]));
  const mine = (activityId: string) => pickOf(activityId, personId);

  // Activity items in the itinerary, grouped by activity (a base activity can also have copies on other days).
  const groups = new Map<string, { item: PickItem; dayId: string }[]>();
  for (const d of days)
    for (const i of d.items) {
      if (i.type !== "activity" || !i.activityId) placed.get(d.id)!.fixed.push(i);
      else groups.set(i.activityId, [...(groups.get(i.activityId) ?? []), { item: i, dayId: d.id }]);
    }

  for (const [activityId, list] of groups) {
    const p = mine(activityId);
    const home = list.find((x) => !x.item.optIn) ?? null;
    const first = home ?? list[0]!;
    if (isOut(p?.vote)) {
      out.push({ activityId, title: first.item.title, slug: first.item.slug, homeDayId: first.dayId, destinationId: byId.get(first.dayId)?.destinationId ?? null, vote: p!.vote });
      continue;
    }
    if (home) {
      const homeDay = byId.get(home.dayId)!;
      const target = p && isIn(p.vote) && p.dayId && p.dayId !== home.dayId && byId.get(p.dayId)?.destinationId === homeDay.destinationId ? p.dayId : home.dayId;
      placed.get(target)!.activities.push({ item: home.item, homeDayId: home.dayId, movedFrom: target === home.dayId ? null : home.dayId, joinable: false, time: home.item.time });
      continue;
    }
    // Added from picks only: you're in it where the itinerary (or your pick) says, else it's offered to join.
    const inIt = list.find((x) => x.item.participants === null || x.item.participants.includes(personId));
    const chosen = p && isIn(p.vote) ? (list.find((x) => x.dayId === p.dayId) ?? list[0]!) : null;
    const at = inIt ?? chosen;
    if (at) placed.get(at.dayId)!.activities.push({ item: at.item, homeDayId: at.dayId, movedFrom: null, joinable: false, time: at.item.time });
    else placed.get(list[0]!.dayId)!.activities.push({ item: list[0]!.item, homeDayId: list[0]!.dayId, movedFrom: null, joinable: true, time: list[0]!.item.time });
  }

  const ideas: PickExtra[] = [];
  for (const e of extras) {
    if (groups.has(e.activityId)) continue;
    const p = mine(e.activityId);
    if (isOut(p?.vote)) {
      out.push({ activityId: e.activityId, title: e.title, slug: e.slug, homeDayId: null, destinationId: e.destinationId, vote: p!.vote });
      continue;
    }
    if (!isIn(p?.vote)) {
      ideas.push(e);
      continue;
    }
    const at = days.filter((d) => d.destinationId === e.destinationId);
    const day = at.find((d) => d.id === p!.dayId) ?? at[0];
    if (day) placed.get(day.id)!.extras.push(e);
    else ideas.push(e);
  }

  // A moved-in activity keeps its usual time if that's free on its new day, else takes the first gap that fits
  // around the day's own plans. Then each day in time order.
  for (const b of placed.values()) {
    const taken: { startTime: string | null; durationMin: number | null }[] = [
      ...b.fixed.filter((i) => i.type !== "note" && i.type !== "accommodation" && (!i.participants || i.participants.includes(personId))).map((i) => ({ startTime: i.time, durationMin: i.durationMin })),
      ...b.activities.filter((a) => !a.movedFrom && !a.joinable).map((a) => ({ startTime: a.time, durationMin: a.item.durationMin })),
    ];
    const from = dayStartsAt(b.day.items.map((i) => ({ type: i.type, title: i.title, startTime: i.time })));
    for (const a of b.activities.filter((x) => x.movedFrom)) {
      a.time = freeSlot(taken, a.item.durationMin ?? 60, a.item.time, from);
      taken.push({ startTime: a.time, durationMin: a.item.durationMin });
    }
    b.activities.sort((a, z) => (a.time ?? "99").localeCompare(z.time ?? "99"));
  }
  return { days: days.map((d) => placed.get(d.id)!), out, ideas };
}

/** Minutes this person is busy on a day, counted the way the plan builder counts them. */
export function boardLoad(b: BoardDay, personId: string, extraMin = 0) {
  const fixed = b.fixed.reduce((s, i) => (i.type === "note" || i.type === "accommodation" || (i.participants && !i.participants.includes(personId)) ? s : s + (i.durationMin ?? 0)), 0);
  const acts = b.activities.reduce((s, a) => (a.joinable ? s : s + (a.item.durationMin ?? 0)), 0);
  return fixed + acts + b.extras.reduce((s, e) => s + e.durationMin, 0) + extraMin;
}
