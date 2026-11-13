import { describe, expect, it } from "vitest";
import { filterActivities, parseActivityFilters, type ActivityCardData } from "@/lib/activity-filters";

const base: ActivityCardData = {
  id: "1", slug: "a", title: "Three-island snorkelling", summary: "Coral reefs", kind: "tour", destinationId: "d", destinationSlug: "phu-quoc", destinationName: "Phú Quốc", regionSlug: "south",
  priceTier: "paid", price: { minVnd: 600_000, maxVnd: 900_000, unit: "per_person", status: "estimated" }, durationText: "Full day", durationBucket: "full_day", durationHours: 8,
  difficulty: "easy", intensity: 2, availability: "weather_dependent", decemberStatus: "good", months: "333322111223", weatherDependent: true, categories: ["water_sports", "nature"], themes: ["water", "island"],
  suitability: ["groups", "couples"], featured: true, lat: 10, lng: 104, image: null,
};
const free: ActivityCardData = { ...base, id: "2", slug: "b", title: "Sao Beach", priceTier: "free", price: { minVnd: 0, maxVnd: 0, unit: "per_person", status: "estimated" }, categories: ["relaxation"], themes: ["beach"], durationBucket: "half_day", durationHours: 4, availability: "year_round", weatherDependent: false };
const hanoi: ActivityCardData = { ...base, id: "3", slug: "c", title: "Street food tour", destinationSlug: "hanoi", destinationName: "Hanoi", regionSlug: "north", price: { minVnd: 1_500_000, maxVnd: 2_000_000, unit: "per_person", status: "estimated" }, categories: ["food"], themes: [], months: "222222222222", featured: false };
const all = [base, free, hanoi];

describe("filterActivities", () => {
  it("searches across diacritics", () => {
    expect(filterActivities(all, { q: "phu quoc" }, 300).map((a) => a.id).sort()).toEqual(["1", "2"]);
  });
  it("filters by INR price bucket using the conversion rate", () => {
    // 600k VND = ₹2,000 at 300 → 1000-2500 bucket; 1.5M = ₹5,000 → 5000-10000
    expect(filterActivities(all, { price: ["1000-2500"] }, 300).map((a) => a.id)).toEqual(["1"]);
    expect(filterActivities(all, { price: ["5000-10000"] }, 300).map((a) => a.id)).toEqual(["3"]);
    expect(filterActivities(all, { price: ["free"] }, 300).map((a) => a.id)).toEqual(["2"]);
  });
  it("combines filters with AND across groups and OR within a group", () => {
    expect(filterActivities(all, { region: ["south"], category: ["food", "relaxation"] }, 300).map((a) => a.id)).toEqual(["2"]);
    expect(filterActivities(all, { availability: ["weather_dependent"] }, 300).map((a) => a.id).sort()).toEqual(["1", "3"]);
  });
  it("filters by month suitability", () => {
    expect(filterActivities(all, { month: 7 }, 300).map((a) => a.id)).toEqual(["3"]);
  });
  it("sorts by price", () => {
    expect(filterActivities(all, { sort: "price_desc" }, 300).map((a) => a.id)).toEqual(["3", "1", "2"]);
  });
});

describe("parseActivityFilters", () => {
  it("parses comma lists and validates month/sort", () => {
    const f = parseActivityFilters({ category: "food,nature", month: "13", sort: "hack" });
    expect(f.category).toEqual(["food", "nature"]);
    expect(f.month).toBeNull();
    expect(f.sort).toBe("recommended");
  });
});
