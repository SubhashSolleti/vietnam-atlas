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
/** Itinerary items record where they came from (source), and the base-plan PDF keeps what it says for each day. */
export const ITEM_SOURCE_AND_DAY_TEXTS = "item-source-and-day-texts-2026-11";
/** Itinerary PDFs line up with trip days by date, and trips with an empty itinerary are filled from theirs. */
export const PDF_BASE_PLAN = "pdf-base-plan-2026-11";
export const ALL_UPGRADES = [BASE_PLAN_VERSION, NO_PLACEHOLDER_SEATS, VENICE_SHOW_TIME, ITEM_SOURCE_AND_DAY_TEXTS, PDF_BASE_PLAN];
