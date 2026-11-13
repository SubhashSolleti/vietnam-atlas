import { describe, expect, it } from "vitest";
import { computePlanAlerts, type PlanDay } from "@/lib/planning-alerts";

const hanoi = { id: "hn", name: "Hanoi", lat: 21.03, lng: 105.85 };
const sapa = { id: "sp", name: "Sa Pa", lat: 22.34, lng: 103.84 };
const pq = { id: "pq", name: "Phu Quoc", lat: 10.22, lng: 103.96 };
const hcm = { id: "hcm", name: "HCMC", lat: 10.78, lng: 106.7 };
const dalat = { id: "dl", name: "Da Lat", lat: 11.94, lng: 108.44 };
const act = (over: Partial<NonNullable<PlanDay["items"][number]["activity"]>> = {}) => ({ weatherDependent: false, decemberStatus: "good", availability: "year_round", months: "333333333333", intensity: 2, destination: hanoi, ...over });

describe("computePlanAlerts", () => {
  it("detects overlapping activities", () => {
    const alerts = computePlanAlerts({ days: [{ date: "2026-12-20", destination: hanoi, items: [
      { id: "1", title: "Food tour", type: "activity", startTime: "18:00", durationMin: 180, activity: act() },
      { id: "2", title: "Water puppets", type: "activity", startTime: "20:00", durationMin: 60, activity: act() },
    ] }], legs: [] });
    expect(alerts.find((a) => a.kind === "overlap")?.itemIds).toEqual(["1", "2"]);
  });

  it("flags activities closed in December and weather-dependent ones", () => {
    const alerts = computePlanAlerts({ days: [{ date: "2026-12-16", destination: hanoi, items: [
      { id: "c", title: "Son Doong", type: "activity", startTime: null, durationMin: 60, activity: act({ decemberStatus: "closed" }) },
      { id: "w", title: "Kayak", type: "activity", startTime: null, durationMin: 60, activity: act({ weatherDependent: true }) },
    ] }], legs: [] });
    expect(alerts.some((a) => a.kind === "closed" && a.severity === "critical")).toBe(true);
    expect(alerts.some((a) => a.kind === "weather" && a.itemIds[0] === "w")).toBe(true);
  });

  it("warns about overloaded days and far-away activities", () => {
    const alerts = computePlanAlerts({ days: [{ date: "2026-12-21", destination: hanoi, items: [
      { id: "1", title: "A", type: "activity", startTime: null, durationMin: 8 * 60, activity: act() },
      { id: "2", title: "Fansipan", type: "activity", startTime: null, durationMin: 6 * 60, activity: act({ destination: sapa }) },
    ] }], legs: [] });
    expect(alerts.some((a) => a.kind === "overloaded_day")).toBe(true);
    expect(alerts.some((a) => a.kind === "far_from_base" && a.itemIds[0] === "2")).toBe(true);
  });

  it("protects booked flights and needs recovery after overnight travel", () => {
    const alerts = computePlanAlerts({
      days: [
        { date: "2026-12-12", destination: pq, items: [{ id: "early", title: "Snorkel", type: "activity", startTime: "14:00", durationMin: 120, activity: act({ destination: pq }) }] },
        { date: "2026-12-23", destination: sapa, items: [{ id: "trek", title: "Trek", type: "activity", startTime: "08:00", durationMin: 360, activity: act({ intensity: 4, destination: sapa }) }] },
      ],
      legs: [
        { id: "f", label: "HYD → PQC", departAt: "2026-12-11T22:20", arriveAt: "2026-12-12T15:30", durationMin: null, overnight: false, isFixed: true },
        { id: "bus", label: "Sa Pa", departAt: "2026-12-22T22:00", arriveAt: "2026-12-23T03:30", durationMin: 330, overnight: true, isFixed: false },
      ],
    });
    expect(alerts.some((a) => a.kind === "fixed_transport_conflict" && a.severity === "critical")).toBe(true);
    expect(alerts.some((a) => a.kind === "overnight_recovery")).toBe(true);
  });

  it("detects too many destinations and detours, and over-budget plans", () => {
    const seq = [pq, hcm, sapa, dalat, hanoi, pq];
    const days = seq.map((d, i) => ({ date: `2026-12-${12 + i}`, destination: d, items: [] }));
    const alerts = computePlanAlerts({ days, legs: [], perPersonPlannedVnd: 2, targetPerPersonVnd: 1 });
    expect(alerts.some((a) => a.kind === "too_many_destinations")).toBe(true);
    expect(alerts.some((a) => a.kind === "detour")).toBe(true);
    expect(alerts.some((a) => a.kind === "over_budget")).toBe(true);
  });

  it("does not treat an out-and-back excursion as a detour", () => {
    const days = [hanoi, sapa, hanoi].map((d, i) => ({ date: `2026-12-2${i}`, destination: d, items: [] }));
    expect(computePlanAlerts({ days, legs: [] }).some((a) => a.kind === "detour")).toBe(false);
  });

  it("returns nothing for a sensible day", () => {
    const alerts = computePlanAlerts({ days: [{ date: "2026-12-20", destination: hanoi, items: [{ id: "1", title: "Museum", type: "activity", startTime: "10:00", durationMin: 120, activity: act() }] }], legs: [] });
    expect(alerts).toEqual([]);
  });
});
