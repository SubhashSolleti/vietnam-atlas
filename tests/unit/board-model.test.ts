import { describe, expect, it } from "vitest";
import { boardFor } from "@/components/group/board-model";
import type { Pick, PickDay, PickExtra, PickItem } from "@/components/group/picks-panel";

const item = (id: string, time: string | null, durationMin: number, over: Partial<PickItem> = {}): PickItem => ({
  id, type: "activity", title: id, time, durationMin, notes: null, activityId: id, slug: id, participants: null, ...over,
});
const day = (id: string, date: string, items: PickItem[]): PickDay => ({ id, date, title: null, notes: null, destinationId: "pq", destinationName: "Phu Quoc", items });
const idea = (activityId: string, durationMin: number): PickExtra => ({ activityId, title: activityId, slug: activityId, durationMin, tier: "paid", price: null, destinationId: "pq" });

// Arrival day: lands 15:30, then the beach until 18:00. Next day: a theme park all day, then dinner.
const d1 = day("d1", "2026-12-12", [item("arrival", "15:30", 30, { type: "transport", activityId: null }), item("beach", "16:00", 120)]);
const d2 = day("d2", "2026-12-13", [item("park", "09:30", 420), item("market", "19:00", 120)]);

function board(picks: Record<string, Pick>, extras: PickExtra[] = []) {
  return boardFor([d1, d2], extras, "me", (a) => picks[a]);
}

describe("boardFor times", () => {
  it("gives a moved activity a free time after the arrival, not over the day's plans", () => {
    const b = board({ market: { vote: "interested", dayId: "d1" } });
    expect(b.days[0]!.activities.map((a) => [a.item.id, a.time])).toEqual([["beach", "16:00"], ["market", "19:00"]]);
    const park = board({ park: { vote: "interested", dayId: "d1" } }).days[0]!.activities.find((a) => a.item.id === "park")!;
    expect(park.time).toBeNull(); // 7 hours don't fit after a 3:30 PM landing
  });

  it("gives an added idea the first free time that fits, and none when the day is full", () => {
    const b = board({ snorkel: { vote: "interested", dayId: "d2" }, cable: { vote: "must_do", dayId: "d2" } }, [idea("snorkel", 90), idea("cable", 30)]);
    expect(b.days[1]!.extras.map((e) => [e.activityId, e.time])).toEqual([["snorkel", "08:00"], ["cable", "16:30"]]);
    const full = board({ tour: { vote: "interested", dayId: "d2" } }, [idea("tour", 240)]);
    expect(full.days[1]!.extras[0]!.time).toBeNull();
  });

  it("an idea swapped in for a skipped activity takes its time", () => {
    const b = board({ park: { vote: "not_interested", dayId: null }, tour: { vote: "interested", dayId: "d2" } }, [idea("tour", 240)]);
    expect(b.out.map((o) => o.activityId)).toEqual(["park"]);
    expect(b.days[1]!.extras[0]!.time).toBe("09:30");
  });

  it("on the last day, nothing is moved past the transfer to the flight home", () => {
    // d2 is the trip's last day here: the airport transfer leaves at 09:45.
    const last = day("d2", "2026-12-13", [item("transfer", "09:45", 165, { type: "transport", activityId: null }), item("cafe", "08:00", 60)]);
    const b = boardFor([d1, last], [], "me", (a) => (a === "beach" ? { vote: "interested", dayId: "d2" } : undefined));
    expect(b.days[1]!.activities.find((a) => a.item.id === "beach")!.time).toBeNull();
  });
});
