/**
 * One-time data upgrades (scripts/data-upgrades.ts), by id, in order. A freshly seeded database already has every
 * change, so the seed records all of them as applied.
 */
import { BASE_PLAN_VERSION } from "../content/base-plan";

export const UPGRADES_KEY = "data_upgrades";
/** Travellers join with a name now, in any order, so trips no longer start with "Traveller N" seats. */
export const NO_PLACEHOLDER_SEATS = "no-placeholder-seats-2026-11";
export const ALL_UPGRADES = [BASE_PLAN_VERSION, NO_PLACEHOLDER_SEATS];
