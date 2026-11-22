/**
 * The group's base itinerary: Subhash's 14-day plan ("Vietnam in 14 days" PDF), adjusted to the booked flights.
 *
 * Seeding writes it into ordinary trip rows (days, items, transport legs and shortlist entries), so everything here
 * stays editable in the itinerary builder. Each traveller then marks what they want, skip or have already done, and
 * "Build personal plans" turns those picks into everyone's own version of the trip.
 *
 * Times are local wall-clock times. Activities link to catalogue slugs so travellers can open the full details.
 */

export type BasePlanItem = {
  time: string;
  durationMin: number;
  title: string;
  /** Catalogue activity slug. Items without one are restaurants, free time or notes. */
  activity?: string;
  type?: "restaurant" | "free_time";
  notes?: string;
};

export type BasePlanLeg = {
  key: string;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  mode: "flight" | "sleeper_bus" | "cabin_bus" | "private_transfer";
  departAt: string;
  arriveAt?: string;
  durationMin?: number;
  /** Booked flights are fixed: the planner protects them and keeps other plans clear of them. */
  booked: boolean;
  international?: boolean;
  overnight?: boolean;
  costVnd?: number;
  costMode?: "per_person" | "total";
  /** Shown in the itinerary on the day of departure (or arrival, for the flight into Vietnam). */
  itemTitle: string;
  itemDate: string;
  itemTime: string;
  itemDurationMin: number | null;
  notes: string;
};

export type BasePlanDay = {
  date: string;
  destination: string;
  title: string;
  notes?: string;
  items: BasePlanItem[];
};

export const BASE_PLAN_VERSION = "vietnam-14-day-2026-11";

export const basePlanLegs: BasePlanLeg[] = [
  {
    key: "hyd-pqc",
    from: "",
    to: "phu-quoc",
    fromLabel: "Hyderabad (HYD)",
    toLabel: "Phu Quoc International Airport (PQC)",
    mode: "flight",
    departAt: "2026-12-11T22:20",
    arriveAt: "2026-12-12T15:30",
    booked: true,
    international: true,
    itemTitle: "Land at Phu Quoc (PQC): flight from Hyderabad",
    itemDate: "2026-12-12",
    itemTime: "15:30",
    itemDurationMin: null,
    notes: "Booked. Departs Hyderabad 11 Dec at 22:20 (IST), lands 12 Dec at 15:30 (Vietnam time). Allow time for immigration and the transfer to your stay.",
  },
  {
    key: "pqc-sgn",
    from: "phu-quoc",
    to: "ho-chi-minh-city",
    fromLabel: "Phu Quoc (PQC)",
    toLabel: "Ho Chi Minh City (SGN)",
    mode: "flight",
    departAt: "2026-12-15T10:35",
    arriveAt: "2026-12-15T11:45",
    booked: true,
    itemTitle: "Fly Phu Quoc → Ho Chi Minh City (10:35 to 11:45)",
    itemDate: "2026-12-15",
    itemTime: "10:35",
    itemDurationMin: 70,
    notes: "Booked. Check out early and be at PQC by about 9:00.",
  },
  {
    key: "sgn-dad",
    from: "ho-chi-minh-city",
    to: "da-nang",
    fromLabel: "Ho Chi Minh City (SGN)",
    toLabel: "Da Nang (DAD)",
    mode: "flight",
    departAt: "2026-12-16T21:00",
    arriveAt: "2026-12-16T22:15",
    booked: true,
    itemTitle: "Fly Ho Chi Minh City → Da Nang (21:00 to 22:15)",
    itemDate: "2026-12-16",
    itemTime: "21:00",
    itemDurationMin: 75,
    notes: "Booked. Tight after the day tour: ask the operator to drop you at the airport, or choose a tour that is back by 17:30.",
  },
  {
    key: "dad-hoi-an",
    from: "da-nang",
    to: "hoi-an",
    fromLabel: "Da Nang",
    toLabel: "Hoi An",
    mode: "private_transfer",
    departAt: "2026-12-18T10:00",
    arriveAt: "2026-12-18T10:45",
    durationMin: 45,
    booked: false,
    costMode: "total",
    itemTitle: "Transfer Da Nang → Hoi An",
    itemDate: "2026-12-18",
    itemTime: "10:00",
    itemDurationMin: 45,
    notes: "About 45 minutes by road. One van fits all seven with luggage: get a quote.",
  },
  {
    key: "dad-han",
    from: "da-nang",
    to: "hanoi",
    fromLabel: "Da Nang (DAD)",
    toLabel: "Hanoi (HAN)",
    mode: "flight",
    departAt: "2026-12-20T08:00",
    arriveAt: "2026-12-20T09:20",
    booked: true,
    itemTitle: "Fly Da Nang → Hanoi (08:00 to 09:20)",
    itemDate: "2026-12-20",
    itemTime: "08:00",
    itemDurationMin: 80,
    notes: "Booked. Leave the hotel by about 6:15. Store big bags at your Hanoi hotel and take a small bag to Sa Pa.",
  },
  {
    key: "han-sapa",
    from: "hanoi",
    to: "sa-pa",
    fromLabel: "Hanoi Old Quarter",
    toLabel: "Sa Pa",
    mode: "sleeper_bus",
    departAt: "2026-12-20T22:00",
    arriveAt: "2026-12-21T04:00",
    durationMin: 360,
    booked: false,
    overnight: true,
    costVnd: 380_000,
    itemTitle: "Night bus Hanoi → Sa Pa",
    itemDate: "2026-12-20",
    itemTime: "22:00",
    itemDurationMin: 120,
    notes: "Cabin sleeper bus, about 6 hours. Arrives around 4:00: confirm whether you can stay aboard until morning. Overnight train to Lao Cai is the alternative.",
  },
  {
    key: "sapa-han",
    from: "sa-pa",
    to: "hanoi",
    fromLabel: "Sa Pa",
    toLabel: "Hanoi Old Quarter",
    mode: "cabin_bus",
    departAt: "2026-12-22T14:30",
    arriveAt: "2026-12-22T20:30",
    durationMin: 360,
    booked: false,
    costVnd: 380_000,
    itemTitle: "Limousine bus Sa Pa → Hanoi",
    itemDate: "2026-12-22",
    itemTime: "14:30",
    itemDurationMin: 360,
    notes: "About 6 hours back to the Old Quarter.",
  },
  {
    key: "han-hyd",
    from: "hanoi",
    to: "",
    fromLabel: "Hanoi: Noi Bai International Airport (HAN)",
    toLabel: "Hyderabad (HYD)",
    mode: "flight",
    departAt: "2026-12-25T12:20",
    arriveAt: "2026-12-25T22:55",
    booked: true,
    international: true,
    itemTitle: "Fly Hanoi → Hyderabad (12:20)",
    itemDate: "2026-12-25",
    itemTime: "12:20",
    itemDurationMin: null,
    notes: "Booked. Departs 12:20 (Vietnam time), lands 22:55 (IST). Leave the Old Quarter by about 9:00: Noi Bai is 45 to 60 minutes away and Christmas traffic is heavy.",
  },
];

export const basePlanDays: BasePlanDay[] = [
  {
    date: "2026-12-12",
    destination: "phu-quoc",
    title: "Arrive Phu Quoc: sunset and night market",
    items: [
      { time: "17:30", durationMin: 60, activity: "phu-quoc-long-beach", title: "Long Beach at sunset", notes: "Check in first, then straight to the sand: sunset is around 17:40." },
      { time: "18:45", durationMin: 45, activity: "phu-quoc-dinh-cau-temple", title: "Dinh Cau Rock Temple" },
      { time: "19:45", durationMin: 105, activity: "phu-quoc-duong-dong-night-market", title: "Phu Quoc Night Market dinner", notes: "Grilled seafood and rolled ice cream." },
    ],
  },
  {
    date: "2026-12-13",
    destination: "phu-quoc",
    title: "VinWonders and Grand World",
    items: [
      { time: "09:30", durationMin: 420, activity: "phu-quoc-vinwonders", title: "VinWonders Phu Quoc", notes: "Water park slides, thrill rides and the aquarium. Alternative for the morning: Phu Quoc National Park." },
      { time: "17:00", durationMin: 300, activity: "phu-quoc-grand-world-shows", title: "Grand World: canals, gondola and the Colors of Venice show", notes: "Dinner at Grand World. The Colors of Venice show starts at 8:30 PM." },
    ],
  },
  {
    date: "2026-12-14",
    destination: "phu-quoc",
    title: "South islands, cable car and Sunset Town",
    items: [
      { time: "08:30", durationMin: 240, activity: "phu-quoc-four-island-speedboat-tour", title: "Island hopping and snorkelling (May Rut, Gam Ghi)", notes: "Speedboat tour. Many combo tours include the Aquatopia stop too." },
      { time: "12:30", durationMin: 120, activity: "phu-quoc-aquatopia-water-park", title: "Aquatopia Water Park" },
      { time: "14:45", durationMin: 30, activity: "phu-quoc-hon-thom-cable-car", title: "Hon Thom cable car back to An Thoi" },
      { time: "15:30", durationMin: 90, activity: "phu-quoc-sao-beach", title: "Sao Beach before dusk" },
      { time: "17:30", durationMin: 180, activity: "phu-quoc-kiss-bridge", title: "Sunset Town and Kiss Bridge" },
      { time: "20:45", durationMin: 45, activity: "phu-quoc-kiss-of-the-sea-show", title: "Kiss of the Sea show", notes: "Night show at Sunset Town, usually around 21:00: check when booking." },
    ],
  },
  {
    date: "2026-12-15",
    destination: "ho-chi-minh-city",
    title: "Fly to Saigon: District 1 landmarks",
    notes: "The flight lands at 11:45, later than the PDF assumed, so the museums move to the afternoon. Cho Lon and Thien Hau Pagoda no longer fit: add them from the picks if you want them. Landmark 81 is an alternative to the Skydeck.",
    items: [
      { time: "13:45", durationMin: 90, activity: "ho-chi-minh-city-independence-palace", title: "Independence Palace", notes: "Drop bags in District 1 first." },
      { time: "15:30", durationMin: 90, activity: "ho-chi-minh-city-war-remnants-museum", title: "War Remnants Museum" },
      { time: "17:15", durationMin: 60, activity: "ho-chi-minh-city-central-post-office", title: "Notre-Dame, Central Post Office and Cafe Apartments", notes: "Coconut coffee at 42 Nguyen Hue." },
      { time: "18:30", durationMin: 60, activity: "ho-chi-minh-city-saigon-waterbus", title: "Saigon Waterbus on the river", notes: "Check the last departure on the day." },
      { time: "19:45", durationMin: 45, activity: "ho-chi-minh-city-saigon-skydeck", title: "Saigon Skydeck at Bitexco", notes: "Or Landmark 81 instead: both is too much for one evening." },
      { time: "21:00", durationMin: 120, activity: "ho-chi-minh-city-bui-vien-walking-street", title: "Bui Vien Walking Street (optional)" },
    ],
  },
  {
    date: "2026-12-16",
    destination: "ho-chi-minh-city",
    title: "Cu Chi Tunnels and the Mekong, then fly to Da Nang",
    notes: "One combined day tour. The listed return to District 1 is about 18:30 and the flight is at 21:00: confirm the return time before booking.",
    items: [
      { time: "07:30", durationMin: 300, activity: "ho-chi-minh-city-cu-chi-tunnels", title: "Cu Chi Tunnels", notes: "Morning half of the combined Cu Chi and Mekong tour." },
      { time: "13:00", durationMin: 330, activity: "ben-tre-coconut-canal-boat-ride", title: "Mekong Delta: coconut canal sampan", notes: "Afternoon half of the combined tour." },
    ],
  },
  {
    date: "2026-12-17",
    destination: "da-nang",
    title: "Da Nang: Son Tra, Marble Mountains and My Khe",
    items: [
      { time: "09:00", durationMin: 90, activity: "da-nang-lady-buddha-viewpoint", title: "Lady Buddha at Linh Ung Pagoda" },
      { time: "11:00", durationMin: 120, activity: "da-nang-marble-mountains-visit", title: "Marble Mountains" },
      { time: "14:00", durationMin: 90, activity: "da-nang-han-market-browse", title: "Han Market" },
      { time: "16:30", durationMin: 180, activity: "da-nang-my-khe-beach-swim", title: "My Khe Beach: sunset swim and seafood dinner" },
    ],
  },
  {
    date: "2026-12-18",
    destination: "hoi-an",
    title: "Hoi An: coconut forest and the lantern-lit old town",
    items: [
      { time: "11:15", durationMin: 75, type: "free_time", title: "Check in and rooftop coffee" },
      { time: "14:30", durationMin: 90, activity: "hoi-an-cam-thanh-basket-boats", title: "Bay Mau coconut forest basket boats" },
      { time: "16:30", durationMin: 150, activity: "hoi-an-ancient-town-street-walk", title: "Hoi An Ancient Town walk" },
      { time: "19:00", durationMin: 30, activity: "hoi-an-lantern-boat-ride", title: "Lantern boat on the Thu Bon River" },
      { time: "19:45", durationMin: 90, type: "restaurant", title: "Dinner in the Ancient Town" },
    ],
  },
  {
    date: "2026-12-19",
    destination: "da-nang",
    title: "Ba Na Hills and the Dragon Bridge show",
    items: [
      { time: "08:00", durationMin: 480, activity: "da-nang-ba-na-hills-day", title: "Sun World Ba Na Hills", notes: "Golden Bridge, funicular, Alpine Coaster and French Village." },
      { time: "17:30", durationMin: 120, type: "restaurant", title: "Dinner along the Han River" },
      { time: "20:15", durationMin: 75, activity: "da-nang-dragon-bridge-fire-show", title: "Dragon Bridge fire and water show", notes: "Weekend show, commonly reported around 21:00 (not verified). Arrive early for a good spot." },
    ],
  },
  {
    date: "2026-12-20",
    destination: "hanoi",
    title: "Fly to Hanoi: Old Quarter, then the night bus to Sa Pa",
    notes: "The flight lands at 09:20, earlier than the PDF assumed, so there is time for Hoan Kiem Lake before lunch. It's Sunday, so the streets around the lake usually close to traffic in the evening.",
    items: [
      { time: "11:30", durationMin: 60, activity: "hanoi-hoan-kiem-lake-walk", title: "Hoan Kiem Lake and Ngoc Son Temple" },
      { time: "13:30", durationMin: 150, activity: "hanoi-old-quarter-walk", title: "Old Quarter walk" },
      { time: "16:00", durationMin: 60, activity: "hanoi-local-coffee-shops", title: "Egg coffee at Giang Cafe" },
      { time: "17:15", durationMin: 45, activity: "hanoi-train-street", title: "Train Street (only if access is allowed)" },
      { time: "19:00", durationMin: 120, activity: "hanoi-weekend-walking-street", title: "Hoan Kiem weekend walking street and night market" },
    ],
  },
  {
    date: "2026-12-21",
    destination: "sa-pa",
    title: "Sa Pa: Fansipan and Cat Cat Village",
    notes: "You arrive on the night bus around 4:00, so this is a long day: skip something if you're tired.",
    items: [
      { time: "08:00", durationMin: 270, activity: "sa-pa-fansipan-cable-car", title: "Fansipan cable car to the summit", notes: "Cable car and funicular to 3,143 m. Visibility and wind affect the view." },
      { time: "14:00", durationMin: 150, activity: "sa-pa-cat-cat-village", title: "Cat Cat Village and waterfalls", notes: "The alpine coaster ride from the PDF is a separate ticket: allow about ₹500 to ₹1,200 per rider until the price is confirmed." },
      { time: "17:00", durationMin: 90, activity: "sa-pa-lake-walk", title: "Sa Pa Lake, Stone Church and hotpot dinner" },
    ],
  },
  {
    date: "2026-12-22",
    destination: "sa-pa",
    title: "O Quy Ho Pass, then back to Hanoi",
    items: [
      { time: "08:30", durationMin: 150, activity: "sa-pa-o-quy-ho-pass", title: "Rong May Glass Bridge at O Quy Ho Pass", notes: "The glass skywalk and the Rainbow Slide are separate tickets." },
      { time: "11:30", durationMin: 90, activity: "sa-pa-moana-photo-park", title: "Moana Sa Pa" },
    ],
  },
  {
    date: "2026-12-23",
    destination: "ninh-binh",
    title: "Ninh Binh day trip: Trang An and Bai Dinh",
    notes: "Day tour with an Old Quarter pickup around 7:00. Mua Cave and Hoa Lu are alternatives: pick them if you'd rather do those.",
    items: [
      { time: "09:30", durationMin: 180, activity: "ninh-binh-trang-an-boat", title: "Trang An boat ride (Route 3)", notes: "Boat ticket about ₹1,070 per person, not including the tour." },
      { time: "13:30", durationMin: 150, activity: "ninh-binh-bai-dinh", title: "Bai Dinh Pagoda" },
      { time: "20:00", durationMin: 120, activity: "hanoi-street-food-exploration", title: "Old Quarter street-food dinner", notes: "Bun cha, pho and bia hoi back in Hanoi." },
    ],
  },
  {
    date: "2026-12-24",
    destination: "ha-long-bay",
    title: "Ha Long Bay cruise and Christmas Eve in Hanoi",
    items: [
      { time: "07:30", durationMin: 780, activity: "ha-long-bay-day-cruise", title: "Ha Long Bay day cruise", notes: "About 13 hours including the Hanoi transfers. Sung Sot Cave, Ti Top Island and kayaking at Luon Cave." },
      { time: "21:00", durationMin: 90, activity: "hanoi-st-josephs-cathedral", title: "Christmas Eve at St Joseph's Cathedral and Hoan Kiem Lake", notes: "Very crowded on Christmas Eve: keep valuables close." },
    ],
  },
  {
    date: "2026-12-25",
    destination: "hanoi",
    title: "Last egg coffee and fly home",
    items: [{ time: "07:15", durationMin: 75, type: "free_time", title: "Last egg coffee and souvenirs" }],
  },
];
