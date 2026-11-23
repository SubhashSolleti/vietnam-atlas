import { describe, expect, it } from "vitest";
import { analyseCandidate } from "@/lib/consensus";
import { buildPersonalPlans, dayCapacity, isInPlan, type PlanItemInput, type PlanPick } from "@/lib/personal-plans";

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
    // At the first free time that day.
    expect(changes.additions).toEqual([{ activityId: "sea-walking", dayId: "d2", date: "2026-12-13", title: "sea-walking", durationMin: 60, participants: ["b", "c"], startTime: "08:00" }]);
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

  it("leaves an added extra pick alone on the next run: no vote doesn't put you in", () => {
    // Run 1 added the beach for b; run 2, with nothing new, must not give it to everyone.
    const beach = { ...item("i9", "d2", "beach", 120, ["b"]), optIn: true };
    expect(buildPersonalPlans({ members, days, items: [beach], picks: [pick("beach", [{ memberId: "b", vote: "interested" }])] }).updates).toEqual([]);
    // Someone joining in is added; the fan skipping it leaves.
    const changes = buildPersonalPlans({ members, days, items: [beach], picks: [pick("beach", [{ memberId: "b", vote: "not_interested" }, { memberId: "c", vote: "must_do" }])] });
    expect(changes.updates).toEqual([{ itemId: "i9", participants: ["c"], going: 1 }]);
  });

  it("only uses the hours before the flight home on the last day", () => {
    const flight = { id: "f", dayId: "d3", type: "transport", activityId: null, durationMin: null, startTime: "12:20", participants: null };
    const coffee = { ...item("i1", "d3", "coffee", 75), type: "free_time" };
    const changes = buildPersonalPlans({ members, days, items: [flight, coffee], picks: [pick("temple", [{ memberId: "a", vote: "interested", dayId: "d3" }], ["hcm"], 120)] });
    expect(changes.additions).toEqual([]);
    expect(changes.unplaced).toEqual([{ activityId: "temple", title: "temple", reason: "day_full" }]);
    expect(dayCapacity({ isFirst: false, isLast: true }, [{ type: "transport", startTime: "12:20" }])).toBe(80);
    expect(dayCapacity({ isFirst: true, isLast: false }, [{ type: "transport", startTime: "15:30" }])).toBe(390);
    expect(dayCapacity({ isFirst: false, isLast: false }, [{ type: "transport", startTime: "10:35" }])).toBe(720);
    // A transfer with a length (from a PDF) already allows for the airport: the day runs until it ends.
    expect(dayCapacity({ isFirst: false, isLast: true }, [{ type: "transport", startTime: "09:45", durationMin: 165 }])).toBe(270);
  });

  it("moves a base activity to another day for the people who moved it on their board", () => {
    const home = { ...item("v", "d1", "vinwonders", 420), startTime: "09:30", title: "VinWonders" };
    const changes = buildPersonalPlans({ members, days, items: [home], picks: [pick("vinwonders", [{ memberId: "a", vote: "interested", dayId: "d2" }, { memberId: "b", vote: "must_do", dayId: "d2" }])] });
    expect(changes.updates).toEqual([{ itemId: "v", participants: ["subhash", "c", "d", "e", "f"], going: 5 }]);
    expect(changes.additions).toEqual([{ activityId: "vinwonders", dayId: "d2", date: "2026-12-13", title: "VinWonders", durationMin: 420, participants: ["a", "b"], startTime: "09:30", movedFrom: "d1" }]);
  });

  it("keeps a moved copy stable on the next run, and brings people back when they move it home", () => {
    const home = { ...item("v", "d1", "vinwonders", 420, ["subhash", "c", "d", "e", "f"]), title: "VinWonders" };
    const copy = { ...item("v2", "d2", "vinwonders", 420, ["a", "b"]), optIn: true };
    const same = buildPersonalPlans({ members, days, items: [home, copy], picks: [pick("vinwonders", [{ memberId: "a", vote: "interested", dayId: "d2" }, { memberId: "b", vote: "must_do", dayId: "d2" }])] });
    expect(same.updates).toEqual([]);
    expect(same.additions).toEqual([]);
    // b moves it back to the group's day (keeping the star, no day); a is the only one left on Day 2.
    const back = buildPersonalPlans({ members, days, items: [home, copy], picks: [pick("vinwonders", [{ memberId: "a", vote: "interested", dayId: "d2" }, { memberId: "b", vote: "must_do", dayId: null }])] });
    expect(back.updates).toEqual([
      { itemId: "v", participants: ["subhash", "b", "c", "d", "e", "f"], going: 6 },
      { itemId: "v2", participants: ["a"], going: 1 },
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

describe("freeSlot", () => {
  const day = [{ startTime: "09:30", durationMin: 420 }, { startTime: "17:00", durationMin: 300 }];
  it("keeps the preferred time when it's free, else takes the first gap that fits", async () => {
    const { freeSlot } = await import("@/lib/personal-plans");
    expect(freeSlot(day, 60, "08:00")).toBe("08:00");
    expect(freeSlot(day, 60, "15:30")).toBe("08:00");
    expect(freeSlot(day, 30, "16:00")).toBe("08:00");
    expect(freeSlot(day, 30, "16:30")).toBe("16:30");
    expect(freeSlot(day, 120, "10:00")).toBeNull();
  });
});

describe("dayStartsAt", () => {
  it("starts a day at its arrival, so nothing is planned before you land", async () => {
    const { dayStartsAt, freeSlot } = await import("@/lib/personal-plans");
    const arrival = [{ type: "activity", title: "Arrival & Long Beach", startTime: "15:30", durationMin: 150 }];
    expect(dayStartsAt(arrival)).toBe("15:30");
    expect(freeSlot(arrival, 60, null, dayStartsAt(arrival))).toBe("18:00");
    expect(dayStartsAt([{ type: "transport", title: "Land at PQC", startTime: "15:30" }])).toBe("15:30");
    expect(dayStartsAt([{ type: "activity", title: "VinWonders", startTime: "09:30" }])).toBe("08:00");
  });
});

