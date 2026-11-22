import { describe, expect, it } from "vitest";
import { findDayPages, isPdf } from "@/lib/pdf-days";

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
  it("handles a scanned PDF with no text", () => {
    expect(findDayPages(["", ""], 3)).toEqual([null, null, null]);
  });
});

describe("isPdf", () => {
  it("checks the file signature, not the name", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7\n..."))).toBe(true);
    expect(isPdf(new TextEncoder().encode("<html>not a pdf</html>"))).toBe(false);
  });
});
