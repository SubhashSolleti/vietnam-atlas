/**
 * Chooses a photo for every activity card. Activities with their own photo use it; the rest borrow a
 * representative photo of the area, first from their own attraction, then the destination gallery,
 * then (for experiences not tied to a venue) the destination's landmarks. Always preferring a photo
 * not yet shown. A photo is never borrowed twice; cards beyond the accurate pool get no image.
 */
export interface PoolImage {
  id: string;
}

export interface PoolActivity {
  id: string;
  destinationId: string;
  attractionId: string | null;
}

export function assignActivityImages<T extends PoolImage>(
  activities: PoolActivity[],
  own: Map<string, T[]>,
  attractionImages: Map<string, T[]>,
  destinationImages: Map<string, T[]>,
  /** attractionId → destinationId, used to borrow from the destination's other attractions. */
  attractionDestination: Map<string, string> = new Map(),
): Map<string, { image: T; borrowed: boolean }> {
  const uses = new Map<string, number>();
  const use = (img: T) => uses.set(img.id, (uses.get(img.id) ?? 0) + 1);
  // Destination heroes already appear on destination cards; own photos are always shown.
  for (const list of destinationImages.values()) if (list[0]) use(list[0]);
  for (const a of activities) {
    const first = own.get(a.id)?.[0];
    if (first) use(first);
  }
  const out = new Map<string, { image: T; borrowed: boolean }>();
  for (const a of activities) {
    const first = own.get(a.id)?.[0];
    if (first) {
      out.set(a.id, { image: first, borrowed: false });
      continue;
    }
    const ownAttraction = a.attractionId ? (attractionImages.get(a.attractionId) ?? []) : [];
    const gallery = destinationImages.get(a.destinationId) ?? [];
    // Only experiences not tied to one venue (a street-food crawl, a city walk) may borrow another
    // landmark of the destination; a venue-specific experience never shows a different venue.
    const siblings = a.attractionId
      ? []
      : [...attractionDestination].filter(([, destId]) => destId === a.destinationId).flatMap(([attrId]) => attractionImages.get(attrId) ?? []);
    const unused = (pool: T[]) => pool.filter((i) => !uses.get(i.id));
    const tiers = [unused(ownAttraction), unused(gallery), unused(siblings)];
    // Never repeat a photo: once the accurate pool is used up the card shows a designed placeholder.
    const pick = tiers.find((t) => t.length)?.[0];
    if (pick) {
      use(pick);
      out.set(a.id, { image: pick, borrowed: true });
    }
  }
  return out;
}
