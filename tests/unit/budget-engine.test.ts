import { describe, expect, it } from "vitest";
import { activityCostFromPrice, allocate, computeBudget, dedupeBundles, type BaselineCategory } from "@/lib/budget-engine";

const members = ["a", "b", "c", "d", "e", "f", "g"];
const baselines: BaselineCategory[] = [
  { slug: "accommodation", name: "Accommodation", perDay: [100, 200, 300] },
  { slug: "food", name: "Food", perDay: [10, 20, 30] },
  { slug: "domestic_flights", name: "Domestic flights", perDay: null },
];

describe("allocate", () => {
  it("charges per-person costs only to participants", () => {
    const l = allocate({ id: "x", source: "activity", category: "paid_activities", label: "Snorkel", amountVnd: 2000, costMode: "per_person", participants: ["a", "b", "c", "d", "e"], isQuote: false }, members);
    expect(l.participantIds).toHaveLength(5);
    expect(l.perParticipantVnd).toBe(2000);
    expect(l.groupTotalVnd).toBe(10_000);
    expect(l.optional).toBe(true);
  });
  it("splits shared totals equally between participants", () => {
    const l = allocate({ id: "x", source: "accommodation", category: "accommodation", label: "Villa", amountVnd: 7000, costMode: "total", participants: null, isQuote: true }, members);
    expect(l.perParticipantVnd).toBe(1000);
    expect(l.groupTotalVnd).toBe(7000);
    expect(l.shared).toBe(true);
  });
  it("charges nobody when every listed participant has left the trip (no silent re-billing)", () => {
    const l = allocate({ id: "x", source: "expense", category: "food", label: "", amountVnd: 70, costMode: "per_person", participants: ["zzz"], isQuote: false }, members);
    expect(l.participantIds).toEqual([]);
    expect(l.groupTotalVnd).toBe(0);
    expect(l.perParticipantVnd).toBe(0);
  });
  it("treats an explicit empty list as nobody", () => {
    const l = allocate({ id: "x", source: "candidate", category: "paid_activities", label: "", amountVnd: 500, costMode: "per_person", participants: [], isQuote: false }, members);
    expect(l.groupTotalVnd).toBe(0);
  });
  it("counts a duplicated participant once", () => {
    const l = allocate({ id: "x", source: "activity", category: "paid_activities", label: "", amountVnd: 100, costMode: "per_person", participants: ["a", "a"], isQuote: false }, members);
    expect(l.participantIds).toEqual(["a"]);
    expect(l.groupTotalVnd).toBe(100);
  });
});

describe("computeBudget", () => {
  const base = { memberIds: members, startDate: "2026-12-12", endDate: "2026-12-25", baselines, lines: [], coveredNights: [] as { date: string; participants: string[] | null }[], scenario: "balanced" as const };

  it("applies per-day baselines for 14 days and 13 nights", () => {
    const r = computeBudget(base);
    expect(r.days).toBe(14);
    expect(r.nights).toBe(13);
    // accommodation 200 × 13 nights + food 20 × 14 days, per person
    expect(r.perMember.a).toBe(200 * 13 + 20 * 14);
    expect(r.groupTotalVnd).toBe((200 * 13 + 20 * 14) * 7);
  });

  it("does not charge baseline accommodation for nights already covered", () => {
    const r = computeBudget({ ...base, coveredNights: ["2026-12-12", "2026-12-13", "2026-12-14"].map((date) => ({ date, participants: null })) });
    expect(r.perMember.a).toBe(200 * 10 + 20 * 14);
  });

  it("only treats nights as covered for the travellers on that stay", () => {
    const r = computeBudget({ ...base, coveredNights: [{ date: "2026-12-12", participants: ["a"] }, { date: "2026-12-13", participants: ["a"] }] });
    expect(r.perMember.a).toBe(200 * 11 + 20 * 14);
    expect(r.perMember.b).toBe(200 * 13 + 20 * 14);
  });

  it("switches scenario figures", () => {
    expect(computeBudget({ ...base, scenario: "budget" }).perMember.a).toBe(100 * 13 + 10 * 14);
    expect(computeBudget({ ...base, scenario: "comfortable" }).perMember.a).toBe(300 * 13 + 30 * 14);
  });

  it("honours manual overrides including 0 to disable", () => {
    const r = computeBudget({ ...base, baselineOverrides: { food: 0, accommodation: 50 } });
    expect(r.perMember.a).toBe(50 * 13);
  });

  it("spec scenario 5: ₹65,000 budget, optional experience for 5 of 7", () => {
    const inr = 300; // VND per INR
    const lines = [
      { id: "acc", source: "accommodation" as const, category: "accommodation", label: "Villas", amountVnd: 7 * 20_000 * inr, costMode: "total" as const, participants: null, isQuote: true },
      { id: "fl", source: "transport" as const, category: "domestic_flights", label: "Flights", amountVnd: 6_000 * inr, costMode: "per_person" as const, participants: null, isQuote: true },
      { id: "act", source: "activity" as const, category: "paid_activities", label: "Cruise", amountVnd: 8_000 * inr, costMode: "per_person" as const, participants: null, isQuote: false },
      { id: "opt", source: "activity" as const, category: "paid_activities", label: "Diving", amountVnd: 2_000 * inr, costMode: "per_person" as const, participants: ["a", "b", "c", "d", "e"], isQuote: false },
    ];
    const r = computeBudget({ ...base, baselines: [], lines, coveredNights: [], targetPerPersonVnd: 65_000 * inr });
    expect(r.perMember.a! / inr).toBe(20_000 + 6_000 + 8_000 + 2_000);
    expect(r.perMember.f! / inr).toBe(20_000 + 6_000 + 8_000);
    expect(r.groupTotalVnd / inr).toBe(7 * 34_000 + 5 * 2_000);
    expect(r.remainingPerMember!.a! / inr).toBe(65_000 - 36_000);
    expect(r.overBudgetMemberIds).toEqual([]);
    expect(r.optionalTotalVnd / inr).toBe(10_000);
    expect(r.quotedTotalVnd / inr).toBe(7 * 20_000 + 7 * 6_000);
  });

  it("adds an emergency reserve proportionally", () => {
    const r = computeBudget({ ...base, baselines: [], lines: [{ id: "x", source: "expense", category: "food", label: "", amountVnd: 1000, costMode: "per_person", participants: null, isQuote: false }], emergencyReservePct: 10 });
    expect(r.emergencyReserveVnd).toBe(700);
    expect(r.perMember.a).toBeCloseTo(1100);
    expect(r.groupTotalVnd).toBe(7700);
  });

  it("flags members over target", () => {
    const r = computeBudget({ ...base, baselines: [], lines: [{ id: "x", source: "expense", category: "food", label: "", amountVnd: 500, costMode: "per_person", participants: ["a"], isQuote: false }], targetPerPersonVnd: 400 });
    expect(r.overBudgetMemberIds).toEqual(["a"]);
  });

  it("skips baseline insurance when an explicit insurance line exists", () => {
    const withLine = computeBudget({ ...base, baselines: [], insurancePerPersonVnd: 999, lines: [{ id: "i", source: "expense", category: "insurance", label: "Policy", amountVnd: 500, costMode: "per_person", participants: null, isQuote: true }] });
    expect(withLine.perMember.a).toBe(500);
  });
});

describe("activityCostFromPrice", () => {
  it("uses the midpoint rounded to the nearest 1,000 VND", () => {
    expect(activityCostFromPrice({ minVnd: 500_000, maxVnd: 900_000, unit: "per_person" })).toMatchObject({ amountVnd: 700_000, costMode: "per_person" });
  });
  it("treats per-boat/per-group prices as shared totals", () => {
    expect(activityCostFromPrice({ minVnd: 1_000_000, maxVnd: 1_000_000, unit: "per_boat" }).costMode).toBe("total");
  });
  it("buys one vehicle per `unitCapacity` travellers", () => {
    const jetSki = { minVnd: 600_000, maxVnd: 1_000_000, unit: "per_vehicle", unitCapacity: 2 };
    expect(activityCostFromPrice(jetSki, 7)).toMatchObject({ amountVnd: 3_200_000, units: 4, costMode: "total" });
    expect(activityCostFromPrice(jetSki, 2)).toMatchObject({ amountVnd: 800_000, units: 1 });
  });
  it("prices a per-group activity once for the whole party", () => {
    expect(activityCostFromPrice({ minVnd: 2_000_000, maxVnd: 2_000_000, unit: "per_group", unitCapacity: 2 }, 7)).toMatchObject({ amountVnd: 2_000_000, units: 1 });
  });
});

describe("dedupeBundles", () => {
  const line = (id: string, amount: number, participants: string[] | null) => ({ id, source: "activity" as const, category: "paid_activities", label: id, amountVnd: amount, costMode: "per_person" as const, participants, isQuote: false });
  const bundles: Record<string, string> = { banaDay: "ba-na", goldenBridge: "ba-na" };

  it("budgets one ticket once, keeping the line that covers the most travellers", () => {
    const out = dedupeBundles([line("goldenBridge", 950_000, ["a", "b"]), line("banaDay", 950_000, null), line("other", 100, null)], (l) => bundles[l.id], 7);
    expect(out.find((l) => l.id === "banaDay")!.amountVnd).toBe(950_000);
    expect(out.find((l) => l.id === "goldenBridge")!.amountVnd).toBe(0);
    expect(out.find((l) => l.id === "other")!.amountVnd).toBe(100);
  });
});
