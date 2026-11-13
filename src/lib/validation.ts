import { z } from "zod";
import { addDays } from "./utils";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** True when a YYYY-MM-DD string names a real calendar day (zod still runs refinements after a regex failure). */
const realDate = (d: string) => DATE.test(d) && addDays(d, 0) === d;

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31, 2026-12-99 …). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine(realDate, "That date doesn't exist");

/** A real local date-time in YYYY-MM-DDTHH:MM form. */
export const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Use a date and time")
  .refine((d) => realDate(d.slice(0, 10)), "That date doesn't exist");

/** Whole days between two YYYY-MM-DD dates (end − start). */
export function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

export const MAX_TRIP_DAYS = 60;
export const MAX_TRAVELLERS = 30;

/** Participant lists: unique ids only. */
export const participantList = z
  .array(z.string().uuid())
  .max(MAX_TRAVELLERS)
  .transform((list) => [...new Set(list)]);
