/**
 * Travellers the owner expects who haven't joined yet. They're "going" to everything by default, so each gets a
 * stand-in id in cost splits and participant lists: expected:<n> for positions after the members who have joined.
 * When someone joins, they take the first stand-in's place (see joinTrip), so lists stay right without a rebuild.
 */
export const STAND_IN_PREFIX = "expected:";

export function standInIds(memberCount: number, travellersCount: number) {
  const ids: string[] = [];
  for (let n = memberCount + 1; n <= travellersCount; n++) ids.push(`${STAND_IN_PREFIX}${n}`);
  return ids;
}

/** Everyone sharing the trip: the members, then a stand-in for each expected traveller who hasn't joined. */
export function partyIds(memberIds: string[], travellersCount: number) {
  return [...memberIds, ...standInIds(memberIds.length, travellersCount)];
}

export const isStandIn = (id: string) => id.startsWith(STAND_IN_PREFIX);
