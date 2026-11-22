import { describe, expect, it } from "vitest";
import { analyseCandidate } from "@/lib/consensus";
import { buildPersonalPlans, isInPlan, type PlanItemInput, type PlanPick } from "@/lib/personal-plans";

const members = ["subhash", "a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const days = [
  { id: "d1", date: "2026-12-12", destinationId: "pq" },
  { id: "d2", date: "2026-12-13", destinationId: "pq" },
  { id: "d3", date: "2026-12-15", destinationId: "hcm" },
];
const item = (id: string, dayId: string, activityId: string, durationMin = 120, participants: string[] | null = null): PlanItemInput => ({ id, dayId, type: "activity", activityId, durationMin, participants });
const pick = (activityId: string, votes: PlanPick["votes"], destinationIds = ["pq"], durationMin = 60): PlanPick => ({ activityId, title: activityId, destinationIds, durationMin, votes });

describe("buildPersonalPlans", () => {
  it("keeps everyone on base activities unless they skip, can't or have already done them", () => {
    const changes = buildPersonalPlans({
      members,
      days,
      items: [item("i1", "d1", "vinwonders"), item("i2", "d1", "night-market")],
      picks: [pick("vinwonders", [{ memberId: "a", vote: "done_before" }, { memberId: "b", vote: "not_interested" }, { memberId: "c", vote: "must_do" }]), pick("night-market", [{ memberId: "a", vote: "neutral" }])],
    });
    expect(changes.updates).toEqual([{ itemId: "i1", participants: ["subhash", "c", "d", "e", "f"], going: 5 }]);
    expect(changes.additions).toEqual([]);
  });

  it("resets a narrowed item back to everyone when nobody sits it out", () => {
    const changes = buildPersonalPlans({ members, days, items: [item("i1", "d1", "x", 60, ["a"])], picks: [pick("x", [])] });
    expect(changes.updates).toEqual([{ itemId: "i1", participants: null, going: 7 }]);
  });

  it("adds extra picks for their fans on the least busy day at that destination", () => {
    const changes = buildPersonalPlans({
      members,
      days,
      items: [item("i1", "d1", "vinwonders", 420)],
      picks: [pick("sea-walking", [{ memberId: "b", vote: "must_do" }, { memberId: "c", vote: "interested" }, { memberId: "a", vote: "done_before" }])],
    });
    expect(changes.additions).toEqual([{ activityId: "sea-walking", dayId: "d2", date: "2026-12-13", title: "sea-walking", durationMin: 60, participants: ["b", "c"] }]);
  });

  it("puts an extra pick on the day most of its fans dropped it on, if that day has room", () => {
    const votes = [
      { memberId: "a", vote: "interested" as const, dayId: "d1" },
      { memberId: "b", vote: "must_do" as const, dayId: "d1" },
      { memberId: "c", vote: "interested" as const, dayId: "d2" },
    ];
    // d1 is busier, but two of the three fans chose it.
    const placed = buildPersonalPlans({ members, days, items: [item("i1", "d1", "vinwonders", 240)], picks: [pick("sea-walking", votes)] });
    expect(placed.additions[0]).toMatchObject({ dayId: "d1", participants: ["a", "b", "c"] });
    // A chosen day that's already full gives way to the next best day.
    const full = buildPersonalPlans({ members, days, items: [item("i1", "d1", "vinwonders", 700)], picks: [pick("sea-walking", votes)] });
    expect(full.additions[0]).toMatchObject({ dayId: "d2" });
    // A day chosen at another place doesn't count.
    const elsewhere = buildPersonalPlans({ members, days, items: [], picks: [pick("sea-walking", [{ memberId: "a", vote: "interested", dayId: "d3" }])] });
    expect(elsewhere.additions[0]).toMatchObject({ dayId: "d1" });
  });

  it("counts only the fans' own day when checking room: skipping a long activity frees the day", () => {
    const changes = buildPersonalPlans({
      members,
      days,
      items: [item("i1", "d1", "vinwonders", 700)],
      picks: [pick("vinwonders", [{ memberId: "a", vote: "done_before" }]), pick("parasailing", [{ memberId: "a", vote: "interested", dayId: "d1" }])],
    });
    expect(changes.additions[0]).toMatchObject({ activityId: "parasailing", dayId: "d1", participants: ["a"] });
  });

  it("reports picks it can't place and items nobody is doing", () => {
    const everyoneDone = members.map((m) => ({ memberId: m.id, vote: "done_before" as const }));
    const changes = buildPersonalPlans({
      members,
      days: days.slice(0, 1),
      // Nobody does i1 any more, but everyone is still on the 10-hour i2, so their day has no room for 2 more hours.
      items: [item("i1", "d1", "full-day", 700), item("i2", "d1", "long-tour", 650)],
      picks: [pick("full-day", everyoneDone), pick("too-long", [{ memberId: "a", vote: "must_do" }], ["pq"], 120), pick("elsewhere", [{ memberId: "a", vote: "interested" }], ["hanoi"]), pick("no-fans", [{ memberId: "a", vote: "not_interested" }])],
    });
    expect(changes.nobodyGoing).toEqual(["i1"]);
    expect(changes.unplaced).toEqual([
      { activityId: "too-long", title: "too-long", reason: "day_full" },
      { activityId: "elsewhere", title: "elsewhere", reason: "no_day" },
    ]);
  });

  it("doesn't add an activity twice", () => {
    const changes = buildPersonalPlans({ members, days, items: [item("i1", "d1", "x")], picks: [pick("x", [{ memberId: "a", vote: "must_do" }])] });
    expect(changes.additions).toEqual([]);
  });
});

describe("isInPlan", () => {
  it("includes shared items and the person's own", () => {
    expect(isInPlan(null, "a")).toBe(true);
    expect(isInPlan(["a", "b"], "a")).toBe(true);
    expect(isInPlan(["b"], "a")).toBe(false);
  });
});

describe("Already done in the consensus engine", () => {
  it("takes the person out without counting against the activity", () => {
    const team = members.map((m) => ({ id: m.id, travellerType: "solo" as const }));
    const votes = [{ memberId: "a", vote: "done_before" as const }, { memberId: "b", vote: "done_before" as const }, ...["c", "d", "e"].map((m) => ({ memberId: m, vote: "interested" as const }))];
    const a = analyseCandidate({ id: "x", title: "Jet ski", votes, perPersonVnd: 1000, seasonScore: 3 }, team);
    expect(a.counts.done_before).toBe(2);
    expect(a.likelyParticipants).not.toContain("a");
    expect(a.likelyCount).toBe(5);
    expect(a.avgScore).toBe(1);
    expect(a.flags.lowInterest).toBe(false);
  });
});
