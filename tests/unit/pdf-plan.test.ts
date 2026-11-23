import { describe, expect, it } from "vitest";
import { parseDaySection, parseEntryTime } from "@/lib/pdf-days";
import { daysForTrip } from "@/lib/pdf-extract";
import { planFromPdf, type PlanActivity, type PlanPlace } from "@/lib/pdf-plan";

// Laid out the way PDF text comes out: titles and descriptions wrap over several lines.
const DAY1 = `Day 1 · Phu Quoc Sat, Dec 12
3:30–6:00 PM Arrival & Long Beach
(Duong Dong)
Land at 3:30 PM, check in and
watch sunset on the sand. 2.5
hrs
6:30–7:15 PM Dinh Cau Rock Temple
Walk from the beach to the lit-
up cliffside lighthouse shrine. 45
mins
7:30–9:30 PM Phu Quoc Night Market
Street-food dinner featuring
grilled seafood. 2 hrs`;

const DAY5 = `Day 5 · HCMC → Da
Nang
Wed, Dec
16
HO CHI MINH CITY
7:30 AM–6:30 PM Cu Chi Tunnels & Mekong
Delta
Full-day combo tour: tunnels in
the morning. 11 hrs
8:30–11:00 PM Flight: HCMC → Da Nang
Target a late flight around 9:00 PM.`;

describe("parseEntryTime", () => {
  it("reads ranges, single times and words", () => {
    expect(parseEntryTime("3:30–6:00 PM Arrival")).toEqual({ start: "15:30", end: "18:00", rest: "Arrival" });
    expect(parseEntryTime("9:30 AM–4:30 PM VinWonders")).toMatchObject({ start: "09:30", end: "16:30" });
    expect(parseEntryTime("11:00 AM–12:30 PM Museum")).toMatchObject({ start: "11:00", end: "12:30" });
    expect(parseEntryTime("10:00–12:30 PM Walk")).toMatchObject({ start: "10:00", end: "12:30" });
    expect(parseEntryTime("7:00 AM–about 6:30 PM Trang An")).toMatchObject({ start: "07:00", end: "18:30", rest: "Trang An" });
    expect(parseEntryTime("9:00 PM–late Optional: Bui Vien")).toMatchObject({ start: "21:00", end: null, rest: "Optional: Bui Vien" });
    expect(parseEntryTime("Around 10:00 PM Overnight bus")).toMatchObject({ start: "22:00", rest: "Overnight bus" });
    expect(parseEntryTime("Morning Flight: Da Nang → Hanoi")).toMatchObject({ start: "09:00", rest: "Flight: Da Nang → Hanoi" });
    expect(parseEntryTime("Walk from the beach")).toBeNull();
  });
});

describe("parseDaySection", () => {
  it("reads the heading's place and date, and each entry's title, description and duration", () => {
    const d = parseDaySection(DAY1);
    expect(d.place).toBe("Phu Quoc");
    expect(d.monthDay).toBe("12-12");
    expect(d.entries.map((e) => e.title)).toEqual(["Arrival & Long Beach (Duong Dong)", "Dinh Cau Rock Temple", "Phu Quoc Night Market"]);
    expect(d.entries[1]).toMatchObject({ start: "18:30", end: "19:15", durationMin: 45, description: "Walk from the beach to the lit-up cliffside lighthouse shrine." });
  });

  it("handles a heading wrapped over several lines, with a place label", () => {
    const d = parseDaySection(DAY5);
    expect(d.place).toBe("HCMC → Da Nang");
    expect(d.monthDay).toBe("12-16");
    expect(d.entries.map((e) => e.title)).toEqual(["Cu Chi Tunnels & Mekong Delta", "Flight: HCMC → Da Nang"]);
  });

  it("keeps a time in the middle of a sentence in the description", () => {
    const d = parseDaySection("Day 8 · Da Nang Sat, Dec 19\n8:15–9:30 PM Dragon Bridge show\nArrive early for the Saturday\n9:00 PM fire-and-water show. 1.25 hrs");
    expect(d.entries).toHaveLength(1);
    expect(d.entries[0]!.description).toBe("Arrive early for the Saturday 9:00 PM fire-and-water show.");
  });
});

describe("page notes after a day's last entry", () => {
  it("stay out of the entry's description, which ends at its length", () => {
    const d = parseDaySection(
      "Day 11 · Sapa → Hanoi Tue, Dec 22\n2:30–8:30 PM Limousine bus to Hanoi\nAfternoon road transfer back to\nyour Hanoi Old Quarter hotel.\nAbout 6 hrs Da Lat clarification: If\n“Dalet” means Da Lat, it is far.",
    );
    expect(d.entries[0]!.description).toBe("Afternoon road transfer back to your Hanoi Old Quarter hotel.");
    const e = parseDaySection("Day 4 · Hanoi\n9:00 PM–late Optional: Bui Vien Walking\nStreet\nNightlife and live music.\nOptional\nOptional swaps & name check: Landmark 81 is far.");
    expect(e.entries[0]).toMatchObject({ title: "Optional: Bui Vien Walking Street", description: "Nightlife and live music." });
  });
  it("the next page's subtitle doesn't end the day's PDF text, even with a comma", () => {
    const d = parseDaySection("Day 4 · Hanoi\n9:00–10:00 AM Old Quarter walk\nCoffee stops. 1 hr\nCentral Vietnam, with time for Hoi An");
    expect(d.entries[0]!.description).toBe("Coffee stops.");
  });
});

describe("daysForTrip", () => {
  const pages = ["Cover", `${DAY1}\nDay 2 · Phu Quoc Sun, Dec 13\n9:30 AM–4:30 PM VinWonders Phu Quoc\nRides. 7 hrs`];
  it("puts PDF days on their dates, even when the trip starts earlier", () => {
    const r = daysForTrip(pages, ["2026-12-11", "2026-12-12", "2026-12-13"]);
    expect(r.days.map((d) => d?.monthDay ?? null)).toEqual([null, "12-12", "12-13"]);
    expect(r.dayPages).toEqual([null, 2, 2]);
    expect(r.dayTexts[0]).toBeNull();
    expect(r.dayTexts[1]).toContain("Dinh Cau Rock Temple");
  });
  it("without dates, PDF Day 1 is the trip's first day", () => {
    const r = daysForTrip(["Day 1 · Hanoi\n9:00 AM Old Quarter walk", "Day 2 · Hanoi\n9:00 AM Temple of Literature"], ["2026-12-11", "2026-12-12"]);
    expect(r.dayPages).toEqual([1, 2]);
  });
});

describe("planFromPdf", () => {
  const places: PlanPlace[] = [
    { id: "pq", slug: "phu-quoc", name: "Phu Quoc", localName: "Phú Quốc", parentId: null },
    { id: "hcm", slug: "ho-chi-minh-city", name: "Ho Chi Minh City", localName: null, parentId: null },
    { id: "nt", slug: "nha-trang", name: "Nha Trang", localName: null, parentId: null },
    { id: "dn", slug: "da-nang", name: "Da Nang", localName: null, parentId: null },
  ];
  const act = (id: string, title: string, destinationId: string): PlanActivity => ({ id, slug: id, title, destinationId, durationHours: 2 });
  const activities = [
    act("long-beach", "Long Beach afternoon and sunset", "pq"),
    act("dinh-cau", "Dinh Cau shrine at sunset", "pq"),
    act("night-market", "Duong Dong Night Market street-food crawl", "pq"),
    act("vinwonders", "VinWonders Phu Quoc theme park", "pq"),
    act("pq-snorkel", "Three-island snorkelling tour", "pq"),
    act("nt-hop", "Island hopping", "nt"),
    act("cu-chi", "Cu Chi Tunnels half-day tour", "hcm"),
    act("war-museum", "War Remnants Museum", "hcm"),
    act("post-office", "Central Post Office", "hcm"),
    act("notre-dame", "Notre-Dame Cathedral exterior", "hcm"),
  ];

  it("matches stops to activities at the day's place, and sets the place and title", () => {
    const [d] = planFromPdf([parseDaySection(DAY1)], places, activities);
    expect(d!.destinationId).toBe("pq");
    expect(d!.items.map((i) => i.activityId)).toEqual(["long-beach", "dinh-cau", "night-market"]);
    expect(d!.items[0]).toMatchObject({ time: "15:30", durationMin: 150, title: "Arrival & Long Beach (Duong Dong)" });
    expect(d!.title).toBe("Arrival & Long Beach and Dinh Cau Rock Temple");
  });

  it("never picks another city's activity, and keeps flights as fixed rows", () => {
    const pdf = parseDaySection("Day 3 · Phu Quoc Mon, Dec 14\n8:30 AM–2:30 PM Island hopping\nSpeedboat snorkeling at May Rut. 6 hrs");
    expect(planFromPdf([pdf], places, activities)[0]!.items[0]!.activityId).toBe("pq-snorkel");
    const [d5] = planFromPdf([parseDaySection(DAY5)], places, activities);
    expect(d5!.destinationId).toBe("hcm");
    expect(d5!.title).toBe("HCMC → Da Nang");
    expect(d5!.items.map((i) => [i.type, i.activityId])).toEqual([["activity", "cu-chi"], ["transport", null]]);
  });

  it("splits a stop naming several places into one activity each, sharing the slot", () => {
    const pdf = parseDaySection("Day 4 · Ho Chi Minh City Tue, Dec 15\n3:00–4:30 PM Notre-Dame exterior, Central Post Office & Cafe Apartments\nColonial landmarks. 1.5 hrs");
    const items = planFromPdf([pdf], places, activities)[0]!.items;
    expect(items.map((i) => [i.activityId, i.time, i.durationMin])).toEqual([["notre-dame", "15:00", 45], ["post-office", "15:45", 45]]);
  });

  it("uses each activity once, and leaves activities already in the trip alone", () => {
    const day = (n: number) => parseDaySection(`Day ${n} · Phu Quoc\n9:30 AM–4:30 PM VinWonders Phu Quoc\nRides. 7 hrs`);
    const plan = planFromPdf([day(1), day(2)], places, activities);
    expect(plan.map((d) => d!.items[0]!.activityId)).toEqual(["vinwonders", null]);
    expect(planFromPdf([day(1)], places, activities, new Set(["vinwonders"]))[0]!.items[0]!.activityId).toBeNull();
  });
});
