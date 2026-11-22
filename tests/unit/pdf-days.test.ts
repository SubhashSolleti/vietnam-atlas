import { describe, expect, it } from "vitest";
import { findDayPages, findDayTexts, isPdf, pageForDay, tidyDayText } from "@/lib/pdf-days";

describe("findDayPages", () => {
  const pages = [
    "Vietnam in 14 days",
    "At a glance: fourteen days, Day trips optional",
    "THE ITINERARY · DAYS 1–4\nDay 1 · Phu Quoc Sat, Dec 12 ... Day 2 · Phu Quoc",
    "Day 3 · Phu Quoc Mon ... Day 4 · HCMC",
    "Day 12 · Ninh Binh\nDay 13: Hanoi\nDay 14 - Home",
  ];
  it("maps each day to the first page with its heading", () => {
    expect(findDayPages(pages, 14)).toEqual([3, 3, 4, 4, null, null, null, null, null, null, null, 5, 5, 5]);
  });
  it("doesn't confuse Day 1 with Day 12, or 'Day trips' with a heading", () => {
    expect(findDayPages(["Day 12 · Ninh Binh", "Day 1 · Phu Quoc"], 1)).toEqual([2]);
    expect(findDayPages(["Day trips are optional"], 1)).toEqual([null]);
  });
  it("reads other heading styles", () => {
    expect(findDayPages(["intro", "Day-1 Arrival\nDAY 02 Sat, Dec 13", "Day Three (Mon)\nDay 4 Hanoi and more"], 4)).toEqual([2, 2, 3, 3]);
  });
  it("skips an overview page that lists every day, unless a day is found nowhere else", () => {
    const overview = "At a glance\nDay 1: Phu Quoc\nDay 2: Phu Quoc\nDay 3: Saigon\nDay 4: Saigon\nDay 5: Hoi An";
    expect(findDayPages([overview, "Day 1 · Arrive", "Day 2 · Islands\nDay 3 · Fly", "Day 4 · Delta"], 5)).toEqual([2, 3, 3, 4, 1]);
  });
  it("keeps days in order, ignoring a passing mention earlier in the PDF", () => {
    expect(findDayPages(["Day 1 · Arrive\nUnlike Day 3, today is slow.", "Day 2 · Beach", "Day 3 · Fly"], 3)).toEqual([1, 2, 3]);
  });
  it("handles a scanned PDF with no text", () => {
    expect(findDayPages(["", ""], 3)).toEqual([null, null, null]);
  });
});

describe("findDayTexts", () => {
  const pages = [
    "Cover",
    "T H E I T I N E R A R Y\nDay 1 · Phu Quoc Sat, Dec 12\n3:30–6:00 PM Arrival & Long Beach\nLand at 3:30 PM, check in and\nwatch sunset. 2.5\nhrs\n6:30–7:15 PM Dinh Cau Rock Temple\nWalk to the lit-\nup shrine. 45\nmins\nDay 2 · Phu Quoc Sun, Dec 13\n9:30 AM–4:30 PM VinWonders\nWater park. 7 hrs",
    "VIETNAM · 12–25 DECEMBER 2026\nDay 3 · Ho Chi Minh\nCity Tue, Dec 15\nMorning Flight: Phu Quoc → HCMC Plan a flight, around\n10:30 AM; drop bags. 3 hrs\n2:30–6:30 PM Old Quarter\nEgg coffee. 4 hrs\nHanoi and the highlands",
  ];
  it("cuts each day's section, joins wrapped lines into one entry per time slot, and drops headers", () => {
    expect(findDayTexts(pages, findDayPages(pages, 3))).toEqual([
      "3:30–6:00 PM Arrival & Long Beach Land at 3:30 PM, check in and watch sunset. 2.5 hrs\n6:30–7:15 PM Dinh Cau Rock Temple Walk to the lit-up shrine. 45 mins",
      "9:30 AM–4:30 PM VinWonders Water park. 7 hrs",
      "Morning Flight: Phu Quoc → HCMC Plan a flight, around 10:30 AM; drop bags. 3 hrs\n2:30–6:30 PM Old Quarter Egg coffee. 4 hrs",
    ]);
  });
  it("is null for days without a heading, and caps long days on a whole entry", () => {
    expect(findDayTexts(["nothing here"], [null])).toEqual([null]);
    const long = `Day 1 · X\n${Array.from({ length: 30 }, (_, i) => `${(i % 12) + 1}:00–${(i % 12) + 1}:30 PM Stop ${i} with a long description of the place.`).join("\n")}`;
    const [t] = findDayTexts([long], [1], 300);
    expect(t!.length).toBeLessThanOrEqual(302);
    expect(t!.endsWith(" …")).toBe(true);
    expect(tidyDayText("Day 4 · Hue: walk the citadel")).toBe("Hue: walk the citadel");
  });
});

describe("pageForDay", () => {
  it("falls back to the nearest earlier day that was found", () => {
    expect(pageForDay([3, null, 5], 1)).toEqual({ page: 3, exact: false });
    expect(pageForDay([3, null, 5], 2)).toEqual({ page: 5, exact: true });
    expect(pageForDay([null, null], 1)).toEqual({ page: 1, exact: false });
    expect(pageForDay([3], 4)).toEqual({ page: 3, exact: false });
  });
});

describe("isPdf", () => {
  it("checks the file signature, not the name", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7\n..."))).toBe(true);
    expect(isPdf(new TextEncoder().encode("<html>not a pdf</html>"))).toBe(false);
  });
});
