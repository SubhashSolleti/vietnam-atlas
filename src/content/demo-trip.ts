/**
 * Initial demonstration workspace (spec §1.1). These are *editable starting assumptions*:
 * the seed script writes them into ordinary trip rows; application logic never reads this file.
 */
import type { TripSettings } from "@/db/schema";

export const demoTrip = {
  name: "Vietnam Cousins Trip 2026",
  description:
    "Seven cousins, two weeks, south to north. Balanced pace, best-value stays, safety first, beaches, adventure, food and a few late nights.",
  startDate: "2026-12-12",
  endDate: "2026-12-25",
  travellersCount: 7,
  budgetMinInr: 55000,
  budgetMaxInr: 70000,
  budgetTargetInr: 65000,
  currency: "INR",
  scenario: "balanced" as const,
  inviteCode: "COUSINS26",
  members: [
    { displayName: "Traveller 1", role: "owner" as const, travellerType: "couple" as const, coupleGroup: "A", avatarColor: "#173F35" },
    { displayName: "Traveller 2", role: "editor" as const, travellerType: "couple" as const, coupleGroup: "A", avatarColor: "#377A61" },
    { displayName: "Traveller 3", role: "member" as const, travellerType: "couple" as const, coupleGroup: "B", avatarColor: "#C96F50" },
    { displayName: "Traveller 4", role: "member" as const, travellerType: "couple" as const, coupleGroup: "B", avatarColor: "#D6AB59" },
    { displayName: "Traveller 5", role: "member" as const, travellerType: "solo" as const, avatarColor: "#5B6F8F" },
    { displayName: "Traveller 6", role: "member" as const, travellerType: "solo" as const, avatarColor: "#8A5A83" },
    { displayName: "Traveller 7", role: "member" as const, travellerType: "solo" as const, avatarColor: "#6E7B3A" },
  ],
  /** Already-booked international flights. Excluded from the Vietnam budget by default. */
  fixedFlights: [
    {
      fromLabel: "Hyderabad (HYD)",
      toLabel: "Phu Quoc International Airport (PQC)",
      toDestination: "phu-quoc",
      departAt: "2026-12-11T22:20",
      arriveAt: "2026-12-12T15:30",
      notes: "Booked international flight. Departure in Hyderabad local time (IST), arrival in Vietnam local time (ICT, UTC+7).",
    },
    {
      fromLabel: "Hanoi: Noi Bai International Airport (HAN)",
      toLabel: "Hyderabad (HYD)",
      fromDestination: "hanoi",
      departAt: "2026-12-25T12:20",
      arriveAt: "2026-12-25T22:55",
      notes: "Booked international flight. Departure in Vietnam local time (ICT), arrival in Hyderabad local time (IST). Plan to leave central Hanoi ~3 hours before departure.",
    },
  ],
  settings: {
    insurancePerPersonVnd: 650_000,
    simPerPersonVnd: 250_000,
    emergencyReservePct: 8,
    includeInternationalFlights: false,
  } satisfies TripSettings,
};

/**
 * Illustrative per-person, per-day planning baselines in VND. These are ESTIMATES used only
 * to sketch a budget before real quotations exist; every one is editable in the admin CMS and
 * every trip can override them with actual expenses.
 */
export const budgetCategories = [
  { slug: "international_flights", name: "International flights", description: "Already booked: excluded from the Vietnam budget by default.", perDay: null },
  { slug: "domestic_flights", name: "Domestic flights", description: "Internal flights between regions.", perDay: null },
  { slug: "accommodation", name: "Accommodation", description: "Per-person share of shared properties, hotels or homestays.", perDay: [180_000, 380_000, 800_000] },
  { slug: "intercity_bus", name: "Intercity buses", description: "Sleeper and cabin buses between destinations.", perDay: null },
  { slug: "trains", name: "Trains", description: "Vietnam Railways and tourist trains.", perDay: null },
  { slug: "local_transport", name: "Local transport", description: "Ride-hailing, taxis, local boats and short transfers.", perDay: [70_000, 150_000, 320_000] },
  { slug: "food", name: "Food & drink", description: "Street food, restaurants, coffee and drinks.", perDay: [230_000, 420_000, 850_000] },
  { slug: "paid_activities", name: "Paid activities", description: "Tours, tickets and experiences with a price.", perDay: null },
  { slug: "free_activities", name: "Free activities", description: "Tracked so the itinerary stays balanced, usually zero cost.", perDay: null },
  { slug: "insurance", name: "Travel insurance", description: "Per-person policy including adventure activities cover.", perDay: null },
  { slug: "sim", name: "SIM / eSIM", description: "Local data for the trip.", perDay: null },
  { slug: "shopping", name: "Shopping", description: "Souvenirs, tailoring and market purchases.", perDay: [40_000, 100_000, 250_000] },
  { slug: "miscellaneous", name: "Miscellaneous", description: "Tips, laundry, toiletries and incidentals.", perDay: [30_000, 60_000, 120_000] },
  { slug: "emergency_reserve", name: "Emergency reserve", description: "Contingency held back as a percentage of the plan.", perDay: null },
] as const;

/**
 * Suggested route templates. Applying one only fills empty days and adds "idea"-status transport
 * legs; it never overwrites existing plans. Durations/costs are rough planning estimates.
 */
export const routeTemplates = [
  {
    slug: "south-to-north-balanced",
    name: "South to north, balanced",
    description:
      "Dry-season beaches first, then Saigon and the Mekong, the cool highlands of Da Lat, and the karst landscapes and mountains of the north. Skips the central coast, which is in its rainy season in December.",
    days: [
      { date: "2026-12-12", destination: "phu-quoc", title: "Arrive Phu Quoc: sunset and night market" },
      { date: "2026-12-13", destination: "phu-quoc", title: "South islands & snorkelling" },
      { date: "2026-12-14", destination: "phu-quoc", title: "North coast, national park & beaches" },
      { date: "2026-12-15", destination: "ho-chi-minh-city", title: "Fly to Ho Chi Minh City" },
      { date: "2026-12-16", destination: "mekong-delta", title: "Mekong Delta day trip" },
      { date: "2026-12-17", destination: "da-lat", title: "Fly to Da Lat" },
      { date: "2026-12-18", destination: "da-lat", title: "Canyoning & waterfalls" },
      { date: "2026-12-19", destination: "ninh-binh", title: "Fly to Hanoi, transfer to Ninh Binh" },
      { date: "2026-12-20", destination: "ninh-binh", title: "Trang An, Hang Mua & cycling" },
      { date: "2026-12-21", destination: "lan-ha-bay", title: "Lan Ha Bay overnight cruise" },
      { date: "2026-12-22", destination: "hanoi", title: "Back to Hanoi: evening in the Old Quarter" },
      { date: "2026-12-23", destination: "sa-pa", title: "Sa Pa: trekking and Fansipan" },
      { date: "2026-12-24", destination: "hanoi", title: "Return to Hanoi: Christmas Eve" },
      { date: "2026-12-25", destination: "hanoi", title: "Depart Hanoi 12:20" },
    ],
    legs: [
      { from: "phu-quoc", to: "ho-chi-minh-city", mode: "flight", departAt: "2026-12-15T10:00", durationMin: 60, costVnd: 1_400_000, luggage: "Check budget-airline cabin and hold allowances; pay for hold luggage in advance." },
      { from: "ho-chi-minh-city", to: "da-lat", mode: "flight", departAt: "2026-12-17T09:00", durationMin: 55, costVnd: 1_300_000, luggage: "Short flight; alternatively ~7–8 h by sleeper bus." },
      { from: "da-lat", to: "hanoi", mode: "flight", departAt: "2026-12-19T08:00", durationMin: 120, costVnd: 1_900_000, luggage: "Continue by private van to Ninh Binh (~2–2.5 h)." },
      { from: "hanoi", to: "ninh-binh", mode: "private_transfer", departAt: "2026-12-19T12:00", durationMin: 150, costVnd: 2_200_000, costMode: "total", luggage: "One 16-seat van fits 7 people and luggage comfortably." },
      { from: "ninh-binh", to: "lan-ha-bay", mode: "private_transfer", departAt: "2026-12-21T07:30", durationMin: 210, costVnd: 3_500_000, costMode: "total", luggage: "Many cruises include a shuttle: confirm before booking a private transfer." },
      { from: "lan-ha-bay", to: "hanoi", mode: "private_transfer", departAt: "2026-12-22T11:30", durationMin: 180, costVnd: 0, luggage: "Usually included in cruise packages: confirm." },
      { from: "hanoi", to: "sa-pa", mode: "sleeper_bus", departAt: "2026-12-22T22:00", durationMin: 330, costVnd: 380_000, overnight: true, luggage: "Cabin buses have limited luggage space; keep a small daypack with warm layers." },
      { from: "sa-pa", to: "hanoi", mode: "cabin_bus", departAt: "2026-12-24T14:00", durationMin: 330, costVnd: 380_000, luggage: "Arrives Hanoi in the evening." },
    ],
  },
] as const;
