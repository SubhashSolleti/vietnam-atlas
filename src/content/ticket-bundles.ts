/**
 * Experiences that are really the same ticket or tour. Each is still worth listing on its own (people search for
 * "Golden Bridge", not "Ba Na Hills cable-car ticket"), but a trip budget must count the ticket once.
 */
export const TICKET_BUNDLES: Record<string, string[]> = {
  "ba-na-hills-ticket": ["da-nang-ba-na-hills-day", "da-nang-ba-na-cable-car", "da-nang-golden-bridge", "da-nang-fantasy-park"],
  "datanla-canyoning-tour": ["da-lat-datanla-canyoning", "da-lat-waterfall-rappelling", "da-lat-natural-water-slides", "da-lat-guided-cliff-jumping"],
  "dark-cave-combined-ticket": ["phong-nha-dark-cave", "phong-nha-ziplining", "phong-nha-mud-bath"],
  "hang-mua-entry": ["ninh-binh-hang-mua-viewpoint", "ninh-binh-hang-mua-climb"],
  "hue-imperial-city-ticket": ["hue-imperial-citadel", "hue-forbidden-purple-city"],
  "hoi-an-ancient-town-ticket": ["hoi-an-ancient-town-heritage-ticket", "hoi-an-japanese-covered-bridge", "hoi-an-assembly-halls", "hoi-an-old-houses"],
  "lao-chai-ta-van-ticket": ["sa-pa-lao-chai-village", "sa-pa-ta-van-village"],
  "hon-thom-combo-ticket": ["phu-quoc-hon-thom-cable-car", "phu-quoc-aquatopia-water-park"],
  // The same Hue ↔ Da Nang crossing, offered from either city.
  "hai-van-pass-crossing": ["da-nang-hai-van-pass-tour", "hue-hai-van-pass"],
};

export const BUNDLE_OF: Record<string, string> = Object.fromEntries(Object.entries(TICKET_BUNDLES).flatMap(([b, slugs]) => slugs.map((s) => [s, b])));
