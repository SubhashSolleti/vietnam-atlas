import { describe, expect, it } from "vitest";
import { analyseCandidate, suggestShortlist, type ConsensusMember } from "@/lib/consensus";

const members: ConsensusMember[] = [
  { id: "c1", travellerType: "couple" }, { id: "c2", travellerType: "couple" }, { id: "c3", travellerType: "couple" }, { id: "c4", travellerType: "couple" },
  { id: "s1", travellerType: "solo" }, { id: "s2", travellerType: "solo" }, { id: "s3", travellerType: "solo" },
];

describe("analyseCandidate", () => {
  it("matches the spec example: 5 must do, 1 interested, 1 not interested", () => {
    const votes = [...["c1", "c2", "c3", "c4", "s1"].map((m) => ({ memberId: m, vote: "must_do" as const })), { memberId: "s2", vote: "interested" as const }, { memberId: "s3", vote: "not_interested" as const }];
    const a = analyseCandidate({ id: "x", title: "Four-island snorkelling", votes, perPersonVnd: 4000, seasonScore: 3 }, members);
    expect(a.counts).toMatchObject({ must_do: 5, interested: 1, not_interested: 1 });
    expect(a.likelyParticipants).toHaveLength(6);
    expect(a.estimatedGroupVnd).toBe(24_000);
    expect(a.flags.popularWithEveryone).toBe(false); // one objection
    expect(a.flags.popularWithCouples).toBe(true);
  });

  it("detects popular-with-everyone, low interest and divisive", () => {
    const all = members.map((m) => ({ memberId: m.id, vote: "interested" as const }));
    expect(analyseCandidate({ id: "x", title: "", votes: all, perPersonVnd: 1, seasonScore: 3 }, members).flags.popularWithEveryone).toBe(true);
    const low = [{ memberId: "c1", vote: "neutral" as const }, { memberId: "c2", vote: "not_interested" as const }];
    expect(analyseCandidate({ id: "x", title: "", votes: low, perPersonVnd: 1, seasonScore: 3 }, members).flags.lowInterest).toBe(true);
    const split = [{ memberId: "c1", vote: "must_do" as const }, { memberId: "c2", vote: "must_do" as const }, { memberId: "s1", vote: "cannot" as const }, { memberId: "s2", vote: "not_interested" as const }];
    expect(analyseCandidate({ id: "x", title: "", votes: split, perPersonVnd: 1, seasonScore: 3 }, members).flags.divisive).toBe(true);
  });

  it("flags season and budget problems", () => {
    const a = analyseCandidate({ id: "x", title: "", votes: [], perPersonVnd: 5000, seasonScore: 3, decemberStatus: "closed" }, members, { remainingPerPersonVnd: 1000 });
    expect(a.flags.seasonUnsuitable).toBe(true);
    expect(a.flags.exceedsBudget).toBe(true);
  });
});

describe("suggestShortlist", () => {
  it("only suggests positive, in-season items, ranked by score", () => {
    const mk = (id: string, vote: "must_do" | "interested" | "not_interested", n: number, season = 3) =>
      analyseCandidate({ id, title: id, votes: members.slice(0, n).map((m) => ({ memberId: m.id, vote })), perPersonVnd: 1, seasonScore: season }, members);
    const list = suggestShortlist([mk("a", "interested", 4), mk("b", "must_do", 6), mk("c", "not_interested", 5), mk("d", "must_do", 7, 1)]);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("analyseCandidate — consistent flags", () => {
  it("never marks an item both popular and low-interest", () => {
    const solo = ["a", "b", "c", "d", "e"].map((id) => ({ id, travellerType: "solo" as const }));
    const a = analyseCandidate({ id: "x", title: "x", votes: [{ memberId: "a", vote: "interested" }], perPersonVnd: 0, seasonScore: 3 }, solo);
    expect(a.flags.lowInterest).toBe(true);
    expect(a.flags.popularWithSolo).toBe(false);
  });
  it("lets a solo traveller's own trip get a suggested shortlist", () => {
    const a = analyseCandidate({ id: "x", title: "x", votes: [{ memberId: "a", vote: "must_do" }], perPersonVnd: 0, seasonScore: 3 }, [{ id: "a", travellerType: "solo" }]);
    expect(a.flags.lowInterest).toBe(false);
  });
});
