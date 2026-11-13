import type { RegionSlug } from "./types";

export interface RegionSeed {
  slug: RegionSlug;
  name: string;
  tagline: string;
  summary: string;
  description: string;
  climate: string;
  highlights: string[];
  imageQuery: string;
}

export const regions: RegionSeed[] = [
  {
    slug: "north",
    name: "Northern Vietnam",
    tagline: "Karst seascapes, rice-terrace mountains and a thousand-year-old capital",
    summary:
      "Hanoi's lakes and lanes, the limestone bays of Ha Long and Lan Ha, Ninh Binh's river valleys and the high mountain country of Sa Pa, Ha Giang and Cao Bang.",
    description:
      "The north is Vietnam at its most dramatic and most layered. Hanoi anchors the region with French-era boulevards, temple courtyards and some of the country's best street food. A few hours east, thousands of limestone islands rise out of Ha Long Bay and the quieter Lan Ha Bay beside Cat Ba Island. South of the capital, Ninh Binh threads rowing boats through caves and rice fields, while the far north climbs into the borderland mountains of Sa Pa, Ha Giang and Cao Bang, home to many of Vietnam's ethnic minority communities, mountain passes and waterfalls.",
    climate:
      "Four distinct seasons. December–February is cool to cold: Hanoi is typically mild-to-cool and often grey, while mountain areas such as Sa Pa and Ha Giang can approach freezing at night. Bays are frequently misty in winter. Summer (May–September) is hot, humid and wet.",
    highlights: ["Hanoi Old Quarter", "Ha Long & Lan Ha Bays", "Trang An, Ninh Binh", "Sa Pa rice terraces", "Ha Giang Loop", "Ban Gioc Waterfall"],
    imageQuery: "Ha Long Bay karst",
  },
  {
    slug: "central",
    name: "Central Vietnam",
    tagline: "Imperial heritage, lantern-lit towns, caves and the highlands",
    summary:
      "Hue's imperial citadel, Hoi An's ancient town, Da Nang's beaches and mountain passes, the cave systems of Phong Nha and the cool pine highlands of Da Lat.",
    description:
      "Central Vietnam packs the country's richest concentration of heritage into a narrow strip between the mountains and the sea. Hue was the seat of the Nguyen emperors; Hoi An's merchant quarter survives as a UNESCO-listed townscape; and Da Nang has grown into a modern beach city linked to both by road and rail, including the celebrated Hai Van Pass. Inland, Phong Nha-Ke Bang National Park protects some of the world's most spectacular caves, while Da Lat, on the southern central highlands plateau, trades tropical heat for pine forests, lakes, waterfalls and adventure sports.",
    climate:
      "The central coast (Hue, Hoi An, Da Nang, Phong Nha) has its main rainy and flood season from roughly September to December; storms can disrupt sea, river and cave activities. Da Lat sits at around 1,500 m and stays cool year-round, with a drier season from roughly December to April.",
    highlights: ["Hoi An Ancient Town", "Hue Imperial City", "Phong Nha caves", "Hai Van Pass", "Da Lat canyoning", "Nha Trang islands"],
    imageQuery: "Hoi An ancient town lanterns",
  },
  {
    slug: "south",
    name: "Southern Vietnam",
    tagline: "Island beaches, the Mekong's waterways and a city that never slows down",
    summary:
      "The beaches and coral of Phu Quoc and Con Dao, the energy of Ho Chi Minh City, the rivers and orchards of the Mekong Delta, and the dunes of Mui Ne.",
    description:
      "The south is warm year-round and at its most comfortable in the dry season from roughly December to April. Ho Chi Minh City is the country's commercial engine, fast, modern and full of food, history and nightlife. To the south-west, the Mekong Delta is a lattice of rivers, canals, floating markets and fruit orchards. Offshore, Phu Quoc offers white-sand beaches, island-hopping and snorkelling, while remote Con Dao combines a sobering history with protected marine and forest landscapes. Along the coast, Mui Ne's red and white sand dunes and steady winter winds draw kitesurfers.",
    climate:
      "Tropical with two seasons: dry (roughly December–April) and wet (roughly May–November). December is generally one of the best months for Phu Quoc, Ho Chi Minh City and the Mekong Delta.",
    highlights: ["Phu Quoc islands", "Ho Chi Minh City nightlife", "Cai Rang Floating Market", "Mui Ne dunes", "Con Dao National Park", "Cu Chi Tunnels"],
    imageQuery: "Phu Quoc beach",
  },
];
