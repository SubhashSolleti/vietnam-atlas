/**
 * How many travellers one priced unit typically carries, for activities priced per vehicle or per boat.
 * These are planning assumptions (shown to users as such), used to estimate how many units a group needs:
 * units = ceil(party size / capacity). Per-group prices cover the whole party and are not listed here.
 */
export const UNIT_CAPACITY: Record<string, { capacity: number; note: string }> = {
  // Private cars / 7-seat SUVs with driver (driver not counted).
  "cao-bang-ban-gioc-scenic-road-trip": { capacity: 6, note: "a 7-seat car with driver" },
  "cao-bang-mountain-passes-road-trip": { capacity: 6, note: "a 7-seat car with driver" },
  "con-dao-island-tour-by-car": { capacity: 6, note: "a 7-seat car with driver" },
  "ha-giang-dong-van-karst-plateau-day-tour": { capacity: 6, note: "a 7-seat car with driver" },
  "ha-giang-loop-private-car-tour": { capacity: 6, note: "a 7-seat car with driver" },
  "ha-giang-photography-excursion": { capacity: 6, note: "a 7-seat car with driver" },
  "mai-chau-hang-kia-excursion": { capacity: 6, note: "a 7-seat car with driver" },
  "phong-nha-scenic-drive": { capacity: 6, note: "a 7-seat car with driver" },
  // Open jeeps on the Mui Ne dunes.
  "mui-ne-jeep-sunrise-tour": { capacity: 4, note: "a jeep seating about four" },
  "mui-ne-jeep-sunset-tour": { capacity: 4, note: "a jeep seating about four" },
  // Two-person craft.
  "da-nang-jet-ski": { capacity: 2, note: "a jet ski for up to two riders" },
  "nha-trang-jet-ski": { capacity: 2, note: "a jet ski for up to two riders" },
  "phu-quoc-jet-skiing": { capacity: 2, note: "a jet ski for up to two riders" },
  "mui-ne-atv-white-dunes": { capacity: 2, note: "an ATV for up to two riders" },
  "phu-quoc-kayaking": { capacity: 2, note: "a two-seat kayak" },
  // Cyclos carry one passenger (two small adults at most).
  "hanoi-cyclo-ride": { capacity: 1, note: "a cyclo carrying one passenger" },
  // Small boats.
  "hoi-an-lantern-boat-ride": { capacity: 4, note: "a small lantern boat for about four" },
  "cai-be-sampan-canal-ride": { capacity: 4, note: "a sampan for about four" },
  "chau-doc-floating-fish-farms": { capacity: 6, note: "a small boat for about six" },
  "hue-perfume-river-boat": { capacity: 10, note: "a dragon boat for about ten" },
  "can-tho-cai-rang-floating-market": { capacity: 8, note: "a market boat for about eight" },
  // Private charters for a group.
  "lan-ha-bay-private-boat-charter": { capacity: 15, note: "a private day boat for about fifteen" },
  "phu-quoc-private-speedboat-charter": { capacity: 12, note: "a speedboat for about twelve" },
};
