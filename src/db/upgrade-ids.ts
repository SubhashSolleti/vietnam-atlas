/**
 * One-time data upgrades (scripts/data-upgrades.ts), by id, in order. A freshly seeded database already has every
 * change, so the seed records all of them as applied.
 */
import { BASE_PLAN_VERSION } from "../content/base-plan";

export const UPGRADES_KEY = "data_upgrades";
/** Travellers join with a name now, in any order, so trips no longer start with "Traveller N" seats. */
export const NO_PLACEHOLDER_SEATS = "no-placeholder-seats-2026-11";
/** Day 2 of the base plan names the Colors of Venice show and its 8:30 PM start, as the owner's PDF does. */
export const VENICE_SHOW_TIME = "venice-show-time-2026-11";
export const ALL_UPGRADES = [BASE_PLAN_VERSION, NO_PLACEHOLDER_SEATS, VENICE_SHOW_TIME];
