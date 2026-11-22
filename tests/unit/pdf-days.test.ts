import { describe, expect, it } from "vitest";
import { findDayPages, isPdf, pageForDay } from "@/lib/pdf-days";

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
